'use client';

import React from 'react';
import { Landmark, ShieldAlert, Award, Volume2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'fan' | 'volunteer' | 'organizer';
  setActiveTab: (tab: 'fan' | 'volunteer' | 'organizer') => void;
  broadcasts?: { id: string; message: string; type: string }[];
  isEmergency: boolean;
  onEmergencyClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  broadcasts = [],
  isEmergency,
  onEmergencyClick
}) => {
  const activeAlert = broadcasts.length > 0 ? broadcasts[0] : null;

  return (
    <header className="bg-fifa-card/85 border-b border-fifa-border/60 sticky top-0 z-40 backdrop-blur-md shadow-md select-none">
      
      {/* Skip Navigation Link for Keyboard Users */}
      <a href="#main-content" className="skip-link font-bold focus:outline-none">
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-fifa-primary p-2 rounded-xl border border-fifa-primary/60">
            <Landmark className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-extrabold font-title tracking-wide text-white flex items-center gap-1.5 leading-none">
              StadiumMate
              <span className="text-[9px] bg-fifa-accent/20 text-fifa-accent px-1.5 py-0.5 rounded font-bold border border-fifa-accent/30 uppercase tracking-widest">
                FIFA 26
              </span>
            </h1>
            <span className="text-[9px] text-fifa-textMuted font-medium tracking-tight">The Intelligent Stadium Companion</span>
          </div>
        </div>

        {/* Tab Switches (Fan vs Volunteer vs Organizer) */}
        <nav className="hidden md:flex gap-1.5 bg-fifa-dark/80 p-1 rounded-xl border border-fifa-border/40" aria-label="Main Navigation Panels">
          <button
            onClick={() => setActiveTab('fan')}
            aria-current={activeTab === 'fan' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none ${
              activeTab === 'fan' 
                ? 'bg-fifa-primary text-white shadow' 
                : 'text-fifa-textMuted hover:text-white'
            }`}
          >
            Fan Companion
          </button>
          <button
            onClick={() => setActiveTab('volunteer')}
            aria-current={activeTab === 'volunteer' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none ${
              activeTab === 'volunteer' 
                ? 'bg-fifa-primary text-white shadow' 
                : 'text-fifa-textMuted hover:text-white'
            }`}
          >
            Volunteer Dashboard
          </button>
          <button
            onClick={() => setActiveTab('organizer')}
            aria-current={activeTab === 'organizer' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none ${
              activeTab === 'organizer' 
                ? 'bg-fifa-primary text-white shadow' 
                : 'text-fifa-textMuted hover:text-white'
            }`}
          >
            Organizer Console
          </button>
        </nav>

        {/* Dynamic Broadcast Alerts Ticker */}
        {activeAlert && !isEmergency && (
          <div className="hidden lg:flex items-center gap-2 bg-[#ff3b30]/10 border border-[#ff3b30]/30 rounded-xl px-4 py-1.5 max-w-sm flex-1 animate-pulse-slow">
            <Volume2 className="h-4.5 w-4.5 text-[#ff3b30] flex-shrink-0" />
            <p className="text-[10px] text-gray-200 font-semibold truncate leading-normal">
              {activeAlert.message}
            </p>
          </div>
        )}

        {/* SOS Emergency / Actions block */}
        <div className="flex items-center gap-3">
          {/* Dashboard Tabs for mobile (dropdown/icons) */}
          <div className="flex md:hidden gap-1 bg-fifa-dark/80 p-1 rounded-xl border border-fifa-border/40">
            <button
              onClick={() => setActiveTab('fan')}
              className={`p-2 rounded-lg text-[10px] font-bold ${
                activeTab === 'fan' ? 'bg-fifa-primary text-white' : 'text-fifa-textMuted'
              }`}
              aria-label="Fan Companion"
            >
              Fan
            </button>
            <button
              onClick={() => setActiveTab('volunteer')}
              className={`p-2 rounded-lg text-[10px] font-bold ${
                activeTab === 'volunteer' ? 'bg-fifa-primary text-white' : 'text-fifa-textMuted'
              }`}
              aria-label="Volunteer Portal"
            >
              Staff
            </button>
          </div>

          <button
            onClick={onEmergencyClick}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide uppercase shadow-lg transition-all focus:outline-none ${
              isEmergency 
                ? 'bg-[#ff3b30] hover:bg-[#ff3b30]/90 text-white animate-pulse shadow-[0_0_20px_rgba(255,59,48,0.5)]' 
                : 'bg-red-700 hover:bg-red-600 text-white shadow-red-950/20'
            }`}
          >
            <ShieldAlert className="h-4 w-4 animate-bounce" />
            <span>{isEmergency ? 'SOS Evac Path' : 'SOS Emergency'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
