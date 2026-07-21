import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  getAdminStatus,
  getHealth,
  getRegionalSummary,
  getSites,
  ingestWeather,
  runPredictions,
  trainModel,
} from '../api/client';

const formatTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const formatElapsed = (seconds) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

const useElapsed = (running) => {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(null);
  useEffect(() => {
    if (running) {
      startedAt.current = Date.now();
      setElapsed(0);
      const id = setInterval(() => {
        if (startedAt.current) {
          setElapsed((Date.now() - startedAt.current) / 1000);
        }
      }, 100);
      return () => clearInterval(id);
    }
    startedAt.current = null;
    return undefined;
  }, [running]);
  return elapsed;
};

const ActionCard = ({
  step,
  label,
  description,
  onClick,
  isLoading,
  error,
  success,
  hint,
}) => {
  const elapsed = useElapsed(isLoading);
  return (
    <div
      className={`p-4 bg-white border rounded-lg shadow-sm transition-colors ${
        isLoading ? 'border-blue-400 ring-2 ring-blue-100' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
              {step}
            </span>
            <div className="font-semibold">{label}</div>
          </div>
          <div className="text-sm text-gray-500 mt-1 ml-9">{description}</div>
          {hint && !isLoading && !error && !success && (
            <div className="text-xs text-gray-400 mt-2 ml-9">{hint}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-80 disabled:cursor-wait"
        >
          {isLoading && <Spinner />}
          {isLoading ? `Running… ${formatElapsed(elapsed)}` : 'Run'}
        </button>
      </div>
      {isLoading && (
        <div className="mt-3 ml-9 text-sm text-blue-700">
          Talking to backend… this can take 10–60 seconds.
        </div>
      )}
      {error && (
        <div className="mt-3 ml-9 text-sm text-red-700 bg-red-50 p-2 rounded">
          <strong>Error:</strong>{' '}
          {String(error?.response?.data?.detail || error?.message || error)}
        </div>
      )}
      {success && !error && (
        <div className="mt-3 ml-9 text-sm text-green-800 bg-green-50 p-2 rounded">
          {success}
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const queryClient = useQueryClient();
  const [lastRun, setLastRun] = useState({});

  // Health (re-polls every 5s)
  const {
    data: healthData,
    isError: healthError,
    error: healthErrorObj,
    refetch: refetchHealth,
    isFetching: healthFetching,
  } = useQuery('health', getHealth, {
    refetchInterval: 5000,
    retry: false,
  });
  const backendUp = !healthError && !!healthData;

  // Admin status snapshot (re-fetches after each action)
  const { data: statusData, refetch: refetchStatus } = useQuery(
    'adminStatus',
    getAdminStatus,
    { refetchInterval: 10000, retry: false }
  );

  // Regional summary
  const { data: summaryData, refetch: refetchSummary } = useQuery(
    'regionalSummary',
    getRegionalSummary
  );
  const { data: sitesData } = useQuery('sites', getSites);

  const sites = sitesData?.data || [];
  const summary = summaryData?.data || { sites: [] };
  const predictions = summary.sites || [];
  const status = statusData?.data;

  const handleSuccess = (key, message) => {
    setLastRun({ key, message, at: Date.now() });
    refetchStatus();
    refetchSummary();
    queryClient.invalidateQueries('regionalSummary');
    queryClient.invalidateQueries('adminStatus');
  };

  const trainMut = useMutation(trainModel, {
    onSuccess: (res) => {
      const d = res?.data || {};
      handleSuccess(
        'train',
        `Model trained on ${d.training_rows?.toLocaleString()} rows in ${d.elapsed_seconds}s.`
      );
    },
  });

  const ingestMut = useMutation(ingestWeather, {
    onSuccess: (res) => {
      const d = res?.data || {};
      handleSuccess(
        'ingest',
        `Ingested ${d.total_rows} weather rows across ${d.sites_ingested} sites.`
      );
    },
  });

  const predictMut = useMutation(() => runPredictions(null), {
    onSuccess: (res) => {
      const d = res?.data || {};
      handleSuccess(
        'predict',
        `Wrote ${d.predictions_written} prediction rows.`
      );
    },
  });

  const anyRunning = trainMut.isLoading || ingestMut.isLoading || predictMut.isLoading;

  const goCount = predictions.filter((p) => p.risk_class === 'Go').length;
  const cautionCount = predictions.filter((p) => p.risk_class === 'Caution').length;
  const noGoCount = predictions.filter((p) => p.risk_class === 'No-Go').length;
  const hasPredictions = predictions.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Admin Operations</h1>
        <button
          type="button"
          onClick={() => refetchHealth()}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${
            backendUp
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          } hover:opacity-80`}
          data-testid="backend-status"
          title="Click to re-check connection"
        >
          {healthFetching ? (
            <Spinner />
          ) : (
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                backendUp ? 'bg-green-500' : 'bg-red-500'
              } ${anyRunning ? 'animate-pulse' : ''}`}
            />
          )}
          <span className="font-medium">
            {backendUp ? 'Backend connected' : 'Backend unreachable'}
          </span>
          {healthData?.data?.version && (
            <span className="text-xs opacity-70">v{healthData.data.version}</span>
          )}
        </button>
      </div>
      <p className="text-gray-600 mb-6">
        Trigger model training, weather ingest, and prediction scoring. Results
        appear on the <a href="/" className="text-blue-600 underline">Home</a>{' '}
        page after predictions exist.
      </p>

      {!backendUp && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm">
          <div className="font-semibold text-red-800 mb-2">
            Cannot reach the backend API.
          </div>
          {healthErrorObj && (
            <div className="text-red-700 mb-3 font-mono text-xs break-all">
              {healthErrorObj?.message || String(healthErrorObj)}
              {healthErrorObj?.response?.status
                ? ` (HTTP ${healthErrorObj.response.status})`
                : ''}
            </div>
          )}
          <div className="text-gray-800 mb-2">Things to check:</div>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>
              The FastAPI process is running on port{' '}
              <code className="bg-gray-100 px-1 rounded">8000</code> in the same
              machine as Vite.
            </li>
            <li>
              Start it with:{' '}
              <code className="bg-gray-100 px-1 rounded">
                cd backend &amp;&amp; uvicorn app.main:app --host 0.0.0.0 --port 8000
              </code>
            </li>
            <li>
              Sanity check from a new terminal:{' '}
              <code className="bg-gray-100 px-1 rounded">
                curl http://localhost:8000/health
              </code>{' '}
              should return{' '}
              <code className="bg-gray-100 px-1 rounded">
                {'{"status":"healthy",...}'}
              </code>
              .
            </li>
            <li>
              In <strong>Google Cloud Shell</strong>: also expose port{' '}
              <code className="bg-gray-100 px-1 rounded">8000</code> via the Web
              Preview pane so the browser can reach it through the proxy (Vite's
              dev proxy on <code className="bg-gray-100 px-1 rounded">5173</code>{' '}
              forwards <code className="bg-gray-100 px-1 rounded">/api</code> to
              the backend's <code className="bg-gray-100 px-1 rounded">localhost:8000</code>{' '}
              inside the shell, which only works if the backend is bound to{' '}
              <code className="bg-gray-100 px-1 rounded">0.0.0.0</code>).
            </li>
            <li>
              If you're hitting the API directly (not through Vite), set{' '}
              <code className="bg-gray-100 px-1 rounded">CORS_ALLOW_ORIGINS</code>{' '}
              to your full frontend origin.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => refetchHealth()}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry connection
          </button>
        </div>
      )}

      {/* Live status snapshot */}
      {status && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 bg-white border rounded text-center">
            <div className="text-xs text-gray-500">Model</div>
            <div className={`text-sm font-semibold ${status.model_exists ? 'text-green-700' : 'text-red-700'}`}>
              {status.model_exists ? 'Trained' : 'Not trained'}
            </div>
          </div>
          <div className="p-3 bg-white border rounded text-center">
            <div className="text-xs text-gray-500">Weather rows</div>
            <div className="text-sm font-semibold">{status.weather_rows.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-white border rounded text-center">
            <div className="text-xs text-gray-500">Predictions</div>
            <div className="text-sm font-semibold">{status.prediction_rows.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-white border rounded text-center">
            <div className="text-xs text-gray-500">Active sites</div>
            <div className="text-sm font-semibold">{status.active_sites}</div>
          </div>
        </div>
      )}

      {/* Last action banner */}
      {lastRun.message && !anyRunning && (
        <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800">
          <strong>Last action ({lastRun.key}):</strong> {lastRun.message}
        </div>
      )}

      {/* Action cards */}
      <div className="grid gap-4 mb-8">
        <ActionCard
          step={1}
          label="Train Model"
          description="Generate synthetic data and train the RandomForest model."
          hint="Takes ~30s. Writes app/ml/model.pkl."
          onClick={() => trainMut.mutate()}
          isLoading={trainMut.isLoading}
          error={trainMut.error}
          success={
            trainMut.data?.data
              ? `Done in ${trainMut.data.data.elapsed_seconds}s · ${trainMut.data.data.training_rows.toLocaleString()} rows · model.pkl ${trainMut.data.data.model_exists ? 'saved' : 'MISSING'}`
              : null
          }
        />
        <ActionCard
          step={2}
          label="Ingest Weather"
          description="Fetch latest 72h forecasts from Open-Meteo for every active site."
          hint="Takes ~10–30s. Writes weather_forecasts rows."
          onClick={() => ingestMut.mutate()}
          isLoading={ingestMut.isLoading}
          error={ingestMut.error}
          success={
            ingestMut.data?.data
              ? `Done · ${ingestMut.data.data.total_rows} rows across ${ingestMut.data.data.sites_ingested} sites`
              : null
          }
        />
        <ActionCard
          step={3}
          label="Run Predictions"
          description="Score the latest weather window and persist Prediction rows."
          hint="Fast (<1s) once weather data exists."
          onClick={() => predictMut.mutate()}
          isLoading={predictMut.isLoading}
          error={predictMut.error}
          success={
            predictMut.data?.data
              ? `Done · ${predictMut.data.data.predictions_written} prediction rows written`
              : null
          }
        />
      </div>

      {/* Latest results */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Latest Results</h2>
        {hasPredictions ? (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-gray-200 text-center">
              <div className="bg-green-50 p-4">
                <div className="text-2xl font-bold text-go-green">{goCount}</div>
                <div className="text-sm text-gray-600">Go</div>
              </div>
              <div className="bg-yellow-50 p-4">
                <div className="text-2xl font-bold text-caution-yellow">{cautionCount}</div>
                <div className="text-sm text-gray-600">Caution</div>
              </div>
              <div className="bg-red-50 p-4">
                <div className="text-2xl font-bold text-no-go-red">{noGoCount}</div>
                <div className="text-sm text-gray-600">No-Go</div>
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Site</th>
                  <th className="px-4 py-2 text-left">Risk</th>
                  <th className="px-4 py-2 text-right">No-Go Prob.</th>
                  <th className="px-4 py-2 text-left">Forecast Time</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.site_id} className="border-t">
                    <td className="px-4 py-2 font-medium">{p.site_name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold text-white ${
                          p.risk_class === 'Go'
                            ? 'bg-go-green'
                            : p.risk_class === 'Caution'
                            ? 'bg-caution-yellow'
                            : 'bg-no-go-red'
                        }`}
                      >
                        {p.risk_class}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {(p.no_go_probability * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2">{formatTime(p.forecast_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs text-gray-500 border-t">
              Generated at {formatTime(summary.generated_at)} · {sites.length} active sites
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-800">
            No predictions yet. Run <strong>Train Model</strong> →{' '}
            <strong>Ingest Weather</strong> → <strong>Run Predictions</strong> above.
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;