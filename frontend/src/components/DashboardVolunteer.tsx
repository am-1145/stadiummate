'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, ShieldAlert, Plus, ShieldCheck, HelpCircle } from 'lucide-react';

interface Incident {
  id: string;
  type: string;
  nodeId: string;
  nodeName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'resolved';
  volunteerName?: string;
  createdAt: string;
}

interface QueueStat {
  id: string;
  name: string;
  type: string;
  density: string;
  queueTimeSeconds: number;
}

interface DashboardVolunteerProps {
  apiBase: string;
}

export const DashboardVolunteer: React.FC<DashboardVolunteerProps> = ({ apiBase }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStat[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);
  const [volunteerName, setVolunteerName] = useState('Volunteer Stew');
  const [loading, setLoading] = useState(true);

  // New incident form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('medical');
  const [formNodeId, setFormNodeId] = useState('SEC_101');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${apiBase}/api/volunteer/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents);
        setQueueStats(data.queueStats);
        setResolvedCount(data.resolvedIncidentsCount);
        setIsEmergency(data.isEmergencyMode);
      }
    } catch (err) {
      console.error('Error fetching volunteer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'assigned' | 'resolved') => {
    try {
      const res = await fetch(`${apiBase}/api/volunteer/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          volunteerName: newStatus === 'assigned' ? volunteerName : undefined
        })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error updating incident:', err);
    }
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription) return;

    try {
      const res = await fetch(`${apiBase}/api/volunteer/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          nodeId: formNodeId,
          description: formDescription,
          severity: formSeverity
        })
      });
      if (res.ok) {
        setFormDescription('');
        setShowForm(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error reporting incident:', err);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'low': return 'bg-gray-800 text-gray-400 border border-gray-700';
      case 'medium': return 'bg-yellow-950/40 text-fifa-accent border border-fifa-accent/40';
      case 'high': return 'bg-orange-950/40 text-orange-400 border border-orange-800';
      case 'critical': return 'bg-red-950/40 text-red-400 border border-red-800 animate-pulse';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'medical': return <ShieldAlert className="text-red-500 h-5 w-5" />;
      case 'cleaning': return <Clock className="text-yellow-500 h-5 w-5" />;
      default: return <HelpCircle className="text-fifa-primary h-5 w-5" />;
    }
  };

  return (
    <section 
      aria-label="Volunteer Incident Dashboard" 
      className="glass-card rounded-2xl p-6 border border-fifa-border/40 shadow-glass flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-title text-white flex items-center gap-2">
            <ShieldCheck className="text-fifa-accent h-6 w-6" /> Volunteer Support Portal
          </h2>
          <p className="text-xs text-fifa-textMuted mt-1">Manage active stadium assistance incidents & queues</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-fifa-dark/60 p-2 rounded-lg border border-fifa-border/40">
            <span className="text-fifa-textMuted font-semibold">Steward Profile:</span>
            <input 
              type="text" 
              value={volunteerName} 
              onChange={(e) => setVolunteerName(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-fifa-accent font-bold text-xs w-28"
            />
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-fifa-primary hover:bg-fifa-primary/80 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all focus:outline-none"
          >
            <Plus className="h-4 w-4" /> Report Issue
          </button>
        </div>
      </div>

      {isEmergency && (
        <div className="bg-red-950/40 border border-red-800 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <AlertCircle className="h-6 w-6 flex-shrink-0" />
          <div>
            <span className="font-bold font-title text-sm block">EMERGENCY ACTIVATED</span>
            <span className="text-xs">Evacuate spectators safely to Gates A, B, C, D immediately. Assist disabled fans.</span>
          </div>
        </div>
      )}

      {/* Report Form Popup */}
      {showForm && (
        <form onSubmit={handleSubmitIncident} className="bg-fifa-dark/80 p-5 rounded-xl border border-fifa-border/60 space-y-4 animate-fade-in">
          <h3 className="font-bold text-white font-title text-sm">Create New Incident Dispatch</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-fifa-textMuted block mb-1">Incident Type</label>
              <select 
                value={formType} 
                onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2 text-xs text-white"
              >
                <option value="medical">Medical Assistance</option>
                <option value="cleaning">Cleaning Request</option>
                <option value="queue">Queue Control</option>
                <option value="lost_found">Lost & Found</option>
                <option value="navigation">Navigation Assistance</option>
                <option value="language_assist">Language Translation</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-fifa-textMuted block mb-1">Stadium Location Node</label>
              <select 
                value={formNodeId} 
                onChange={(e) => setFormNodeId(e.target.value)}
                className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2 text-xs text-white"
              >
                <option value="SEC_101">Section 101</option>
                <option value="SEC_102">Section 102</option>
                <option value="SEC_103">Section 103</option>
                <option value="SEC_104">Section 104</option>
                <option value="G_A">Gate A</option>
                <option value="G_C">Gate C</option>
                <option value="W_L1_ACC">Washroom L1-A</option>
                <option value="W_L1_STD">Washroom L1-B</option>
                <option value="T_METRO">Metro Station</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-fifa-textMuted block mb-1">Severity</label>
              <select 
                value={formSeverity} 
                onChange={(e) => setFormSeverity(e.target.value as any)}
                className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2 text-xs text-white"
              >
                <option value="low">Low (Minor Cleanup/Lost & Found)</option>
                <option value="medium">Medium (Crowding/General Help)</option>
                <option value="high">High (Injury/Heat Exhaustion)</option>
                <option value="critical">Critical SOS (Severe Medical/Security)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-fifa-textMuted block mb-1">Incident Description</label>
            <input 
              type="text" 
              value={formDescription} 
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Broken handrail or spectator needs wheelchair helper..."
              className="w-full bg-fifa-card border border-fifa-border rounded-lg p-2 text-xs text-white focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-fifa-textMuted hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-fifa-accent hover:bg-fifa-accent/80 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
            >
              Submit Dispatch
            </button>
          </div>
        </form>
      )}

      {/* Incidents Table & Queues grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Incidents List (Col 2 span) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-white text-sm font-title flex items-center gap-2">
            Active Dispatches ({incidents.length})
            <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 px-2 py-0.5 rounded-full font-bold">
              {resolvedCount} Resolved Today
            </span>
          </h3>

          {loading ? (
            <div className="text-center py-8 text-fifa-textMuted text-xs">Loading incident registry...</div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-fifa-border/40 rounded-xl text-fifa-textMuted text-xs flex flex-col items-center justify-center gap-2">
              <CheckCircle className="text-fifa-green h-8 w-8 opacity-40" />
              All quiet! No active volunteer assistance dispatches reported.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="bg-fifa-dark/50 border border-fifa-border/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-fifa-border/70 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getIncidentIcon(incident.type)}
                      <span className="font-bold text-xs text-white font-title">{incident.nodeName}</span>
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans">{incident.description}</p>
                    <span className="text-[9px] text-fifa-textMuted block">
                      Reported: {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {incident.volunteerName && (
                      <span className="text-[10px] text-fifa-accent font-semibold block">
                        Assigned: {incident.volunteerName}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {incident.status === 'pending' ? (
                      <button
                        onClick={() => handleUpdateStatus(incident.id, 'assigned')}
                        className="flex-1 sm:flex-none bg-fifa-primary hover:bg-fifa-primary/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all focus:outline-none"
                      >
                        Assign to Me
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(incident.id, 'resolved')}
                        className="flex-1 sm:flex-none bg-fifa-green/20 hover:bg-fifa-green/40 text-fifa-green border border-fifa-green/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-all focus:outline-none"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Queues (Col 1 span) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white text-sm font-title">POI Queue Status</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {queueStats.map((stat) => (
              <div key={stat.id} className="bg-fifa-dark/30 border border-fifa-border/30 rounded-xl p-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block truncate w-32 font-title">{stat.name}</span>
                  <span className="text-[10px] text-fifa-textMuted capitalize">{stat.type}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold block ${
                    stat.density === 'Very High' ? 'text-red-500' : stat.density === 'High' ? 'text-orange-400' : 'text-fifa-green'
                  }`}>
                    ~{Math.round(stat.queueTimeSeconds / 60)} mins
                  </span>
                  <span className="text-[10px] text-fifa-textMuted capitalize">{stat.density.toLowerCase()} crowd</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
export default DashboardVolunteer;
