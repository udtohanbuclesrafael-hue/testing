import React from 'react';

const RiskBadge = ({ riskClass, probability }) => {
  const getColors = () => {
    switch (riskClass) {
      case 'Go':
        return 'bg-go-green text-white';
      case 'Caution':
        return 'bg-caution-yellow text-white';
      case 'No-Go':
        return 'bg-no-go-red text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className={`px-4 py-2 rounded-full font-bold ${getColors()}`}>
      <div className="text-lg">{riskClass}</div>
      <div className="text-sm opacity-90">{(probability * 100).toFixed(0)}% no-go</div>
    </div>
  );
};

export default RiskBadge;
