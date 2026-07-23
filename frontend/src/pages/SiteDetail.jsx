import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getSiteById, getSiteForecast } from '../api/client';
import ForecastChart from '../components/ForecastChart';
import RiskBadge from '../components/RiskBadge';
import {
  IconArrowLeft,
  IconMapPin,
  IconShield,
  IconWaves,
  IconClock,
} from '../components/Icons';

const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

const PageLoading = () => (
  <div className="container-page py-8">
    <Skeleton className="h-6 w-24 mb-6" />
    <Skeleton className="h-32 mb-6" />
    <Skeleton className="h-72 mb-6" />
    <Skeleton className="h-64" />
  </div>
);

const SiteDetail = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();

  const { data: siteData, isLoading: siteLoading } = useQuery(
    ['site', siteId],
    () => getSiteById(siteId),
    { enabled: !!siteId, staleTime: 5 * 60_000 }
  );

  const { data: forecastData, isLoading: forecastLoading } = useQuery(
    ['forecast', siteId],
    () => getSiteForecast(siteId),
    { enabled: !!siteId, staleTime: 60_000 }
  );

  if (siteLoading || forecastLoading) return <PageLoading />;

  const site = siteData?.data;
  const forecast = forecastData?.data?.forecast || [];

  if (!site) {
    return (
      <div className="container-page py-16 text-center">
        <h2 className="text-2xl font-semibold mb-2">Site not found</h2>
        <p className="text-slate-500 mb-6">
          The dive site you’re looking for doesn’t exist.
        </p>
        <Link to="/" className="btn-primary">
          <IconArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    );
  }

  const next = forecast[0];

  return (
    <div className="container-page py-8">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="btn-ghost mb-6 -ml-2"
      >
        <IconArrowLeft className="w-4 h-4" />
        Back to home
      </button>

      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="bg-navy-800 text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-xs font-medium mb-3">
                <IconWaves className="w-3.5 h-3.5" />
                {site.exposure_level || 'Unknown exposure'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {site.name}
              </h1>
              {site.description && (
                <p className="mt-2 text-navy-200 max-w-xl text-sm sm:text-base">
                  {site.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 text-sm text-navy-200">
                <IconMapPin className="w-4 h-4" />
                {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
              </div>
            </div>
            {next && (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 min-w-[180px]">
                <div className="text-xs uppercase tracking-wider text-navy-200 font-medium mb-2">
                  Next forecast
                </div>
                <RiskBadge
                  riskClass={next.risk_class}
                  probability={next.no_go_probability}
                  size="lg"
                />
                <div className="mt-3 flex items-center gap-1.5 text-xs text-navy-200">
                  <IconClock className="w-3.5 h-3.5" />
                  {new Date(next.forecast_time).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              72-Hour Forecast
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              No-go probability over time. Dots colored by risk class.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="risk-dot bg-go-green" /> Go
            </span>
            <span className="flex items-center gap-1.5">
              <span className="risk-dot bg-caution-yellow" /> Caution
            </span>
            <span className="flex items-center gap-1.5">
              <span className="risk-dot bg-no-go-red" /> No-Go
            </span>
          </div>
        </div>
        <ForecastChart forecast={forecast} />
      </section>

      {/* Table */}
      <section className="card overflow-hidden mt-6">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Hourly Details</h2>
          <span className="text-sm text-slate-500">{forecast.length} hours</span>
        </div>
        {forecast.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No hourly data yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium text-right">
                    No-Go Prob.
                  </th>
                  <th className="px-5 py-3 font-medium">Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecast.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                      {new Date(item.forecast_time).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge riskClass={item.risk_class} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {Math.round(item.no_go_probability * 100)}%
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.top_reasons || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Site info */}
      <section className="card p-5 sm:p-6 mt-6 flex items-start gap-4">
        <div className="p-2 rounded-md bg-navy-50 text-navy-700 shrink-0">
          <IconShield className="w-5 h-5" />
        </div>
        <div className="text-sm text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Always dive within your limits.</strong>{' '}
          These forecasts are decision-support only. Verify conditions locally
          with the dive operator, check tide and current tables, and abort
          the dive if anything looks off. Local weather warnings from PAGASA
          and coast guard always take precedence.
        </div>
      </section>
    </div>
  );
};

export default SiteDetail;