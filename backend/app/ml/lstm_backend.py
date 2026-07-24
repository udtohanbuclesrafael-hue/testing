"""Minimal LSTM classifier implemented with NumPy/SciPy.

This module exists so we can keep the rest of the backend on the pinned
NumPy 2.x stack without taking a ~350 MB TensorFlow dependency. The
network is intentionally small (one LSTM layer + sigmoid head) because:

* training is supervised on hourly rows (~21k synthetic samples)
* inference has to remain cheap on the FastAPI request thread
* the explainability story in the report benefits from few parameters
"""
from __future__ import annotations

import pickle
from dataclasses import dataclass
from typing import Sequence

import numpy as np


FEATURE_COLUMNS: list[str] = [
    "wind_speed",
    "wave_height",
    "swell_height",
    "swell_period",
    "rainfall",
    "exposure_encoded",
    "wind_wave_interaction",
    "hour",
    "day_of_year",
    "wind_3h_avg",
    "wave_3h_avg",
]

# Context length for the LSTM sliding window. 24 hours covers a typical
# storm passage and lines up with the 3h rolling means already produced
# by the prediction service.
DEFAULT_SEQUENCE_LENGTH = 24


def _sigmoid(x: np.ndarray) -> np.ndarray:
    # Numerically stable sigmoid so very negative logits don't underflow.
    out = np.empty_like(x, dtype=np.float64)
    pos = x >= 0
    neg = ~pos
    out[pos] = 1.0 / (1.0 + np.exp(-x[pos]))
    ex = np.exp(x[neg])
    out[neg] = ex / (1.0 + ex)
    return out


def _dsigmoid(sig: np.ndarray) -> np.ndarray:
    return sig * (1.0 - sig)


def _dtanh(t: np.ndarray) -> np.ndarray:
    return 1.0 - t * t


@dataclass
class LSTMConfig:
    sequence_length: int = DEFAULT_SEQUENCE_LENGTH
    hidden_size: int = 16
    learning_rate: float = 5e-3
    epochs: int = 8
    batch_size: int = 32
    l2: float = 1e-4
    random_state: int = 42


