import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import SiteDetail from './pages/SiteDetail';
import About from './pages/About';
import Admin from './pages/Admin';

const App = () => {
  const navigate = useNavigate();

  const handleSiteSelect = (site) => {
    if (site?.id != null) {
      navigate(`/sites/${site.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-700">
            SeaSID
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-gray-700 hover:text-blue-700">
              Home
            </Link>
            <Link to="/admin" className="text-gray-700 hover:text-blue-700">
              Admin
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-700">
              About
            </Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home onSiteSelect={handleSiteSelect} />} />
        <Route path="/sites/:siteId" element={<SiteDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

export default App;