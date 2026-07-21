import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getRegionalSummary, getSites } from '../api/client';
import MapView from '../components/MapView';
import SiteCard from '../components/SiteCard';
import {
  IconCheck,
  IconAlert,
  IconBan,
  IconWaves,
  IconArrowRight,
} from '../components/Icons';

const StatTile = ({ count, label, Icon, colorClasses }) => (
  <div
    className={`card p-5 ${colorClasses.border} border ${colorClasses.bg} transition-shadow hover:shadow-card-hover`}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className={`text-3xl font-bold ${colorClasses.text}`}>{count}</div>
        <div className="text-sm font-medium text-slate-600 mt-1">{label}</div>
      </div>
      <div
        className={`p-2 rounded-lg ${colorClasses.text} bg-white/70 ring-1 ${colorClasses.ring}`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} />;

const Home = ({ onSiteSelect }) => {
  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    'regionalSummary',
    getRegionalSummary,
    { staleTime: 60_000 }
  );
  const { data: sitesData, isLoading: sitesLoading } = useQuery('sites', getSites, {
    staleTime: 5 * 60_000,
  });

  const sites = sitesData?.data || [];
  const forecasts = summaryData?.data?.sites || [];
  const goCount = forecasts.filter((f) => f.risk_class === 'Go').length;
  const cautionCount = forecasts.filter((f) => f.risk_class === 'Caution').length;
  const noGoCount = forecasts.filter((f) => f.risk_class === 'No-Go').length;
  const hasData = forecasts.length > 0;
  const generatedAt = summaryData?.data?.generated_at;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          aria-hidden
        >
          <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0 100 Q100 60 200 100 T400 100 T600 100 T800 100 L800 200 L0 200 Z"
              fill="rgba(255,255,255,0.05)"
            />
            <path
              d="M0 140 Q100 110 200 140 T400 140 T600 140 T800 140 L800 200 L0 200 Z"
              fill="rgba(255,255,255,0.04)"
            />
          </svg>
        </div>
        <div className="container-page relative py-12 sm:py-16">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium mb-4">
                <IconWaves className="w-3.5 h-3.5" />
                Negros Oriental, Philippines
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
                Know before you dive.
              </h1>
              <p className="mt-3 text-base sm:text-lg text-brand-100 max-w-xl">
                Hyperlocal 72-hour diveability forecasts for the top sites in
                Negros Oriental. AI-assisted risk scoring so operators, guides,
                and recreational divers can plan with confidence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/about"
                  className="btn-primary bg-white text-brand-800 hover:bg-brand-50"
                >
                  How it works
                  <IconArrowRight className="w-4 h-4" />
                </Link>
                {!hasData && (
                  <Link
                    to="/admin"
                    className="btn border border-white/30 text-white hover:bg-white/10"
                  >
                    Run first forecast
                  </Link>
                )}
              </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[420px]">
              {summaryLoading || sitesLoading ? (
                <>
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </>
              ) : (
                <>
                  <StatTile
                    count={goCount}
                    label="Go"
                    Icon={IconCheck}
                    colorClasses={{
                      text: 'text-go-green',
                      bg: 'bg-white',
                      border: 'border-go-green/20',
                      ring: 'ring-go-green/20',
                    }}
                  />
                  <StatTile
                    count={cautionCount}
                    label="Caution"
                    Icon={IconAlert}
                    colorClasses={{
                      text: 'text-caution-yellow',
                      bg: 'bg-white',
                      border: 'border-caution-yellow/20',
                      ring: 'ring-caution-yellow/20',
                    }}
                  />
                  <StatTile
                    count={noGoCount}
                    label="No-Go"
                    Icon={IconBan}
                    colorClasses={{
                      text: 'text-no-go-red',
                      bg: 'bg-white',
                      border: 'border-no-go-red/20',
                      ring: 'ring-no-go-red/20',
                    }}
                  />
                </>
              )}
            </div>
          </div>
          {generatedAt && (
            <div className="mt-6 text-xs text-brand-200">
              Last updated {new Date(generatedAt).toLocaleString()} ·{' '}
              {sites.length} active sites
            </div>
          )}
        </div>
      </section>

      {/* Map */}
      <section className="container-page mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Dive Sites Map</h2>
            <p className="text-sm text-slate-500 mt-1">
              Click a marker or card to see the 72-hour forecast.
            </p>
          </div>
        </div>
        {summaryLoading || sitesLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="card overflow-hidden">
            <MapView
              sites={sites}
              forecasts={forecasts}
              onSiteClick={onSiteSelect}
            />
          </div>
        )}
      </section>

      {/* Site cards */}
      <section className="container-page mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">All Sites</h2>
            <p className="text-sm text-slate-500 mt-1">
              Current risk class for the next forecast window.
            </p>
          </div>
        </div>
        {sitesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : sites.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">
            No sites yet — add some via <Link to="/admin" className="text-brand-700 underline">Admin</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                forecast={forecasts.find((f) => f.site_id === site.id)}
                onClick={() => onSiteSelect(site)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <section className="container-page mt-10">
        <div className="card p-5 flex items-start gap-4 bg-amber-50 border-amber-200/70">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Safety first.</strong> SeaSID
            provides decision-support forecasts only. It does not replace local
            judgment, official weather warnings, or on-site safety assessments by
            qualified dive professionals. Always verify conditions locally
            before diving and follow established safety protocols.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;