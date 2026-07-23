import React from 'react';
import {
  IconShield,
  IconWaves,
  IconCheck,
  IconAlert,
  IconBan,
  IconBrain,
  IconCloud,
  IconChart,
} from '../components/Icons';

const RiskRow = ({ risk, Icon, range, description, colorClasses }) => (
  <div className={`card p-5 ${colorClasses.border} border ${colorClasses.bg}`}>
    <div className="flex items-start gap-4">
      <div
        className={`p-3 rounded-lg ${colorClasses.text} bg-white/70 ring-1 ${colorClasses.ring} shrink-0`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">{risk}</h3>
          <span className={`pill ${colorClasses.text} bg-white border ${colorClasses.border}`}>
            {range}
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ Icon, title, description }) => (
  <div className="card p-5 card-hover">
    <div className="p-2 inline-flex rounded-lg bg-navy-50 text-navy-700 mb-3">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="font-semibold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{description}</p>
  </div>
);

const About = () => (
  <div className="container-page py-10 max-w-4xl">
    {/* Header */}
    <div className="mb-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-navy-50 text-navy-700 text-xs font-medium mb-4">
        <IconWaves className="w-3.5 h-3.5" />
        About SeaSID
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        Smarter decisions, safer dives.
      </h1>
      <p className="mt-3 text-slate-600 max-w-2xl leading-relaxed">
        SeaSID is a hyperlocal diveability forecasting web app for Negros
        Oriental, Philippines. It combines open weather and marine forecasts
        with a machine-learning classifier to estimate the probability of
        no-go conditions at each dive site over the next 72 hours.
      </p>
    </div>

    {/* How it works */}
    <section className="mb-12">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">How it works</h2>
      <p className="text-slate-600 mb-6 max-w-2xl">
        SeaSID analyzes multiple environmental signals, processes them through
        a RandomForest model trained on historical patterns, and surfaces a
        discrete risk class with a probability score.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          Icon={IconCloud}
          title="Open-Meteo Forecasts"
          description="72-hour hourly wind, rain, pressure, wave, swell and sea-surface temperature data for every site."
        />
        <FeatureCard
          Icon={IconBrain}
          title="RandomForest Model"
          description="A balanced RandomForest classifier predicts the probability of unsafe conditions based on a learned combination of features."
        />
        <FeatureCard
          Icon={IconChart}
          title="Risk Visualization"
          description="Go / Caution / No-Go classes with confidence percentages and top contributing reasons for every hour."
        />
      </div>
    </section>

    {/* Risk taxonomy */}
    <section className="mb-12">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">
        Understanding the forecast
      </h2>
      <div className="space-y-3">
        <RiskRow
          risk="Go"
          Icon={IconCheck}
          range="0–30%"
          description="Conditions are likely suitable for diving. Always check local conditions before departure."
          colorClasses={{
            text: 'text-go-green',
            bg: 'bg-go-green-bg',
            border: 'border-go-green/20',
            ring: 'ring-go-green/20',
          }}
        />
        <RiskRow
          risk="Caution"
          Icon={IconAlert}
          range="30–60%"
          description="Borderline conditions. Operators and guides should exercise additional judgment; novices may want to defer."
          colorClasses={{
            text: 'text-caution-yellow',
            bg: 'bg-caution-yellow-bg',
            border: 'border-caution-yellow/20',
            ring: 'ring-caution-yellow/20',
          }}
        />
        <RiskRow
          risk="No-Go"
          Icon={IconBan}
          range="60–100%"
          description="Conditions are likely unsafe or unsuitable. Postpone the trip or switch to a more sheltered site."
          colorClasses={{
            text: 'text-no-go-red',
            bg: 'bg-no-go-red-bg',
            border: 'border-no-go-red/20',
            ring: 'ring-no-go-red/20',
          }}
        />
      </div>
    </section>

    {/* Data sources */}
    <section className="mb-12">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">Data sources</h2>
      <div className="card p-5 leading-relaxed text-slate-700 text-sm">
        SeaSID uses open weather and marine forecast data from{' '}
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noreferrer"
          className="text-navy-700 underline"
        >
          Open-Meteo
        </a>
        , combined with site-specific exposure characteristics to generate
        localized predictions.
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
          <strong>Note.</strong> The initial model is trained on synthetic data
          generated from realistic weather distributions. We are actively
          working to incorporate real dive logs and operator feedback to
          improve accuracy.
        </div>
      </div>
    </section>

    {/* Safety */}
    <section>
      <div className="card p-6 bg-navy-50 border-navy-200 flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-white text-navy-700 ring-1 ring-navy-200 shrink-0">
          <IconShield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">Safety disclaimer</h3>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            <strong>SeaSID provides decision-support forecasts only.</strong> It
            does not replace local judgment, official weather warnings from
            PAGASA, or on-site safety assessments by qualified dive
            professionals. Always verify conditions locally before diving and
            follow established safety protocols.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default About;