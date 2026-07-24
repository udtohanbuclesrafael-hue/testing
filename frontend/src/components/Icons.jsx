import React from 'react';
import {
  ArrowLeft,
  ArrowRepeat,
  ArrowRight,
  Book,
  BoxArrowUpRight,
  CheckLg,
  Clock,
  Cloud,
  Cpu,
  ExclamationTriangle,
  Gear,
  GeoAlt,
  GraphUpArrow,
  HouseDoor,
  InfoCircle,
  List,
  PlayFill,
  ShieldCheck,
  SlashCircle,
  Water,
} from 'react-bootstrap-icons';

const createIcon = (BootstrapIcon) => {
  const Icon = ({ className = 'w-5 h-5', ...props }) => (
    <BootstrapIcon
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    />
  );

  return Icon;
};

export const IconLogo = ({ className = 'w-8 h-8', ...props }) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center rounded-[22%] bg-[#102a43] text-white ${className}`}
    {...props}
  >
    <Water className="w-[64%] h-[64%]" />
  </span>
);

export const IconWaves = createIcon(Water);
export const IconCheck = createIcon(CheckLg);
export const IconAlert = createIcon(ExclamationTriangle);
export const IconBan = createIcon(SlashCircle);
export const IconRefresh = createIcon(ArrowRepeat);
export const IconPlay = createIcon(PlayFill);
export const IconMapPin = createIcon(GeoAlt);
export const IconClock = createIcon(Clock);
export const IconShield = createIcon(ShieldCheck);
export const IconChart = createIcon(GraphUpArrow);
export const IconBrain = createIcon(Cpu);
export const IconCloud = createIcon(Cloud);
export const IconInfo = createIcon(InfoCircle);
export const IconArrowLeft = createIcon(ArrowLeft);
export const IconMenu = createIcon(List);
export const IconArrowRight = createIcon(ArrowRight);
export const IconHome = createIcon(HouseDoor);
export const IconSettings = createIcon(Gear);
export const IconBook = createIcon(Book);
export const IconExternal = createIcon(BoxArrowUpRight);

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
