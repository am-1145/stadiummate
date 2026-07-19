'use client';

import React, { useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { MapPin, Navigation, Navigation2, Flame } from 'lucide-react';

interface MapNode {
  id: string;
  name: string;
  type: string;
  level: number;
  isAccessible: boolean;
  x: number;
  y: number;
  metadata: {
    description: string;
    details?: string;
    queueTimeSeconds?: number;
    languages?: string[];
  };
}

interface MapEdge {
  from: string;
  to: string;
  distance: number;
  isStepFree: boolean;
}

interface InteractiveMapProps {
  nodes: MapNode[];
  edges: MapEdge[];
  densities: Record<string, 'Low' | 'Medium' | 'High' | 'Very High'>;
  activeRoute: { path: MapNode[] } | null;
  onSelectNode: (nodeId: string, role: 'from' | 'to') => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  nodes,
  edges,
  densities,
  activeRoute,
  onSelectNode
}) => {
  const { stepFreePreferred } = useAccessibility();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');

  // Filter nodes by level
  const visibleNodes = nodes.filter(n => filterLevel === 'all' || n.level === filterLevel);

  // Get density color helper
  const getDensityColor = (nodeId: string) => {
    const density = densities[nodeId] || 'Low';
    switch (density) {
      case 'Low': return 'rgba(16, 203, 136, 0.4)';      // green
      case 'Medium': return 'rgba(242, 169, 0, 0.5)';    // yellow/gold
      case 'High': return 'rgba(229, 44, 80, 0.6)';       // red
      case 'Very High': return 'rgba(180, 0, 40, 0.8)';  // deep crimson
    }
  };

  const getDensityStroke = (nodeId: string) => {
    const density = densities[nodeId] || 'Low';
    switch (density) {
      case 'Low': return '#00cc88';
      case 'Medium': return '#f2a900';
      case 'High': return '#e52c50';
      case 'Very High': return '#b40028';
    }
  };

  const getPulseClass = (nodeId: string) => {
    const density = densities[nodeId] || 'Low';
    switch (density) {
      case 'Low': return 'pulse-low';
      case 'Medium': return 'pulse-medium';
      case 'High': return 'pulse-high';
      case 'Very High': return 'pulse-critical';
    }
  };

  // Check if a node is in the active route
  const isNodeInRoute = (nodeId: string) => {
    if (!activeRoute) return false;
    return activeRoute.path.some(n => n.id === nodeId);
  };

  // Build SVG path for the active route line
  const renderRouteLine = () => {
    if (!activeRoute || activeRoute.path.length < 2) return null;
    let pathString = '';
    
    activeRoute.path.forEach((node, idx) => {
      const x = node.x;
      const y = node.y;
      if (idx === 0) {
        pathString += `M ${x * 8} ${y * 6}`;
      } else {
        pathString += ` L ${x * 8} ${y * 6}`;
      }
    });

    return (
      <path
        d={pathString}
        fill="none"
        stroke="#1063e5"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[dash_2s_linear_infinite] stroke-dasharray-[12]"
        aria-hidden="true"
      />
    );
  };

  return (
    <section 
      aria-label="Stadium Map Viewer" 
      className="glass-card rounded-2xl p-6 border border-fifa-border/40 shadow-glass flex flex-col h-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-title tracking-wide text-white flex items-center gap-2">
            <Navigation2 className="text-fifa-accent h-6 w-6 transform rotate-45" /> Stadium Map Viewer
          </h2>
          <p className="text-xs text-fifa-textMuted mt-1">Live crowd density & active navigation tracks</p>
        </div>
        
        {/* Level Filters */}
        <div className="flex gap-2 bg-fifa-dark/60 p-1 rounded-lg border border-fifa-border/40">
          {['all', 0, 1, 2, 3].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl as any)}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                filterLevel === lvl 
                  ? 'bg-fifa-primary text-white' 
                  : 'text-fifa-textMuted hover:text-white'
              }`}
              aria-label={lvl === 'all' ? 'Show all levels' : `Level ${lvl}`}
            >
              {lvl === 'all' ? 'All' : `L${lvl}`}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative bg-fifa-dark/80 rounded-xl border border-fifa-border/40 flex-1 overflow-hidden min-h-[350px] aspect-[4/3] flex items-center justify-center">
        <svg 
          viewBox="0 0 800 600" 
          className="w-full h-full p-4 select-none"
          role="img"
          aria-label="Interactive map representation of stadium. Contains seating sections, concessions, medical bays, washrooms, and gates."
        >
          {/* Base Arena background ring */}
          <ellipse cx="400" cy="300" rx="320" ry="240" fill="none" stroke="#2a3346" strokeWidth="2" strokeDasharray="10 10" />
          <ellipse cx="400" cy="300" rx="240" ry="180" fill="none" stroke="#2a3346" strokeWidth="2" />
          <rect x="280" y="210" width="240" height="180" fill="#1b2b20" stroke="#2a3346" strokeWidth="3" rx="10" />
          <text x="400" y="305" fill="rgba(255,255,255,0.15)" fontSize="20" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">
            FIFA 2026 FIELD
          </text>

          {/* Render general edges first as gray background lines */}
          {edges.map((edge, idx) => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            
            // Check level filtering
            if (filterLevel !== 'all' && (fromNode.level !== filterLevel || toNode.level !== filterLevel)) {
              return null;
            }

            if (stepFreePreferred && !edge.isStepFree) {
              return null; // hide stairs / step paths in accessibility mode
            }

            return (
              <line
                key={idx}
                x1={fromNode.x * 8}
                y1={fromNode.y * 6}
                x2={toNode.x * 8}
                y2={toNode.y * 6}
                stroke={isNodeInRoute(fromNode.id) && isNodeInRoute(toNode.id) ? '#1063e5' : '#2a3346'}
                strokeWidth={isNodeInRoute(fromNode.id) && isNodeInRoute(toNode.id) ? '4' : '2'}
                strokeOpacity={isNodeInRoute(fromNode.id) && isNodeInRoute(toNode.id) ? '1' : '0.4'}
              />
            );
          })}

          {/* Render calculated path overlay */}
          {renderRouteLine()}

          {/* Render Heatmap and Node dots */}
          {visibleNodes.map((node) => {
            const density = densities[node.id] || 'Low';
            const color = getDensityColor(node.id);
            const strokeColor = getDensityStroke(node.id);
            const isSelected = selectedNode?.id === node.id;
            const isRouteNode = isNodeInRoute(node.id);

            return (
              <g 
                key={node.id} 
                transform={`translate(${node.x * 8}, ${node.y * 6})`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedNode(node);
                  }
                }}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group focus:outline-none"
                role="button"
                aria-label={`${node.name}, Level ${node.level}, Accessibility: ${node.isAccessible ? 'Yes' : 'No'}, Crowd Density: ${density}`}
              >
                {/* Glowing heatmap circle */}
                <circle
                  cx="0"
                  cy="0"
                  r={density === 'Very High' ? 24 : density === 'High' ? 18 : 12}
                  fill={color}
                  className={getPulseClass(node.id)}
                />
                
                {/* Core node dot */}
                <circle
                  cx="0"
                  cy="0"
                  r={isSelected ? 9 : 6}
                  fill={isRouteNode ? '#1063e5' : isSelected ? '#f2a900' : '#ffffff'}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  className="transition-all"
                />

                {/* Node initials label */}
                <text
                  y="-12"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="600"
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-black p-1 pointer-events-none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected POI Details popup overlay */}
        {selectedNode && (
          <div 
            className="absolute bottom-4 left-4 right-4 bg-fifa-card/95 border border-fifa-border rounded-xl p-4 shadow-glass backdrop-blur-md animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            role="dialog"
            aria-labelledby="poi-title"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  selectedNode.isAccessible ? 'bg-fifa-green' : 'bg-red-500'
                }`} />
                <h3 id="poi-title" className="text-sm font-bold text-white font-title">{selectedNode.name}</h3>
                <span className="text-[10px] bg-fifa-border px-2 py-0.5 rounded text-fifa-textMuted font-semibold">
                  Lvl {selectedNode.level}
                </span>
                {densities[selectedNode.id] === 'High' && (
                  <span className="flex items-center gap-0.5 text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold">
                    <Flame className="h-3 w-3" /> Busy
                  </span>
                )}
              </div>
              <p className="text-xs text-fifa-textMuted mt-1">{selectedNode.metadata.description}</p>
              
              <div className="flex gap-4 mt-2 text-[10px] text-fifa-textMuted">
                {selectedNode.metadata.queueTimeSeconds !== undefined && (
                  <span><strong>Queue time:</strong> ~{Math.round(selectedNode.metadata.queueTimeSeconds / 60)} mins</span>
                )}
                {selectedNode.metadata.languages && (
                  <span><strong>Languages:</strong> {selectedNode.metadata.languages.join(', ')}</span>
                )}
                <span><strong>Accessible:</strong> {selectedNode.isAccessible ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  onSelectNode(selectedNode.id, 'from');
                  setSelectedNode(null);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-fifa-dark hover:bg-fifa-border text-white border border-fifa-border px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none"
              >
                From Here
              </button>
              <button
                onClick={() => {
                  onSelectNode(selectedNode.id, 'to');
                  setSelectedNode(null);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-fifa-primary hover:bg-fifa-primary/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none"
              >
                <Navigation className="h-3 w-3" /> Route To
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-2.5 py-1.5 text-xs text-fifa-textMuted hover:text-white transition-colors"
                aria-label="Close details"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
export default InteractiveMap;