class LstmNoGoModel:
    """Single-layer LSTM followed by a sigmoid output head."""

    def __init__(self, config: LSTMConfig | None = None) -> None:
        self.config = config or LSTMConfig()
        self.feature_columns: list[str] = list(FEATURE_COLUMNS)
        self.scaler_mean_: np.ndarray | None = None
        self.scaler_scale_: np.ndarray | None = None
        # Parameters are set lazily by ``fit`` so ``pickle`` round-trips stay clean.
        self.params: dict[str, np.ndarray] | None = None
        self.history_: list[dict[str, float]] = []

    def _standardize(self, X: np.ndarray) -> np.ndarray:
        return (X - self.scaler_mean_) / self.scaler_scale_

    def _init_params(self, n_features: int, rng: np.random.Generator) -> None:
        h = self.config.hidden_size
        scale = 1.0 / np.sqrt(h + n_features)
        # Combined input/forget/candidate/output gates stacked as one matrix.
        self.params = {
            "Wf": rng.uniform(-scale, scale, size=(n_features + h, 4 * h)),
            "bf": np.zeros(4 * h, dtype=np.float64),
            "Wo": rng.uniform(-scale, scale, size=(h, 1)),
            "bo": np.zeros(1, dtype=np.float64),
        }

    def _forward(self, seq: np.ndarray):
        Wf = self.params["Wf"]
        bf = self.params["bf"]
        Wo = self.params["Wo"]
        bo = self.params["bo"]

        T = seq.shape[0]
        h = self.config.hidden_size
        h_t = np.zeros(h, dtype=np.float64)
        c_t = np.zeros(h, dtype=np.float64)

        cache: list[tuple] = []
        for t in range(T):
            x = seq[t]
            z = np.concatenate([x, h_t])
            gates = z @ Wf + bf
            i = _sigmoid(gates[0 * h : 1 * h])
            f = _sigmoid(gates[1 * h : 2 * h])
            g = np.tanh(gates[2 * h : 3 * h])
            o = _sigmoid(gates[3 * h : 4 * h])
            c_prev = c_t
            c_t = f * c_prev + i * g
            h_t = o * np.tanh(c_t)
            cache.append((z, i, f, g, o, c_prev, h_t, c_t))

        logits = h_t @ Wo + bo
        prob = float(_sigmoid(logits)[0])
        return prob, cache

    def _backward(self, seq: np.ndarray, cache, prob: float, target: float) -> dict[str, np.ndarray]:
        Wf = self.params["Wf"]
        Wo = self.params["Wo"]
        h = self.config.hidden_size
        n_features = seq.shape[1]

        grad_logits = prob - target
        h_T = cache[-1][6]
        grad_Wo = np.outer(h_T, grad_logits)
        grad_bo = np.array([grad_logits], dtype=np.float64)

        grad_h = (Wo[:, 0] * grad_logits).astype(np.float64)
        grad_Wf = np.zeros_like(Wf)
        grad_bf = np.zeros_like(self.params["bf"])

        grad_c = np.zeros(h, dtype=np.float64)
        for t in reversed(range(len(cache))):
            z, i, f, g, o, c_prev, h_t, c_t = cache[t]
            tanh_c = np.tanh(c_t)
            grad_c = grad_c + grad_h * o * _dtanh(tanh_c)

            grad_o = grad_h * np.tanh(c_t) * _dsigmoid(o)
            grad_g = grad_c * i * _dtanh(g)
            grad_i = grad_c * g * _dsigmoid(i)
            grad_f = grad_c * c_prev * _dsigmoid(f)

            grad_gates = np.concatenate([grad_i, grad_f, grad_g, grad_o])
            prev_h = cache[t - 1][6] if t > 0 else np.zeros(h, dtype=np.float64)
            x_concat = np.concatenate([seq[t], prev_h])
            grad_Wf += np.outer(x_concat, grad_gates)
            grad_bf += grad_gates

            grad_input = Wf @ grad_gates
            grad_h = grad_input[n_features:].astype(np.float64)

        return {"Wf": grad_Wf, "bf": grad_bf, "Wo": grad_Wo, "bo": grad_bo}

    def fit(self, X_seq: np.ndarray, y: np.ndarray, *, epochs: int | None = None,
            batch_size: int | None = None, sample_weight: np.ndarray | None = None,
            verbose: bool = False) -> list[dict[str, float]]:
        if X_seq.ndim != 3:
            raise ValueError("X_seq must be (samples, timesteps, features)")
        if X_seq.shape[0] != y.shape[0]:
            raise ValueError("X_seq and y must agree on the sample axis")

        n_samples, _, n_features = X_seq.shape
        rng = np.random.default_rng(self.config.random_state)
        self._init_params(n_features, rng)

        flat = X_seq.reshape(-1, n_features)
        self.scaler_mean_ = flat.mean(axis=0)
        std = flat.std(axis=0)
        std[std < 1e-8] = 1.0
        self.scaler_scale_ = std
        X_scaled = self._standardize(X_seq).astype(np.float64)

        epochs = epochs or self.config.epochs
        batch_size = batch_size or self.config.batch_size
        history: list[dict[str, float]] = []

        for epoch in range(epochs):
            order = rng.permutation(n_samples)
            epoch_loss = 0.0
            batches = 0
            for start in range(0, n_samples, batch_size):
                idx = order[start : start + batch_size]
                batch_x = X_scaled[idx]
                batch_y = y[idx]
                if sample_weight is not None:
                    batch_w = sample_weight[idx]
                else:
                    batch_w = np.ones(len(idx), dtype=np.float64)

                grad_acc = {k: np.zeros_like(v) for k, v in self.params.items()}
                loss = 0.0
                for x_seq, target, weight in zip(batch_x, batch_y, batch_w):
                    prob, cache = self._forward(x_seq)
                    eps = 1e-12
                    sample_loss = -(
                        float(target) * np.log(prob + eps)
                        + (1.0 - float(target)) * np.log(1.0 - prob + eps)
                    )
                    loss += float(weight) * sample_loss
                    grads = self._backward(x_seq, cache, prob, float(target))
                    for k, v in grads.items():
                        grad_acc[k] += v * float(weight)

                clip = 1.0
                for k, v in grad_acc.items():
                    np.clip(v, -clip, clip, out=v)
                    self.params[k] -= self.config.learning_rate * (v / max(1, len(idx)) + self.config.l2 * self.params[k])

                epoch_loss += loss / max(1e-9, float(batch_w.sum()))
                batches += 1

            avg_loss = epoch_loss / max(1, batches)
            history.append({"epoch": epoch + 1, "loss": float(avg_loss)})
            if verbose:
                print(f"LSTM epoch {epoch + 1}/{epochs} - loss={avg_loss:.4f}")
        self.history_ = history
        return history

    def predict_proba(self, X_seq: np.ndarray) -> np.ndarray:
        if self.params is None or self.scaler_mean_ is None:
            raise RuntimeError("LstmNoGoModel must be fitted before predict_proba")
        X_scaled = self._standardize(X_seq.astype(np.float64))
        probs = np.empty(X_scaled.shape[0], dtype=np.float64)
        for i, seq in enumerate(X_scaled):
            prob, _ = self._forward(seq)
            probs[i] = prob
        return probs

    def predict_proba_single(self, seq: np.ndarray) -> float:
        return float(self.predict_proba(seq[None, ...])[0])

    def to_bundle(self) -> dict:
        return {
            "config": self.config.__dict__,
            "feature_columns": self.feature_columns,
            "scaler_mean_": self.scaler_mean_,
            "scaler_scale_": self.scaler_scale_,
            "params": self.params,
            "history": self.history_,
        }

    @classmethod
    def from_bundle(cls, bundle: dict) -> "LstmNoGoModel":
        cfg = LSTMConfig(**bundle["config"])
        model = cls(cfg)
        model.feature_columns = list(bundle["feature_columns"])
        model.scaler_mean_ = np.asarray(bundle["scaler_mean_"], dtype=np.float64)
        model.scaler_scale_ = np.asarray(bundle["scaler_scale_"], dtype=np.float64)
        model.params = {k: np.asarray(v, dtype=np.float64) for k, v in bundle["params"].items()}
        model.history_ = list(bundle.get("history", []))
        return model


