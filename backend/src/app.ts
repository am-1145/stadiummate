import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimiter, validateBody, detectPromptInjection, ChatRequestSchema, RouteRequestSchema, IncidentReportSchema, IncidentUpdateSchema, AdminOverrideSchema, sanitizeObject } from './middleware/security';
import { findRoute, getNearestFacility, RouteResult } from './engine/routing';
import { STADIUM_NODES, STADIUM_EDGES, StadiumNode } from './engine/stadiumData';
import crowdSimulator, { DensityLevel } from './engine/crowdSim';
import geminiService from './services/geminiService';

export const app = express();
app.set('trust proxy', 1); // Trust the reverse proxy to properly parse X-Forwarded-For

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For hackathon flexibility. Change to specific origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Apply global rate limiting to all /api routes
app.use('/api', apiRateLimiter);

// In-memory Stores
export interface Incident {
  id: string;
  type: 'medical' | 'cleaning' | 'queue' | 'lost_found' | 'navigation' | 'language_assist';
  nodeId: string;
  nodeName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'resolved';
  volunteerName?: string;
  createdAt: string;
}

let incidents: Incident[] = [
  { id: 'inc_1', type: 'medical', nodeId: 'SEC_104', nodeName: 'Section 104', description: 'Fan feeling heat exhaustion. Needs water and visual check.', severity: 'medium', status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 'inc_2', type: 'cleaning', nodeId: 'W_L1_STD', nodeName: 'Standard Washroom L1-B', description: 'Liquid spill on floor. Danger of slipping.', severity: 'low', status: 'assigned', volunteerName: 'Carlos (Steward)', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'inc_3', type: 'queue', nodeId: 'G_C', nodeName: 'Gate C', description: 'Long wait time at scanning turnstiles. Needs queue volunteer assistance.', severity: 'medium', status: 'pending', createdAt: new Date().toISOString() }
];

