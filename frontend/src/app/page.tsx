'use client';

import React, { useState, useEffect } from 'react';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { Navbar } from '../components/Navbar';
import { AccessibilitySettings } from '../components/AccessibilitySettings';
import { ChatInterface } from '../components/ChatInterface';
import { InteractiveMap } from '../components/InteractiveMap';
import { DashboardVolunteer } from '../components/DashboardVolunteer';
import { DashboardOrganizer } from '../components/DashboardOrganizer';
import { EmergencyPanel } from '../components/EmergencyPanel';
import { Landmark, ShieldAlert, Award, Volume2, Info, Navigation, Accessibility } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'fan' | 'volunteer' | 'organizer'>('fan');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [densities, setDensities] = useState<Record<string, any>>({});
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  
  // States to pass from Map click into Chat Companion
  const [chatFromNodeId, setChatFromNodeId] = useState<string>('SEC_101');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch stadium state from the Express backend
  const fetchStadiumState = async () => {
    try {
      const res = await fetch(`${apiBase}/api/stadium/state`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes);
        setEdges(data.edges);
        setDensities(data.densities);
        setBroadcasts(data.broadcasts);
        setIsEmergency(data.isEmergencyMode);
        if (data.isEmergencyMode) {
          setShowEmergencyPanel(true);
        }
      }
    } catch (err) {
      console.error('Error contacting Express server:', err);
    }
  };

  useEffect(() => {
    fetchStadiumState();
    const interval = setInterval(fetchStadiumState, 4000); // refresh every 4s
    return () => clearInterval(interval);
  }, []);

  const handleSelectNodeFromMap = (nodeId: string, role: 'from' | 'to') => {
    if (role === 'from') {
      setChatFromNodeId(nodeId);
    } else {
      // Find destination node name
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        // Trigger a custom chat route message
        const chatInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (chatInput) {
          chatInput.value = `Take me to ${node.name}`;
          // Set focus so user can hit enter
          chatInput.focus();
        }
      }
    }
  };

  const handleResetStadiumState = () => {
    fetchStadiumState();
    setActiveRoute(null);
    setShowEmergencyPanel(false);
  };

  return (
    <AccessibilityProvider>
      <div className="min-h-screen bg-[#080a0f] text-fifa-text flex flex-col font-sans">
        
        {/* Navbar */}
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          broadcasts={broadcasts}
          isEmergency={isEmergency}
          onEmergencyClick={() => setShowEmergencyPanel(true)}
        />

        {/* Global Urgent Warning Ticker for Warning level alerts */}
        {broadcasts.length > 0 && broadcasts[0].type === 'warning' && !isEmergency && (
          <div 
            role="alert" 
            className="bg-[#f2a900] text-black px-4 py-2 text-center text-xs font-extrabold flex items-center justify-center gap-2 animate-pulse"
          >
            <Volume2 className="h-4.5 w-4.5 animate-bounce" />
            <span>ADVISORY: {broadcasts[0].message}</span>
          </div>
        )}

        {/* Main Grid View */}
        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {activeTab === 'fan' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Chat and Accessibility Pane (5 cols span) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Chat Companion */}
                <ChatInterface 
                  apiBase={apiBase} 
                  fromNodeId={chatFromNodeId} 
                  onCalculatedRoute={(route) => setActiveRoute(route)}
                  onEmergencyDetected={() => {
                    setIsEmergency(true);
                    setShowEmergencyPanel(true);
                  }}
                />

                {/* Accessibility Pane */}
                <AccessibilitySettings />
              </div>

              {/* Right Column: Interactive Map (7 cols span) */}
              <div className="lg:col-span-7 h-full">
                <InteractiveMap 
                  nodes={nodes} 
                  edges={edges} 
                  densities={densities} 
                  activeRoute={activeRoute}
                  onSelectNode={handleSelectNodeFromMap}
                />
              </div>

            </div>
          )}

          {activeTab === 'volunteer' && (
            <div className="space-y-6">
              <DashboardVolunteer apiBase={apiBase} />
            </div>
          )}

          {activeTab === 'organizer' && (
            <div className="space-y-6">
              <DashboardOrganizer 
                apiBase={apiBase} 
                onEmergencyTriggered={() => {
                  setIsEmergency(true);
                  setShowEmergencyPanel(true);
                }}
                onResetStadium={handleResetStadiumState}
              />
            </div>
          )}

        </main>

        {/* Emergency SOS Evacuation Modal Panel */}
        {showEmergencyPanel && (
          <EmergencyPanel 
            onClose={() => {
              // If it's a general evacuation, keep emergency mode active in memory, but hide modal if requested
              setShowEmergencyPanel(false);
            }} 
            evacuationRoute={activeRoute}
            evacuationExits={
              nodes.length > 0 
                ? nodes.filter(n => n.type === 'gate').map(n => ({ id: n.id, name: n.name }))
                : undefined
            }
          />
        )}

        {/* Footer */}
        <footer className="bg-fifa-dark border-t border-fifa-border/40 py-6 mt-12 text-center text-xs text-fifa-textMuted select-none">
          <p>© FIFA World Cup 2026 Hackathon Presentation - StadiumMate Operations Engine.</p>
          <p className="mt-1">Built with Clean Architecture, Zod Validation, and rules-based Gemini API conversion layers.</p>
        </footer>

      </div>
    </AccessibilityProvider>
  );
}
