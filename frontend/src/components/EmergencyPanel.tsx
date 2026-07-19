'use client';

import React from 'react';
import { AlertOctagon, Phone, Shield, Landmark, ArrowRight } from 'lucide-react';

interface EmergencyPanelProps {
  onClose?: () => void;
  evacuationRoute?: {
    totalDistance: number;
    totalDurationMinutes: number;
    directions: string[];
  } | null;
  evacuationExits?: { id: string; name: string }[];
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({ 
  onClose,
  evacuationRoute,
  evacuationExits = [
    { id: 'G_A', name: 'Gate A (Accessible Main Exit)' },
    { id: 'G_B', name: 'Gate B (North Exit)' },
    { id: 'G_C', name: 'Gate C (East Exit)' },
    { id: 'G_D', name: 'Gate D (South Exit)' }
  ]
}) => {
  return (
    <div 
      role="alertdialog" 
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-description"
      className="fixed inset-0 z-50 bg-[#800000]/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-[#0c0d10] border-4 border-[#ff3b30] rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(255,59,48,0.5)] overflow-hidden animate-pulse-slow">
        {/* Header flashing */}
        <div className="bg-[#ff3b30] text-black px-6 py-4 flex items-center gap-3 font-bold font-title text-xl">
          <AlertOctagon className="h-7 w-7 animate-bounce" aria-hidden="true" />
          <h2 id="emergency-title" className="tracking-wide">CRITICAL SOS EVACUATION</h2>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div id="emergency-description" className="space-y-4">
            <p className="text-[#ff3b30] text-lg font-bold">
              An active emergency mode has been triggered for Estadio Azteca / MetLife Stadium 2026.
            </p>
            <p className="text-white text-base leading-relaxed bg-[#ff3b30]/10 border border-[#ff3b30]/40 p-4 rounded-xl">
              <strong>Official Evacuation Rules:</strong> Please walk calmly. Do NOT run. Do NOT use elevators. Check the illuminated green exit signs above all corridors and follow the path to the closest Gate. Emergency volunteers are ready to assist you along all routes.
            </p>
          </div>

          {/* Quick exits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/20 rounded-xl p-4 bg-white/5">
              <span className="text-fifa-accent font-semibold block mb-2 font-title flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Recommended Evacuation Exits
              </span>
              <ul className="space-y-2 text-sm text-gray-200">
                {evacuationExits.map(gate => (
                  <li key={gate.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ff3b30] rounded-full" />
                    {gate.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/20 rounded-xl p-4 bg-white/5">
              <span className="text-fifa-accent font-semibold block mb-2 font-title flex items-center gap-2">
                <Phone className="h-4 w-4" /> Emergency Contacts
              </span>
              <div className="space-y-3">
                <a 
                  href="tel:911" 
                  className="flex items-center justify-between bg-[#ff3b30]/20 hover:bg-[#ff3b30]/40 text-[#ff3b30] border border-[#ff3b30] px-4 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none"
                >
                  <span>Medical / Fire (911)</span>
                  <Phone className="h-4 w-4" />
                </a>
                <a 
                  href="tel:555-02026" 
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none"
                >
                  <span>Stadium Command Center</span>
                  <Shield className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Calculated Path if user has active route */}
          {evacuationRoute && (
            <div className="border border-[#ff3b30]/30 rounded-xl p-4 bg-[#ff3b30]/5 space-y-3">
              <span className="text-white font-bold block font-title">Your Evacuation Route:</span>
              <div className="text-xs text-gray-300 flex gap-4">
                <span><strong>Evac Distance:</strong> {evacuationRoute.totalDistance}m</span>
                <span><strong>Evac Duration:</strong> {evacuationRoute.totalDurationMinutes} mins</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-200 font-sans">
                {evacuationRoute.directions.map((dir, idx) => (
                  <li key={idx}>{dir}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white hover:bg-gray-200 text-black py-3 rounded-xl font-bold font-title tracking-wider transition-all focus:outline-none shadow-md"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EmergencyPanel;
