import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = ({ sites, forecasts, onSiteClick }) => {
  const defaultPosition = [9.3, 123.2]; // Negros Oriental center

  const getMarkerColor = (riskClass) => {
    switch (riskClass) {
      case 'Go':
        return '#22c55e';
      case 'Caution':
        return '#eab308';
      case 'No-Go':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const createCustomIcon = (color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <MapContainer center={defaultPosition} zoom={10} className="w-full h-96 rounded-lg">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {sites.map((site) => {
        const siteForecast = forecasts.find((f) => f.site_id === site.id);
        const nextForecast = siteForecast?.forecast?.[0];
        const riskClass = nextForecast?.risk_class || 'Unknown';
        const markerColor = getMarkerColor(riskClass);

        return (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude]}
            icon={createCustomIcon(markerColor)}
            eventHandlers={{ click: () => onSiteClick(site) }}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold">{site.name}</h3>
                {nextForecast ? (
                  <div>
                    <div className={`inline-block px-2 py-1 rounded text-sm font-bold mt-1 ${
                      riskClass === 'Go' ? 'bg-go-green text-white' :
                      riskClass === 'Caution' ? 'bg-caution-yellow text-white' :
                      'bg-no-go-red text-white'
                    }`}>
                      {riskClass}
                    </div>
                    <div className="text-xs mt-1">
                      {(nextForecast.no_go_probability * 100).toFixed(0)}% no-go
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No forecast</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapView;
