import React from 'react';
import { riskColorClasses, riskIcon, IconMapPin } from './Icons';

const RiskBadge = ({ riskClass, probability, size = 'md' }) => {
  const Icon = riskIcon(riskClass);
  const c = riskColorClasses(riskClass);
  const sizeMap = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeMap[size]} ${c.text} ${c.bg} ${c.border}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {riskClass || 'Unknown'}
      {probability != null && (
        <span className="opacity-75 font-medium">·</span>
      )}
      {probability != null && (
        <span className="opacity-75 font-medium">
          {Math.round(probability * 100)}%
        </span>
      )}
    </span>
  );
};

export default RiskBadge;