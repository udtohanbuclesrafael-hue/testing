import React from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import SiteDetail from './pages/SiteDetail';
import About from './pages/About';
import Admin from './pages/Admin';
import { IconLogo, IconHome, IconSettings, IconBook, IconShield } from './components/Icons';

const navLinkClass = ({ isActive }) =>
  [
    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-800'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

const Header = () => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200/70">
    <div className="container-page flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2.5">
        <IconLogo className="w-9 h-9" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-slate-900 tracking-tight">SeaSID</span>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            Diveability Forecast
          </span>
        </div>
      </Link>
      <nav className="flex items-center gap-1">
        <NavLink to="/" end className={navLinkClass}>
          <IconHome className="w-4 h-4" />
          Home
        </NavLink>
        <NavLink to="/admin" className={navLinkClass}>
          <IconSettings className="w-4 h-4" />
          Admin
        </NavLink>
        <NavLink to="/about" className={navLinkClass}>
          <IconBook className="w-4 h-4" />
          About
        </NavLink>
      </nav>
    </div>
  </header>
);

const Footer = () => (
  <footer className="mt-16 border-t border-slate-200/70 bg-white">
    <div className="container-page py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <IconShield className="w-4 h-4 text-brand-600" />
        <span>Decision-support only. Always verify locally before diving.</span>
      </div>
      <div className="text-xs">
        © {new Date().getFullYear()} SeaSID · Negros Oriental, Philippines
      </div>
    </div>
  </footer>
);

const App = () => {
  const navigate = useNavigate();

  const handleSiteSelect = (site) => {
    if (site?.id != null) navigate(`/sites/${site.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home onSiteSelect={handleSiteSelect} />} />
          <Route path="/sites/:siteId" element={<SiteDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;