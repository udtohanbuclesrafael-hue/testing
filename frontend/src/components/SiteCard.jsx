import React from 'react';

const SiteCard = ({ site, forecast, onClick }) => {
  const nextForecast = forecast && forecast.length > 0 ? forecast[0] : null;

  const getRiskColor = (riskClass) => {
    switch (riskClass) {
      case 'Go':
        return 'border-go-green bg-green-50';
      case 'Caution':
        return 'border-caution-yellow bg-yellow-50';
      case 'No-Go':
        return 'border-no-go-red bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow ${getRiskColor(nextForecast?.risk_class)}`}
      onClick={onClick}
    >
      <h3 className="text-xl font-bold mb-2">{site.name}</h3>
      <p className="text-sm text-gray-600 mb-3">{site.description}</p>
      
      {nextForecast ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Next forecast</div>
            <div className="font-semibold">
              {new Date(nextForecast.forecast_time).toLocaleDateString()}{' '}
              {new Date(nextForecast.forecast_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            nextForecast.risk_class === 'Go' ? 'bg-go-green text-white' :
            nextForecast.risk_class === 'Caution' ? 'bg-caution-yellow text-white' :
            'bg-no-go-red text-white'
          }`}>
            {nextForecast.risk_class}
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">No forecast available</div>
      )}
    </div>
  );
};

export default SiteCard;
