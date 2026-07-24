import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  getAdminStatus,
  getHealth,
  getAlerts,
  runAlerts,
  getRegionalSummary,
  getSites,
  ingestWeather,
  runPredictions,
  trainModel,
} from '../api/client';
import {
  IconBrain,
  IconCloud,
  IconChart,
  IconShield,
  IconCheck,
  IconAlert,
  IconRefresh,
  riskColorClasses,
} from '../components/Icons';

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
  <IconRefresh className="animate-spin h-4 w-4 text-white" />
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
  Icon,
}) => {
  const elapsed = useElapsed(isLoading);
  return (
    <div
      className={`card transition-all ${
        isLoading ? 'ring-2 ring-navy-300 border-navy-200' : ''
      }`}
    >
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isLoading ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold">
                  {step}
                </span>
                <div className="font-semibold text-slate-900">{label}</div>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-500 mt-3">{description}</div>
          {hint && !isLoading && !error && !success && (
            <div className="text-xs text-slate-400 mt-2">{hint}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={isLoading}
          className="btn-primary shrink-0"
        >
          {isLoading && <Spinner />}
          {isLoading ? `Running… ${formatElapsed(elapsed)}` : 'Run'}
        </button>
      </div>
      {isLoading && (
        <div className="px-5 pb-4 -mt-1 text-sm text-navy-700">
          Talking to backend… this can take 10–60 seconds.
        </div>
      )}
      {error && (
        <div className="mx-5 mb-5 mt-3 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
          <strong>Error:</strong>{' '}
          {String(error?.response?.data?.detail || error?.message || error)}
        </div>
      )}
      {success && !error && (
        <div className="mx-5 mb-5 mt-3 text-sm text-green-800 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
          <IconCheck className="w-4 h-4" />
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
    <div className="container-page py-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Trigger model training, weather ingest, and prediction scoring.
            Results appear on the{' '}
            <a href="/" className="text-navy-700 underline">
              Home
            </a>{' '}
            page once predictions exist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchHealth()}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
            backendUp
              ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
              : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
          }`}
          data-testid="backend-status"
          title="Click to re-check connection"
        >
          {healthFetching ? (
            <Spinner />
          ) : (
            <span
              className={`inline-block w-2 h-2 rounded-full ${
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
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Model
            </div>
            <div
              className={`mt-1 text-lg font-semibold ${
                status.model_exists ? 'text-go-green' : 'text-no-go-red'
              }`}
            >
              {status.model_exists ? 'Trained' : 'Not trained'}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Weather rows
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {status.weather_rows.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Predictions
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {status.prediction_rows.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Active sites
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {status.active_sites}
            </div>
          </div>
        </div>
      )}

      {/* Last action banner */}
      {lastRun.message && !anyRunning && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-center gap-2">
          <IconCheck className="w-4 h-4" />
          <span>
            <strong>Last action ({lastRun.key}):</strong> {lastRun.message}
          </span>
        </div>
      )}

      {/* Action cards */}
      {/* Alerts panel */}
      <AlertsCard />

      <div className="grid gap-4 mb-8">
        <ActionCard
          step={1}
          label="Train Model"
          description="Generate synthetic data and train the RandomForest model."
          hint="Takes ~5–15s. Writes app/ml/model.pkl."
          Icon={IconBrain}
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
          Icon={IconCloud}
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
          Icon={IconChart}
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
      <section className="card overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Latest Results</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Nearest future prediction per site.
            </p>
          </div>
          {summary.generated_at && (
            <span className="text-xs text-slate-500">
              Generated {formatTime(summary.generated_at)}
            </span>
          )}
        </div>
        {hasPredictions ? (
          <div>
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
              <div className="bg-go-green-bg p-4 text-center">
                <div className="text-2xl font-bold text-go-green">{goCount}</div>
                <div className="text-xs uppercase tracking-wider text-slate-600 font-medium mt-1">
                  Go
                </div>
              </div>
              <div className="bg-caution-yellow-bg p-4 text-center">
                <div className="text-2xl font-bold text-caution-yellow">
                  {cautionCount}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-600 font-medium mt-1">
                  Caution
                </div>
              </div>
              <div className="bg-no-go-red-bg p-4 text-center">
                <div className="text-2xl font-bold text-no-go-red">{noGoCount}</div>
                <div className="text-xs uppercase tracking-wider text-slate-600 font-medium mt-1">
                  No-Go
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-medium">Site</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 font-medium text-right">
                      No-Go Prob.
                    </th>
                    <th className="px-5 py-3 font-medium">Forecast Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {predictions.map((p) => {
                    const c = riskColorClasses(p.risk_class);
                    return (
                      <tr key={p.site_id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {p.site_name}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`pill ${c.bg} ${c.text} border ${c.border}`}>
                            <span className={`risk-dot ${c.dot}`} />
                            {p.risk_class}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {Math.round(p.no_go_probability * 100)}%
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatTime(p.forecast_time)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 mb-3">
              <IconAlert className="w-6 h-6" />
            </div>
            <div className="text-slate-700 font-medium">No predictions yet</div>
            <div className="text-sm text-slate-500 mt-1">
              Run <strong>Train Model</strong> → <strong>Ingest Weather</strong> →{' '}
              <strong>Run Predictions</strong> above.
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Admin;

const AlertsCard = () => {
  const alertsQuery = useQuery('alerts', () => getAlerts({ horizon_hours: 24 }), {
    refetchInterval: 15000,
  });
  const runMut = useMutation(runAlerts, {
    onSuccess: () => alertsQuery.refetch(),
  });

  const data = alertsQuery.data?.data;
  const alerts = data?.alerts ?? [];
  const bySeverity = (alerts || []).reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});
  const severityColor = (sev) => {
    if (sev === 'no-go') return 'bg-no-go-red text-white';
    if (sev === 'caution') return 'bg-caution-yellow text-white';
    return 'bg-slate-200 text-slate-700';
  };

  return (
    <section className="card mb-6">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Threshold Alerts</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational flags from weather forecasts over the next 24 hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill bg-no-go-red text-white">
            {bySeverity['no-go'] ?? 0} no-go
          </span>
          <span className="pill bg-caution-yellow text-white">
            {bySeverity['caution'] ?? 0} caution
          </span>
          <button
            type="button"
            onClick={() => runMut.mutate()}
            disabled={runMut.isLoading}
            className="btn-secondary text-xs"
          >
            {runMut.isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {alertsQuery.isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          No threshold breaches in the next 24 hours.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
          {alerts.slice(0, 40).map((a, idx) => (
            <div key={idx} className="px-5 py-3 flex items-center gap-3 text-sm">
              <span className={`pill ${severityColor(a.severity)}`}>{a.severity}</span>
              <span className="font-medium text-slate-900">{a.site_name}</span>
              <span className="text-slate-600">
                {a.metric} = <span className="font-mono">{a.value}</span> (threshold {a.threshold})
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {formatTime(a.forecast_time)}
              </span>
            </div>
          ))}
          {alerts.length > 40 && (
            <div className="px-5 py-3 text-xs text-slate-500">
              Showing first 40 of {alerts.length} alerts.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
