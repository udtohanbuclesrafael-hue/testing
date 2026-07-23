import React from 'react';
import RiskBadge from './RiskBadge';
import { IconMapPin, IconArrowRight } from './Icons';

const exposureLabel = (level) => {
  const map = {
    sheltered: { label: 'Sheltered', tone: 'bg-slate-100 text-slate-700' },
    'semi-exposed': { label: 'Semi-exposed', tone: 'bg-amber-100 text-amber-800' },
    exposed: { label: 'Exposed', tone: 'bg-rose-100 text-rose-800' },
  };
  return map[(level || '').toLowerCase()] || { label: level || '—', tone: 'bg-slate-100 text-slate-600' };
};

const SiteCard = ({ site, forecast, onClick }) => {
  const nextForecast = forecast?.no_go_probability != null ? forecast : null;
  const exp = exposureLabel(site.exposure_level);

  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover text-left p-5 flex flex-col gap-3 group w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-navy-700 transition-colors">
            {site.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <IconMapPin className="w-3.5 h-3.5" />
            {site.latitude.toFixed(2)}, {site.longitude.toFixed(2)}
          </div>
        </div>
        {nextForecast ? (
          <RiskBadge
            riskClass={nextForecast.risk_class}
            probability={nextForecast.no_go_probability}
          />
        ) : (
          <span className="pill bg-slate-100 text-slate-500 border border-slate-200">
            No forecast
          </span>
        )}
      </div>

      {site.description && (
        <p className="text-sm text-slate-600 line-clamp-2">{site.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
        <span className={`pill ${exp.tone}`}>{exp.label}</span>
        {nextForecast && (
          <div className="flex items-center gap-1 text-sm font-medium text-navy-700 group-hover:gap-2 transition-all">
            View forecast
            <IconArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </button>
  );
};

export default SiteCard;