let broadcasts: { id: string; message: string; type: 'info' | 'warning' | 'emergency'; timestamp: string }[] = [
  { id: 'br_1', message: 'Avoid Gate C area due to entry scanning delay. General fans should use Gate A or B.', type: 'warning', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
];

let isEmergencyMode = false;

// --- ENDPOINTS ---

// 1. Chat Bot Companion endpoint (hybrid rules + Gemini NLG)
app.post('/api/chat', validateBody(ChatRequestSchema), detectPromptInjection, async (req, res) => {
  const { message, fromNodeId, accessibilityRequired = false, avoidCrowds = false } = req.body;

  try {
    // Stage 1: Classify intent
    const classification = await geminiService.classifyIntent(message);
    const intent = classification.intent;
    const params = classification.parameters;
    const detectedLang = params.language || 'English';

    // Merge parameters from request body if they are set
    const optAccessibility = accessibilityRequired || params.accessibilityRequired || false;
    const optAvoidCrowds = avoidCrowds || params.avoidCrowds || false;
    const optFromNodeId = fromNodeId || params.fromNodeId;

    let facts: any = { topic: params.faqTopic };
    let routeInfo: RouteResult | null = null;
    let fallbackText = '';

    // If emergency is triggered by chat contents or globally active
    if (intent === 'EMERGENCY' || isEmergencyMode) {
      isEmergencyMode = true;
      const responseText = await geminiService.generateResponse('EMERGENCY', {}, message, detectedLang);
      
      // Calculate evacuation path (route to nearest exit node)
      // Nearest transit or gate node
      const activeFrom = optFromNodeId || 'SEC_101';
      // Find nearest accessible or general exit
      const exitNodes = STADIUM_NODES.filter(n => n.type === 'gate');
      let bestEvacRoute: RouteResult | null = null;
      let minDistance = Infinity;

      for (const gate of exitNodes) {
        const route = findRoute(activeFrom, gate.id, { stepFreeRequired: optAccessibility });
        if (route && route.totalDistance < minDistance) {
          minDistance = route.totalDistance;
          bestEvacRoute = route;
        }
      }

      return res.json(sanitizeObject({
        response: responseText,
        intent: 'EMERGENCY',
        emergencyActivated: true,
        route: bestEvacRoute,
        evacuationExits: exitNodes.map(g => ({ id: g.id, name: g.name }))
      }));
    }

    // Stage 2: Process intent using deterministic engine
    if (intent === 'ROUTE') {
      const fromId = optFromNodeId || params.fromNodeId;
      const toId = params.toNodeId;

      if (!fromId || !toId) {
        fallbackText = detectedLang === 'Spanish'
          ? "No pude identificar sus puntos de inicio o finalización. Indique su sección y puerta o destino."
          : detectedLang === 'French'
          ? "Je n'ai pas pu identifier vos points de départ ou d'arrivée. Veuillez préciser votre section et votre porte ou destination."
          : "I could not identify your starting or ending points. Please specify your section and gate or destination.";
        
        return res.json(sanitizeObject({
          response: fallbackText,
          intent: 'CHAT',
          route: null
        }));
      }

      routeInfo = findRoute(fromId, toId, {
        stepFreeRequired: optAccessibility,
        avoidCrowds: optAvoidCrowds,
        crowdDensities: crowdSimulator.getDensities()
      });

      facts = {
        route: routeInfo,
        accessibilityRequired: optAccessibility,
        avoidCrowds: optAvoidCrowds
      };
    } else if (intent === 'FIND_FACILITY') {
      const fromId = optFromNodeId || 'G_A'; // Default starting point if not provided
      const facType = params.facilityType;

      if (!facType) {
        fallbackText = detectedLang === 'Spanish'
          ? "¿Qué tipo de instalación está buscando? (Baño, comida, asistencia médica, zona tranquila, transporte)"
          : detectedLang === 'French'
          ? "Quel type d'installation recherchez-vous ? (Toilettes, restauration, assistance médicale, zone calme, transport)"
          : "What type of facility are you looking for? (Washroom, food, medical, quiet area, transit)";

        return res.json(sanitizeObject({
          response: fallbackText,
          intent: 'CHAT',
          route: null
        }));
      }

      routeInfo = getNearestFacility(fromId, facType, {
        stepFreeRequired: optAccessibility,
        avoidCrowds: optAvoidCrowds,
        crowdDensities: crowdSimulator.getDensities()
      });

      facts = {
        route: routeInfo,
        facilityType: facType,
        accessibilityRequired: optAccessibility,
        avoidCrowds: optAvoidCrowds
      };
    } else if (intent === 'FAQ') {
      facts = {
        topic: params.faqTopic || 'permitted_items'
      };
    }

    // Stage 3: Convert facts into safe natural language text
    const responseText = await geminiService.generateResponse(intent, facts, message, detectedLang);

    res.json(sanitizeObject({
      response: responseText,
      intent: intent,
      route: routeInfo,
      detectedParameters: {
        from: optFromNodeId,
        to: params.toNodeId,
        facilityType: params.facilityType,
        accessibilityRequired: optAccessibility,
        avoidCrowds: optAvoidCrowds
      }
    }));

  } catch (error) {
    console.error("Chat engine failed:", error);
    res.status(500).json({ error: "Failed to process message safely." });
  }
});

// 2. Map & Stadium layout state
app.get('/api/stadium/state', (req, res) => {
  // Trigger simulation tick to simulate live updates
  crowdSimulator.tick();
  
  res.json(sanitizeObject({
    nodes: STADIUM_NODES,
    edges: STADIUM_EDGES,
    densities: crowdSimulator.getDensities(),
    isEmergencyMode,
    broadcasts
  }));
});

// 3. Dynamic route API
app.post('/api/stadium/route', validateBody(RouteRequestSchema), (req, res) => {
  const { from, to, accessibilityRequired = false, avoidCrowds = false } = req.body;
  
  const route = findRoute(from, to, {
    stepFreeRequired: accessibilityRequired,
    avoidCrowds: avoidCrowds,
    crowdDensities: crowdSimulator.getDensities()
  });

  if (!route) {
    return res.status(404).json({ error: 'Route not found or inaccessible.' });
  }

  res.json(sanitizeObject(route));
});

// 4. Volunteer Dashboard - Incidents Fetch
app.get('/api/volunteer/dashboard', (req, res) => {
  const densities = crowdSimulator.getDensities();
  
  // Calculate queue statistics for dashboard
  const queueStats = STADIUM_NODES.filter(n => n.type === 'food' || n.type === 'washroom').map(n => ({
    id: n.id,
    name: n.name,
    type: n.type,
    density: densities[n.id] || 'Low',
    queueTimeSeconds: crowdSimulator.getQueueTimeSeconds(n.id)
  }));

  res.json(sanitizeObject({
    incidents: incidents.filter(i => i.status !== 'resolved'),
    resolvedIncidentsCount: incidents.filter(i => i.status === 'resolved').length,
    queueStats,
    isEmergencyMode
  }));
});

// 5. Volunteer Report Incident
app.post('/api/volunteer/incidents', validateBody(IncidentReportSchema), (req, res) => {
  const { type, nodeId, description, severity } = req.body;
  
  const node = STADIUM_NODES.find(n => n.id === nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Invalid stadium node specified' });
  }

  const newIncident: Incident = {
    id: `inc_${Date.now()}`,
    type,
    nodeId,
    nodeName: node.name,
    description,
    severity,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  incidents.unshift(newIncident);
  res.status(201).json(sanitizeObject(newIncident));
});

// 6. Volunteer Update Incident Status
app.put('/api/volunteer/incidents/:id', validateBody(IncidentUpdateSchema), (req, res) => {
  const { id } = req.params;
  const { status, volunteerName } = req.body;

  const incident = incidents.find(i => i.id === id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  incident.status = status;
  if (volunteerName) {
    incident.volunteerName = volunteerName;
  }

  res.json(sanitizeObject(incident));
});

// 7. Admin/Organizer Analytics Dashboard
app.get('/api/organizer/analytics', (req, res) => {
  const densities = crowdSimulator.getDensities();
  
  // High density node count
  const heavyCongestionCount = Object.values(densities).filter(d => d === 'High' || d === 'Very High').length;
  
  // Total assistance requested by type
  const incidentBreakdown = {
    medical: incidents.filter(i => i.type === 'medical').length,
    cleaning: incidents.filter(i => i.type === 'cleaning').length,
    queue: incidents.filter(i => i.type === 'queue').length,
    lost_found: incidents.filter(i => i.type === 'lost_found').length,
    navigation: incidents.filter(i => i.type === 'navigation').length,
    language_assist: incidents.filter(i => i.type === 'language_assist').length,
  };

  // Generate mock historical crowd curves (12:00 PM to 8:00 PM kick-off)
  const crowdTrends = [
    { time: '12:00 PM', gateArrivals: 1500, seatOccupancy: 5 },
    { time: '1:00 PM', gateArrivals: 4200, seatOccupancy: 12 },
    { time: '2:00 PM', gateArrivals: 8500, seatOccupancy: 28 },
    { time: '3:00 PM', gateArrivals: 18000, seatOccupancy: 55 },
    { time: '4:00 PM', gateArrivals: 32000, seatOccupancy: 82 }, // Kick-off
    { time: '5:00 PM', gateArrivals: 2000, seatOccupancy: 96 },  // Half time
    { time: '6:00 PM', gateArrivals: 1200, seatOccupancy: 98 },
    { time: '7:00 PM', gateArrivals: 4000, seatOccupancy: 95 },
    { time: '8:00 PM', gateArrivals: 500, seatOccupancy: 40 },   // Exit rush
  ];

  res.json(sanitizeObject({
    crowdTrends,
    heavyCongestionCount,
    incidentBreakdown,
    activeAlertsCount: broadcasts.length,
    satisfactionRate: 4.7,
    incidentResolutionRate: Math.round((incidents.filter(i => i.status === 'resolved').length / (incidents.length || 1)) * 100),
    isEmergencyMode
  }));
});

// 8. Organizer Broadcast Admin alert or trigger Emergency Evac
app.post('/api/organizer/broadcast', (req, res) => {
  const { message, type } = req.body;
  if (!message || !type) {
    return res.status(400).json({ error: 'Message and type are required' });
  }

  if (type === 'emergency') {
    isEmergencyMode = true;
  }

  const newBroadcast = {
    id: `br_${Date.now()}`,
    message,
    type,
    timestamp: new Date().toISOString()
  };

  broadcasts.unshift(newBroadcast);

  res.status(201).json(sanitizeObject(newBroadcast));
});

// 9. Reset endpoints (for demo/hackathon ease)
app.post('/api/stadium/reset', (req, res) => {
  isEmergencyMode = false;
  broadcasts = [
    { id: 'br_1', message: 'Avoid Gate C area due to entry scanning delay. General fans should use Gate A or B.', type: 'warning', timestamp: new Date().toISOString() }
  ];
  incidents = [
    { id: 'inc_1', type: 'medical', nodeId: 'SEC_104', nodeName: 'Section 104', description: 'Fan feeling heat exhaustion. Needs water and visual check.', severity: 'medium', status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'inc_2', type: 'cleaning', nodeId: 'W_L1_STD', nodeName: 'Standard Washroom L1-B', description: 'Liquid spill on floor. Danger of slipping.', severity: 'low', status: 'assigned', volunteerName: 'Carlos (Steward)', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'inc_3', type: 'queue', nodeId: 'G_C', nodeName: 'Gate C', description: 'Long wait time at scanning turnstiles. Needs queue volunteer assistance.', severity: 'medium', status: 'pending', createdAt: new Date().toISOString() }
  ];
  res.json({ message: 'Stadium Mate simulator state reset.' });
});

// 10. Admin override node density
app.post('/api/stadium/override', validateBody(AdminOverrideSchema), (req, res) => {
  const { nodeId, density } = req.body;
  const success = crowdSimulator.setDensity(nodeId, density);
  
  if (!success) {
    return res.status(404).json({ error: 'Stadium node not found' });
  }

  res.json({ message: `Successfully updated ${nodeId} density to ${density}` });
});
