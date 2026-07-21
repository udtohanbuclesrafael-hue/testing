import React from 'react';

const Svg = ({ children, className = 'w-5 h-5', viewBox = '0 0 24 24' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const IconLogo = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#0369a1" />
    <path
      d="M10 58 Q25 42 40 58 T70 58 T100 58"
      stroke="#fff"
      strokeWidth="7"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M10 74 Q25 58 40 74 T70 74 T100 74"
      stroke="#7dd3fc"
      strokeWidth="7"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const IconWaves = (props) => (
  <Svg {...props}>
    <path d="M2 6c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
  </Svg>
);

export const IconCheck = (props) => (
  <Svg {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconAlert = (props) => (
  <Svg {...props}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconBan = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.93 4.93 14.14 14.14" />
  </Svg>
);

export const IconRefresh = (props) => (
  <Svg {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);

export const IconPlay = (props) => (
  <Svg {...props}>
    <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
  </Svg>
);

export const IconMapPin = (props) => (
  <Svg {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);

export const IconClock = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const IconShield = (props) => (
  <Svg {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </Svg>
);

export const IconChart = (props) => (
  <Svg {...props}>
    <path d="M3 3v18h18" />
    <path d="m7 16 4-4 4 4 5-6" />
  </Svg>
);

export const IconBrain = (props) => (
  <Svg {...props}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z" />
  </Svg>
);

export const IconCloud = (props) => (
  <Svg {...props}>
    <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78 6 6 0 0 0-11.6 1.78A4 4 0 0 0 6 19h11.5Z" />
  </Svg>
);

export const IconInfo = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const IconArrowLeft = (props) => (
  <Svg {...props}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Svg>
);

export const IconMenu = (props) => (
  <Svg {...props}>
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </Svg>
);

export const IconArrowRight = (props) => (
  <Svg {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Svg>
);

export const IconHome = (props) => (
  <Svg {...props}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2Z" />
  </Svg>
);

export const IconSettings = (props) => (
  <Svg {...props}>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconBook = (props) => (
  <Svg {...props}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </Svg>
);

export const IconExternal = (props) => (
  <Svg {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </Svg>
);

export const riskIcon = (risk) => {
  if (risk === 'Go') return IconCheck;
  if (risk === 'Caution') return IconAlert;
  if (risk === 'No-Go') return IconBan;
  return IconInfo;
};

export const riskColorClasses = (risk) => {
  switch (risk) {
    case 'Go':
      return { text: 'text-go-green', bg: 'bg-go-green-bg', border: 'border-go-green/30', dot: 'bg-go-green', ring: 'ring-go-green/40' };
    case 'Caution':
      return { text: 'text-caution-yellow', bg: 'bg-caution-yellow-bg', border: 'border-caution-yellow/30', dot: 'bg-caution-yellow', ring: 'ring-caution-yellow/40' };
    case 'No-Go':
      return { text: 'text-no-go-red', bg: 'bg-no-go-red-bg', border: 'border-no-go-red/30', dot: 'bg-no-go-red', ring: 'ring-no-go-red/40' };
    default:
      return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400', ring: 'ring-slate-300' };
  }
};