def build_sequences(df: "pd.DataFrame", *, sequence_length: int = DEFAULT_SEQUENCE_LENGTH,
                    feature_columns: Sequence[str] = FEATURE_COLUMNS):
    """Return (X_seq, y, group_keys) where ``X_seq`` is (n, T, F).

    Sequences are emitted per site in chronological order. The label
    associated with each window is the no-go label of the final timestep.
    """
    import pandas as pd  # local import keeps this module light

    if "site_name" not in df.columns:
        raise ValueError("DataFrame must contain a 'site_name' column")
    feature_columns = list(feature_columns)

    Xs: list[np.ndarray] = []
    ys: list[int] = []
    keys: list[tuple[str, object]] = []

    df = df.sort_values(["site_name", "timestamp"]).reset_index(drop=True)
    for site_name, group in df.groupby("site_name", sort=False):
        if len(group) < sequence_length:
            continue
        values = group[feature_columns].to_numpy(dtype=np.float64)
        labels = group["no_go_label"].to_numpy(dtype=np.float64)
        timestamps = group["timestamp"].tolist()
        for start in range(0, len(group) - sequence_length + 1):
            end = start + sequence_length
            Xs.append(values[start:end])
            ys.append(int(labels[end - 1]))
            keys.append((site_name, timestamps[end - 1]))
    return np.stack(Xs), np.asarray(ys, dtype=np.float64), keys


def save_bundle(model: LstmNoGoModel, path: str) -> None:
    with open(path, "wb") as f:
        pickle.dump(model.to_bundle(), f)


def load_bundle(path: str) -> LstmNoGoModel:
    with open(path, "rb") as f:
        bundle = pickle.load(f)
    return LstmNoGoModel.from_bundle(bundle)
