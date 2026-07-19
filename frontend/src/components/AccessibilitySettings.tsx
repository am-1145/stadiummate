'use client';

import React from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Accessibility, Type, Eye, Layers, Users } from 'lucide-react';

export const AccessibilitySettings: React.FC = () => {
  const {
    largeFont,
    highContrast,
    stepFreePreferred,
    avoidCrowdsPreferred,
    toggleLargeFont,
    toggleHighContrast,
    toggleStepFree,
    toggleAvoidCrowds
  } = useAccessibility();

  return (
    <section 
      aria-label="Accessibility Settings" 
      className="glass-card rounded-2xl p-6 border border-fifa-border/40 shadow-glass"
    >
      <div className="flex items-center gap-3 mb-6">
        <Accessibility className="text-fifa-accent h-6 w-6" aria-hidden="true" />
        <h2 className="text-xl font-bold font-title tracking-wide text-white">Accessibility Center</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Large Text */}
        <button
          onClick={toggleLargeFont}
          aria-pressed={largeFont}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left focus:outline-none ${
            largeFont 
              ? 'bg-fifa-primary/20 border-fifa-primary text-white' 
              : 'bg-fifa-card/50 border-fifa-border/40 text-fifa-textMuted hover:border-fifa-border/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Type className="h-5 w-5 text-fifa-accent" aria-hidden="true" />
            <div>
              <span className="font-semibold block text-white">Large Text</span>
              <span className="text-xs text-fifa-textMuted">Increases legibility & font scale</span>
            </div>
          </div>
          <div 
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
              largeFont ? 'bg-fifa-primary' : 'bg-fifa-border'
            }`}
            aria-hidden="true"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              largeFont ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>

        {/* High Contrast */}
        <button
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left focus:outline-none ${
            highContrast 
              ? 'bg-fifa-primary/20 border-fifa-primary text-white' 
              : 'bg-fifa-card/50 border-fifa-border/40 text-fifa-textMuted hover:border-fifa-border/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-fifa-accent" aria-hidden="true" />
            <div>
              <span className="font-semibold block text-white">High Contrast</span>
              <span className="text-xs text-fifa-textMuted">Increases color contrast</span>
            </div>
          </div>
          <div 
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
              highContrast ? 'bg-fifa-primary' : 'bg-fifa-border'
            }`}
            aria-hidden="true"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              highContrast ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>

        {/* Step-Free / Wheelchair Routes */}
        <button
          onClick={toggleStepFree}
          aria-pressed={stepFreePreferred}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left focus:outline-none ${
            stepFreePreferred 
              ? 'bg-fifa-primary/20 border-fifa-primary text-white' 
              : 'bg-fifa-card/50 border-fifa-border/40 text-fifa-textMuted hover:border-fifa-border/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-fifa-accent" aria-hidden="true" />
            <div>
              <span className="font-semibold block text-white">Step-Free Routing</span>
              <span className="text-xs text-fifa-textMuted">Avoids stairs, prioritizes elevators</span>
            </div>
          </div>
          <div 
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
              stepFreePreferred ? 'bg-fifa-primary' : 'bg-fifa-border'
            }`}
            aria-hidden="true"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              stepFreePreferred ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>

        {/* Avoid Congestion */}
        <button
          onClick={toggleAvoidCrowds}
          aria-pressed={avoidCrowdsPreferred}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left focus:outline-none ${
            avoidCrowdsPreferred 
              ? 'bg-fifa-primary/20 border-fifa-primary text-white' 
              : 'bg-fifa-card/50 border-fifa-border/40 text-fifa-textMuted hover:border-fifa-border/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-fifa-accent" aria-hidden="true" />
            <div>
              <span className="font-semibold block text-white">Avoid Congestion</span>
              <span className="text-xs text-fifa-textMuted">Reroutes around busy crowds</span>
            </div>
          </div>
          <div 
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
              avoidCrowdsPreferred ? 'bg-fifa-primary' : 'bg-fifa-border'
            }`}
            aria-hidden="true"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              avoidCrowdsPreferred ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>
      </div>
    </section>
  );
};
export default AccessibilitySettings;
