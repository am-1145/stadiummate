'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Users, Volume2, ShieldAlert, Award, Star, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  crowdTrends: { time: string; gateArrivals: number; seatOccupancy: number }[];
  heavyCongestionCount: number;
  incidentBreakdown: Record<string, number>;
  activeAlertsCount: number;
  satisfactionRate: number;
  incidentResolutionRate: number;
  isEmergencyMode: boolean;
}

interface DashboardOrganizerProps {
  apiBase: string;
  onEmergencyTriggered?: () => void;
  onResetStadium?: () => void;
}

export const DashboardOrganizer: React.FC<DashboardOrganizerProps> = ({ 
  apiBase, 
  onEmergencyTriggered,
  onResetStadium 
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'emergency'>('info');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${apiBase}/api/organizer/analytics`);
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
        if (stats.isEmergencyMode && onEmergencyTriggered) {
          onEmergencyTriggered();
        }
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 6000); // refresh every 6s
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg) return;

    try {
      const res = await fetch(`${apiBase}/api/organizer/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: broadcastMsg,
          type: broadcastType
        })
      });
      if (res.ok) {
        setBroadcastMsg('');
        fetchAnalytics();
        if (broadcastType === 'emergency' && onEmergencyTriggered) {
          onEmergencyTriggered();
        }
      }
    } catch (err) {
      console.error('Error broadcasting alert:', err);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${apiBase}/api/stadium/reset`, { method: 'POST' });
      if (res.ok) {
        fetchAnalytics();
        if (onResetStadium) {
          onResetStadium();
        }
      }
    } catch (err) {
      console.error('Error resetting stadium state:', err);
    }
  };

  if (loading || !data) {
    return <div className="text-center py-12 text-fifa-textMuted text-xs">Loading organizer intelligence suite...</div>;
  }

  // Format incident breakdown data for Recharts bar chart
  const barChartData = [
    { name: 'Medical', count: data.incidentBreakdown.medical || 0 },
    { name: 'Cleaning', count: data.incidentBreakdown.cleaning || 0 },
    { name: 'Queues', count: data.incidentBreakdown.queue || 0 },
    { name: 'Lost/Found', count: data.incidentBreakdown.lost_found || 0 },
    { name: 'Navigation', count: data.incidentBreakdown.navigation || 0 },
    { name: 'Language', count: data.incidentBreakdown.language_assist || 0 }
  ];

  return (
    <section 
      aria-label="Organizer Analytics Dashboard" 
      className="glass-card rounded-2xl p-6 border border-fifa-border/40 shadow-glass flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-title text-white flex items-center gap-2">
            <BarChart3 className="text-fifa-accent h-6 w-6" /> Organizer Intelligence & Analytics
          </h2>
          <p className="text-xs text-fifa-textMuted mt-1">FIFA operations, crowd flow trends, and emergency broadcasts</p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 bg-fifa-card hover:bg-fifa-border text-white border border-fifa-border/60 text-xs font-bold px-3 py-2 rounded-lg transition-all focus:outline-none"
        >
          <RefreshCw className="h-4 w-4" /> Reset Simulation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-fifa-dark/50 border border-fifa-border/30 rounded-xl p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-fifa-primary" />
          <div>
            <span className="text-[10px] text-fifa-textMuted block uppercase font-bold tracking-wider">Gate Congestion</span>
            <span className="text-lg font-bold text-white font-title">{data.heavyCongestionCount} Critical Zones</span>
          </div>
        </div>

        <div className="bg-fifa-dark/50 border border-fifa-border/30 rounded-xl p-4 flex items-center gap-3">
          <Star className="h-8 w-8 text-fifa-accent" />
          <div>
            <span className="text-[10px] text-fifa-textMuted block uppercase font-bold tracking-wider">Fan Satisfaction</span>
            <span className="text-lg font-bold text-white font-title">{data.satisfactionRate} / 5.0 Rating</span>
          </div>
        </div>

        <div className="bg-fifa-dark/50 border border-fifa-border/30 rounded-xl p-4 flex items-center gap-3">
          <Award className="h-8 w-8 text-fifa-green" />
          <div>
            <span className="text-[10px] text-fifa-textMuted block uppercase font-bold tracking-wider">Resolution Rate</span>
            <span className="text-lg font-bold text-white font-title">{data.incidentResolutionRate}% Resolved</span>
          </div>
        </div>

        <div className="bg-fifa-dark/50 border border-fifa-border/30 rounded-xl p-4 flex items-center gap-3">
          <Volume2 className="h-8 w-8 text-[#ff3b30]" />
          <div>
            <span className="text-[10px] text-fifa-textMuted block uppercase font-bold tracking-wider">Active Broadcasts</span>
            <span className="text-lg font-bold text-white font-title">{data.activeAlertsCount} Broadcasted</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Crowd flow area chart */}
        <div className="bg-fifa-dark/30 border border-fifa-border/30 p-4 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white font-title">Crowd Arrival Trends & Seating Occupancy</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.crowdTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="arrivalsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1063e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1063e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3346" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#161b26', borderColor: '#2a3346', color: '#fff' }} />
                <Area type="monotone" dataKey="gateArrivals" name="Gate Scans" stroke="#1063e5" fillOpacity={1} fill="url(#arrivalsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents breakdown bar chart */}
        <div className="bg-fifa-dark/30 border border-fifa-border/30 p-4 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white font-title">Operational Incidents by Category</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3346" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#161b26', borderColor: '#2a3346', color: '#fff' }} />
                <Bar dataKey="count" name="Dispatches" fill="#f2a900" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Broadcast System */}
      <div className="bg-fifa-dark/50 border border-[#ff3b30]/20 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white font-title flex items-center gap-2">
          <Volume2 className="text-[#ff3b30] h-5 w-5" /> Broadcast Public Announcement Alert
        </h3>
        
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-fifa-textMuted block mb-1">Alert Message</label>
              <input 
                type="text"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="e.g. Turnstiles at Gate C are now clear. Spectators are advised to distribute evenly..."
                className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-fifa-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs text-fifa-textMuted block mb-1">Broadcasting Severity</label>
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value as any)}
                className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2.5 text-xs text-white"
              >
                <option value="info">General Info (Blue notification banner)</option>
                <option value="warning">Warning alert (Yellow advisory bar)</option>
                <option value="emergency">CRITICAL EMERGENCY (Red panel & active evacuation)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-6 py-2 rounded-lg font-bold text-xs transition-all focus:outline-none ${
                broadcastType === 'emergency' 
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                  : 'bg-fifa-accent hover:bg-fifa-accent/80 text-black'
              }`}
            >
              {broadcastType === 'emergency' && <ShieldAlert className="h-4 w-4" />}
              Transmit Broadcast Announcement
            </button>
          </div>
        </form>
      </div>

    </section>
  );
};
export default DashboardOrganizer;
