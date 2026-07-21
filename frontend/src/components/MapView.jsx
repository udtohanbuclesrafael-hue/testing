import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { riskColorClasses, riskIcon } from './Icons';

const MapView = ({ sites, forecasts, onSiteClick }) => {
  const defaultPosition = [9.25, 123.22];

  const createIcon = (risk) => {
    const c = riskColorClasses(risk);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 22px; height: 22px;
        border-radius: 50%;
        background: ${c.dot.replace('bg-', '')};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(15,23,42,0.25);
      "></div>`.replace(/bg-go-green/g, '#16a34a')
        .replace(/bg-caution-yellow/g, '#d97706')
        .replace(/bg-no-go-red/g, '#dc2626')
        .replace(/bg-slate-400/g, '#94a3b8'),
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  };

  return (
    <MapContainer
      center={defaultPosition}
      zoom={10}
      style={{ height: '400px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sites.map((site) => {
        const siteForecast = forecasts.find((f) => f.site_id === site.id);
        const next = siteForecast;
        const risk = next?.risk_class || 'Unknown';
        const Icon = riskIcon(risk);

        return (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude]}
            icon={createIcon(risk)}
            eventHandlers={{ click: () => onSiteClick?.(site) }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                  {site.name}
                </div>
                {next ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        background:
                          risk === 'Go'
                            ? '#16a34a'
                            : risk === 'Caution'
                            ? '#d97706'
                            : risk === 'No-Go'
                            ? '#dc2626'
                            : '#94a3b8',
                      }}
                    >
                      <Icon style={{ width: 14, height: 14 }} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{risk}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {Math.round(next.no_go_probability * 100)}% no-go
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    No forecast yet
                  </div>
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