'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AccessibilitySettings {
  largeFont: boolean;
  highContrast: boolean;
  stepFreePreferred: boolean;
  avoidCrowdsPreferred: boolean;
  announcements: string[];
  addAnnouncement: (msg: string) => void;
  toggleLargeFont: () => void;
  toggleHighContrast: () => void;
  toggleStepFree: () => void;
  toggleAvoidCrowds: () => void;
}

const AccessibilityContext = createContext<AccessibilitySettings | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [stepFreePreferred, setStepFreePreferred] = useState(false);
  const [avoidCrowdsPreferred, setAvoidCrowdsPreferred] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Load configuration from local storage
  useEffect(() => {
    const savedLargeFont = localStorage.getItem('sm_largeFont') === 'true';
    const savedHighContrast = localStorage.getItem('sm_highContrast') === 'true';
    const savedStepFree = localStorage.getItem('sm_stepFree') === 'true';
    const savedAvoidCrowds = localStorage.getItem('sm_avoidCrowds') === 'true';

    setLargeFont(savedLargeFont);
    setHighContrast(savedHighContrast);
    setStepFreePreferred(savedStepFree);
    setAvoidCrowdsPreferred(savedAvoidCrowds);
  }, []);

  // Update HTML body tags for global CSS styling selectors
  useEffect(() => {
    if (largeFont) {
      document.body.classList.add('large-font-mode');
    } else {
      document.body.classList.remove('large-font-mode');
    }
  }, [largeFont]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  }, [highContrast]);

  const addAnnouncement = (msg: string) => {
    setAnnouncements(prev => [...prev, msg]);
    // Speak using window synthesis if supported (Screen Reader Assistance)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(msg);
      window.speechSynthesis.speak(utterance);
    }
    // Remove announcement after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 5000);
  };

  const toggleLargeFont = () => {
    setLargeFont(prev => {
      const next = !prev;
      localStorage.setItem('sm_largeFont', String(next));
      addAnnouncement(next ? "Large text mode activated." : "Large text mode deactivated.");
      return next;
    });
  };

  const toggleHighContrast = () => {
    setHighContrast(prev => {
      const next = !prev;
      localStorage.setItem('sm_highContrast', String(next));
      addAnnouncement(next ? "High contrast mode activated." : "High contrast mode deactivated.");
      return next;
    });
  };

  const toggleStepFree = () => {
    setStepFreePreferred(prev => {
      const next = !prev;
      localStorage.setItem('sm_stepFree', String(next));
      addAnnouncement(next ? "Routing preference updated to step-free and elevator-first." : "Standard routing preference selected.");
      return next;
    });
  };

  const toggleAvoidCrowds = () => {
    setAvoidCrowdsPreferred(prev => {
      const next = !prev;
      localStorage.setItem('sm_avoidCrowds', String(next));
      addAnnouncement(next ? "Routing preference updated to avoid crowd congestion." : "Standard routing congestion preference selected.");
      return next;
    });
  };

  return (
    <AccessibilityContext.Provider
      value={{
        largeFont,
        highContrast,
        stepFreePreferred,
        avoidCrowdsPreferred,
        announcements,
        addAnnouncement,
        toggleLargeFont,
        toggleHighContrast,
        toggleStepFree,
        toggleAvoidCrowds,
      }}
    >
      {children}
      {/* Hidden Live Region for Screen Readers */}
      <div 
        aria-live="assertive" 
        className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden clip-rect-0 border-0"
      >
        {announcements[announcements.length - 1]}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
