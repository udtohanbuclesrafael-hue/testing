import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconLogo,
  IconHome,
  IconSettings,
  IconBook,
  IconShield,
  IconWaves,
} from './Icons';

const navItems = [
  { to: '/', label: 'Home', Icon: IconHome, group: 'OVERVIEW', end: true },
  { to: '/admin', label: 'Admin', Icon: IconSettings, group: 'OVERVIEW' },
  { to: '/about', label: 'About', Icon: IconBook, group: 'REFERENCE' },
];

const linkClass = ({ isActive }) =>
  [
    'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive
      ? 'bg-navy-50 text-navy-800'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

const SidebarContent = ({ onNavigate }) => (
  <div className="h-full flex flex-col">
    {/* Brand */}
    <div className="px-5 py-6 border-b border-slate-200">
      <NavLink to="/" onClick={onNavigate} className="flex items-center gap-3">
        <IconLogo className="w-10 h-10 shrink-0" />
        <div className="leading-tight">
          <div className="text-base font-bold text-slate-900 tracking-tight">SeaSID</div>
          <div className="text-[11px] text-slate-500 font-medium">
            Diveability Forecast
          </div>
        </div>
      </NavLink>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-5 overflow-y-auto">
      {Object.entries(
        navItems.reduce((acc, item) => {
          (acc[item.group] ||= []).push(item);
          return acc;
        }, {})
      ).map(([group, items]) => (
        <div key={group} className="mb-5">
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {group}
          </div>
          <div className="space-y-1">
            {items.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={linkClass}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-1 self-stretch rounded-sm ${
                        isActive ? 'bg-navy-600' : 'bg-transparent'
                      }`}
                    />
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    {/* Footer */}
    <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-md bg-navy-50 text-navy-700 shrink-0 mt-0.5">
          <IconShield className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-slate-600 leading-snug">
          <strong className="text-slate-900">Decision support only.</strong>{' '}
          Always verify local conditions before diving.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <IconWaves className="w-3 h-3" />
          Negros Oriental
        </span>
        <span className="font-mono">v0.1.0</span>
      </div>
    </div>
  </div>
);

const Sidebar = ({ mobileOpen, onMobileClose }) => (
  <>
    {/* Desktop: always visible */}
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-white border-r border-slate-200 z-40">
      <SidebarContent />
    </aside>

    {/* Mobile: drawer */}
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-[1100]">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden
        />
        <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
          <SidebarContent onNavigate={onMobileClose} />
        </aside>
      </div>
    )}
  </>
);

export default Sidebar;