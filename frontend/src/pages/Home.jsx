import React from 'react';
import { useQuery } from 'react-query';
import { getRegionalSummary, getSites } from '../api/client';
import MapView from '../components/MapView';
import SiteCard from '../components/SiteCard';

const Home = ({ onSiteSelect }) => {
  const { data: summaryData, isLoading: summaryLoading } = useQuery('regionalSummary', getRegionalSummary);
  const { data: sitesData, isLoading: sitesLoading } = useQuery('sites', getSites);

  if (summaryLoading || sitesLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const sites = sitesData?.data || [];
  const forecasts = summaryData?.data?.sites || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">SeaSID - Diveability Forecast</h1>
      <p className="text-gray-600 mb-6">Negros Oriental, Philippines</p>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-go-green">
            {forecasts.filter((f) => f.risk_class === 'Go').length}
          </div>
          <div className="text-sm text-gray-600">Go Sites</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-caution-yellow">
            {forecasts.filter((f) => f.risk_class === 'Caution').length}
          </div>
          <div className="text-sm text-gray-600">Caution Sites</div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-no-go-red">
            {forecasts.filter((f) => f.risk_class === 'No-Go').length}
          </div>
          <div className="text-sm text-gray-600">No-Go Sites</div>
        </div>
      </div>

      {/* Map */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Dive Sites Map</h2>
        <MapView sites={sites} forecasts={forecasts} onSiteClick={onSiteSelect} />
      </div>

      {/* Site Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Dive Sites</h2>
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
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
        <strong>Disclaimer:</strong> SeaSID provides decision-support forecasts only. It does not replace local judgment, 
        official weather warnings, or on-site safety assessments by qualified dive professionals.
      </div>
    </div>
  );
};

export default Home;
