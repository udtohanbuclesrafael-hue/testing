import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ForecastChart = ({ forecast }) => {
  const chartData = forecast.map((item) => ({
    time: new Date(item.forecast_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    probability: item.no_go_probability,
    riskClass: item.risk_class,
  }));

  const getLineColor = (riskClass) => {
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

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
          <Tooltip
            formatter={(value) => `${(value * 100).toFixed(0)}% no-go probability`}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="probability"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={getLineColor(payload.riskClass)}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
