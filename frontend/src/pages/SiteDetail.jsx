import React from 'react';
import { useQuery } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getSiteById, getSiteForecast } from '../api/client';
import ForecastChart from '../components/ForecastChart';
import RiskBadge from '../components/RiskBadge';

const SiteDetail = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();

  const { data: siteData, isLoading: siteLoading } = useQuery(
    ['site', siteId],
    () => getSiteById(siteId),
    { enabled: !!siteId }
  );

  const { data: forecastData, isLoading: forecastLoading } = useQuery(
    ['forecast', siteId],
    () => getSiteForecast(siteId),
    { enabled: !!siteId }
  );

  if (siteLoading || forecastLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const site = siteData?.data;
  const forecast = forecastData?.data?.forecast || [];

  if (!site) {
    return <div className="text-center py-8">Site not found</div>;
  }

  const nextForecast = forecast[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back to Home
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{site.name}</h1>
        <p className="text-gray-600 mb-4">{site.description}</p>
        
        {nextForecast && (
          <div className="flex items-center gap-4">
            <RiskBadge
              riskClass={nextForecast.risk_class}
              probability={nextForecast.no_go_probability}
            />
            <div className="text-sm text-gray-500">
              Next update:{' '}
              {new Date(nextForecast.forecast_time).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Forecast Chart */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">72-Hour Forecast</h2>
        <ForecastChart forecast={forecast} />
      </div>

      {/* Detailed Forecast Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Hourly Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Time</th>
                <th className="px-4 py-2 border">Risk Class</th>
                <th className="px-4 py-2 border">No-Go Probability</th>
                <th className="px-4 py-2 border">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {forecast.slice(0, 72).map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-2 border">
                    {new Date(item.forecast_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border">
                    <span className={`px-2 py-1 rounded text-sm font-bold ${
                      item.risk_class === 'Go' ? 'bg-go-green text-white' :
                      item.risk_class === 'Caution' ? 'bg-caution-yellow text-white' :
                      'bg-no-go-red text-white'
                    }`}>
                      {item.risk_class}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">
                    {(item.no_go_probability * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2 border text-sm">
                    {item.top_reasons || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Info */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Site Information</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><strong>Location:</strong> {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</li>
          <li><strong>Exposure Level:</strong> {site.exposure_level}</li>
        </ul>
      </div>
    </div>
  );
};

export default SiteDetail;
