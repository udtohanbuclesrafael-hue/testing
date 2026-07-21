import React from 'react';

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">About SeaSID</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">What is SeaSID?</h2>
        <p className="text-gray-700 mb-4">
          SeaSID is a hyperlocal diveability forecasting web app for Negros Oriental, Philippines. 
          It uses weather, ocean, and machine learning data to estimate the probability of no-go 
          conditions at dive sites, helping divers and operators make safer, faster decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How It Works</h2>
        <p className="text-gray-700 mb-4">
          SeaSID analyzes multiple environmental factors including:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li>Wind speed and direction</li>
          <li>Wave height and swell conditions</li>
          <li>Rainfall and storm proximity</li>
          <li>Sea surface temperature</li>
          <li>Site-specific exposure characteristics</li>
        </ul>
        <p className="text-gray-700">
          These factors are processed through a machine learning model trained on historical patterns 
          to produce a probability score indicating the likelihood of unsafe diving conditions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Understanding the Forecast</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
            <div className="px-4 py-2 bg-go-green text-white rounded-full font-bold">Go</div>
            <div className="text-gray-700">
              <span className="font-semibold">0-30% no-go probability</span> - Conditions are likely suitable for diving
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg">
            <div className="px-4 py-2 bg-caution-yellow text-white rounded-full font-bold">Caution</div>
            <div className="text-gray-700">
              <span className="font-semibold">31-60% no-go probability</span> - Borderline conditions, exercise caution
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg">
            <div className="px-4 py-2 bg-no-go-red text-white rounded-full font-bold">No-Go</div>
            <div className="text-gray-700">
              <span className="font-semibold">61-100% no-go probability</span> - Conditions likely unsafe or unsuitable
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data Sources</h2>
        <p className="text-gray-700 mb-4">
          SeaSID uses open weather and marine forecast data from Open-Meteo API, combined with 
          site-specific characteristics to generate localized predictions.
        </p>
        <p className="text-gray-700">
          <strong>Note:</strong> The initial model is trained on synthetic data. We are actively 
          working to incorporate real dive logs and operator feedback to improve accuracy.
        </p>
      </section>

      <section className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Safety Disclaimer</h2>
        <p className="text-gray-700">
          <strong>SeaSID provides decision-support forecasts only.</strong> It does not replace 
          local judgment, official weather warnings, or on-site safety assessments by qualified 
          dive professionals. Always verify conditions locally before diving and follow established 
          safety protocols.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Contact & Feedback</h2>
        <p className="text-gray-700">
          We welcome feedback from dive operators, guides, and recreational divers to help improve 
          SeaSID's accuracy and usefulness. Please share your experiences and suggestions.
        </p>
      </section>
    </div>
  );
};

export default About;
