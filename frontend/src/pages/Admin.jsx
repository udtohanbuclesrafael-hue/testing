import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
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

const ActionButton = ({ label, description, onClick, isLoading, error, success }) => (
  <div className="p-4 bg-white border rounded-lg shadow-sm flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Running…' : 'Run'}
      </button>
    </div>
    {error && (
      <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
        {String(error?.response?.data?.detail || error?.message || error)}
      </div>
    )}
    {success && !error && (
      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
        {success}
      </div>
    )}
  </div>
);

const Admin = () => {
  const queryClient = useQueryClient();
  const [poll, setPoll] = useState(false);

  // Queries
  const { data: sitesData } = useQuery('sites', getSites);
  const { data: summaryData, refetch: refetchSummary } = useQuery(
    'regionalSummary',
    getRegionalSummary,
    { refetchInterval: poll ? 4000 : false }
  );

  const sites = sitesData?.data || [];
  const summary = summaryData?.data || { sites: [] };
  const predictions = summary.sites || [];

  // Mutations
  const trainMut = useMutation(trainModel, {
    onSuccess: () => {
      queryClient.invalidateQueries('regionalSummary');
    },
  });
  const ingestMut = useMutation(ingestWeather, {
    onSuccess: () => {
      setPoll(true);
      // Give the background ingest ~10s, then stop polling
      setTimeout(() => setPoll(false), 60000);
    },
  });
  const predictMut = useMutation(() => runPredictions(null), {
    onSuccess: () => {
      queryClient.invalidateQueries('regionalSummary');
      refetchSummary();
    },
  });

  const status = (() => {
    if (trainMut.isLoading) return { kind: 'running', text: 'Training model…' };
    if (ingestMut.isLoading) return { kind: 'running', text: 'Ingesting weather from Open-Meteo…' };
    if (predictMut.isLoading) return { kind: 'running', text: 'Scoring predictions…' };
    return { kind: 'idle', text: 'Idle' };
  })();

  const goCount = predictions.filter((p) => p.risk_class === 'Go').length;
  const cautionCount = predictions.filter((p) => p.risk_class === 'Caution').length;
  const noGoCount = predictions.filter((p) => p.risk_class === 'No-Go').length;
  const hasPredictions = predictions.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Admin Operations</h1>
      <p className="text-gray-600 mb-6">
        Trigger model training, weather ingest, and prediction scoring. Results
        appear on the <a href="/" className="text-blue-600 underline">Home</a> page
        after predictions exist.
      </p>

      {/* Status banner */}
      <div
        className={`mb-6 p-3 rounded text-sm ${
          status.kind === 'running'
            ? 'bg-blue-50 text-blue-800'
            : hasPredictions
            ? 'bg-green-50 text-green-800'
            : 'bg-yellow-50 text-yellow-800'
        }`}
      >
        <strong>Status:</strong> {status.text}
        {hasPredictions && (
          <> · {predictions.length} active site predictions</>
        )}
      </div>

      {/* Action cards */}
      <div className="grid gap-4 mb-8">
        <ActionButton
          label="1. Train Model"
          description="Generate synthetic data and train the RandomForest model (background)."
          onClick={() => trainMut.mutate()}
          isLoading={trainMut.isLoading}
          error={trainMut.error}
          success={trainMut.data?.data?.status}
        />
        <ActionButton
          label="2. Ingest Weather"
          description="Fetch latest 72h forecasts from Open-Meteo for every active site."
          onClick={() => ingestMut.mutate()}
          isLoading={ingestMut.isLoading}
          error={ingestMut.error}
          success={ingestMut.data?.data?.status}
        />
        <ActionButton
          label="3. Run Predictions"
          description="Score the latest weather window and persist Prediction rows."
          onClick={() => predictMut.mutate()}
          isLoading={predictMut.isLoading}
          error={predictMut.error}
          success={
            predictMut.data?.data
              ? `${predictMut.data.data.status} (${predictMut.data.data.predictions_written} rows)`
              : null
          }
        />
      </div>

      {/* Live results */}
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