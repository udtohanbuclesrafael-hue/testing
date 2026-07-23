import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import SiteDetail from './pages/SiteDetail';
import About from './pages/About';
import Admin from './pages/Admin';
import Sidebar from './components/Sidebar';
import { IconMenu, IconLogo } from './components/Icons';

const pageTitle = (pathname) => {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/admin')) return 'Admin Operations';
  if (pathname.startsWith('/about')) return 'About';
  if (pathname.startsWith('/sites/')) return 'Site Detail';
  return 'SeaSID';
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSiteSelect = (site) => {
    if (site?.id != null) navigate(`/sites/${site.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile-only top bar with hamburger. z above leaflet. */}
      <header className="md:hidden sticky top-0 z-[1000] bg-white backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-md text-slate-700 hover:bg-slate-100"
            aria-label="Open navigation"
          >
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <IconLogo className="w-7 h-7" />
            <span className="font-semibold text-slate-900">{pageTitle(location.pathname)}</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="md:pl-64">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home onSiteSelect={handleSiteSelect} />} />
              <Route path="/sites/:siteId" element={<SiteDetail />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;