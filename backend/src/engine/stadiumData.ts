export interface StadiumNode {
  id: string;
  name: string;
  type: 'gate' | 'washroom' | 'section' | 'food' | 'medical' | 'elevator' | 'quiet' | 'transit' | 'stairs' | 'corridor';
  level: number; // 0 = ground/transit, 1 = lower concourse, 2 = club level, 3 = upper concourse
  isAccessible: boolean;
  metadata: {
    description: string;
    details?: string;
    capacity?: string;
    hasHearingLoop?: boolean;
    hasChangingPlaces?: boolean; // specialized adult changing tables
    languages?: string[]; // for gates/medical/volunteers
    queueTimeSeconds?: number;
  };
  x: number; // normalized coordinate 0-100 for 2D UI mapping
  y: number; // normalized coordinate 0-100 for 2D UI mapping
}

export interface StadiumEdge {
  from: string;
  to: string;
  distance: number; // in meters
  isStepFree: boolean;
  baseDurationSeconds: number;
}

export interface CrowdDensity {
  nodeId: string;
  density: 'Low' | 'Medium' | 'High' | 'Very High';
  timestamp: string;
}

export const STADIUM_NODES: StadiumNode[] = [
  // TRANSIT (Level 0)
  { id: 'T_METRO', name: 'MetLife Stadium Metro Station', type: 'transit', level: 0, isAccessible: true, metadata: { description: 'NJ Transit Meadowlands Rail Line entrance', details: 'Accessible ramps and elevators available.' }, x: 10, y: 50 },
  { id: 'T_BUS', name: 'Bus Terminal North', type: 'transit', level: 0, isAccessible: true, metadata: { description: 'Regional bus pickup & drop-off', details: 'Bus bays 1-10, step-free access.' }, x: 50, y: 5 },
  { id: 'T_TAXI', name: 'Taxi Stand & Ride Share Hub', type: 'transit', level: 0, isAccessible: true, metadata: { description: 'Uber/Lyft and official Taxi zones', details: 'Located in Lot E, designated loading zone.' }, x: 90, y: 50 },
  { id: 'T_PARK_A', name: 'Parking Lot A (Accessible)', type: 'transit', level: 0, isAccessible: true, metadata: { description: 'Dedicated blue-badge parking zone', details: 'Closest parking to Gate A (accessible entrance).' }, x: 30, y: 90 },
  { id: 'T_PARK_B', name: 'Parking Lot B (General)', type: 'transit', level: 0, isAccessible: true, metadata: { description: 'General public parking', details: 'Connects to Gate C and D via shuttle service.' }, x: 70, y: 90 },

  // GATES (Level 1)
  { id: 'G_A', name: 'Gate A (Accessible Main Entrance)', type: 'gate', level: 1, isAccessible: true, metadata: { description: 'Main West entrance with low-slope ramps', languages: ['English', 'Spanish', 'French', 'Portuguese'] }, x: 25, y: 50 },
  { id: 'G_B', name: 'Gate B', type: 'gate', level: 1, isAccessible: false, metadata: { description: 'North Gate, escalator-only access to upper levels', languages: ['English', 'Spanish'] }, x: 50, y: 20 },
  { id: 'G_C', name: 'Gate C', type: 'gate', level: 1, isAccessible: true, metadata: { description: 'East Gate with accessible shuttle drop-off', languages: ['English', 'French'] }, x: 75, y: 50 },
  { id: 'G_D', name: 'Gate D (South)', type: 'gate', level: 1, isAccessible: false, metadata: { description: 'South Gate with turnstiles and stairs', languages: ['English', 'Spanish'] }, x: 50, y: 80 },

  // STAIRS & ELEVATORS (Vertical Connectors)
  { id: 'E_WEST', name: 'Elevator West (Accessible)', type: 'elevator', level: 1, isAccessible: true, metadata: { description: 'Accessible elevator serving levels 1, 2, and 3', details: 'Tactile braille buttons and voice announcements.' }, x: 35, y: 50 },
  { id: 'E_EAST', name: 'Elevator East (Accessible)', type: 'elevator', level: 1, isAccessible: true, metadata: { description: 'Accessible elevator serving levels 1, 2, and 3', details: 'Tactile braille buttons and voice announcements.' }, x: 65, y: 50 },
  { id: 'ST_NORTH', name: 'North Stairs', type: 'stairs', level: 1, isAccessible: false, metadata: { description: 'Stairs linking Level 1 to Level 2 and 3' }, x: 50, y: 30 },
  { id: 'ST_SOUTH', name: 'South Stairs', type: 'stairs', level: 1, isAccessible: false, metadata: { description: 'Stairs linking Level 1 to Level 2 and 3' }, x: 50, y: 70 },

  // LEVEL 1: LOWER CONCOURSE (Nodes)
  { id: 'SEC_101', name: 'Section 101 (Seat Row 1-30)', type: 'section', level: 1, isAccessible: true, metadata: { description: 'Lower concourse seating - West side', details: 'Includes 12 wheelchair companion spaces.' }, x: 38, y: 45 },
  { id: 'SEC_102', name: 'Section 102 (Seat Row 1-30)', type: 'section', level: 1, isAccessible: false, metadata: { description: 'Lower concourse seating - North side' }, x: 45, y: 38 },
  { id: 'SEC_103', name: 'Section 103 (Seat Row 1-30)', type: 'section', level: 1, isAccessible: true, metadata: { description: 'Lower concourse seating - East side', details: 'Includes 12 wheelchair companion spaces.' }, x: 62, y: 45 },
  { id: 'SEC_104', name: 'Section 104 (Seat Row 1-30)', type: 'section', level: 1, isAccessible: false, metadata: { description: 'Lower concourse seating - South side' }, x: 55, y: 62 },

  { id: 'W_L1_ACC', name: 'Accessible Washroom L1-A', type: 'washroom', level: 1, isAccessible: true, metadata: { description: 'Near Section 101', details: 'Equipped with grab bars, emergency cord, and adult changing table.', hasChangingPlaces: true }, x: 37, y: 55 },
  { id: 'W_L1_STD', name: 'Standard Washroom L1-B', type: 'washroom', level: 1, isAccessible: false, metadata: { description: 'Near Section 102', details: 'Standard stalls only.' }, x: 48, y: 35 },

  { id: 'F_L1_TACOS', name: 'Tacos 2026 Concessions', type: 'food', level: 1, isAccessible: true, metadata: { description: 'Near Gate A', details: 'Low-height ordering counter available.', queueTimeSeconds: 120 }, x: 30, y: 40 },
  { id: 'F_L1_HALAL', name: 'Halal Bites', type: 'food', level: 1, isAccessible: true, metadata: { description: 'Near Gate C', details: 'Certified Halal, step-free queue.', queueTimeSeconds: 240 }, x: 70, y: 40 },

  { id: 'M_L1', name: 'Main Medical Center 1', type: 'medical', level: 1, isAccessible: true, metadata: { description: 'First Aid & Emergency Medical Station', details: 'Staffed by local paramedics and volunteers.', languages: ['English', 'Spanish', 'French'] }, x: 32, y: 58 },
  { id: 'Q_L1', name: 'Sensory & Quiet Room North', type: 'quiet', level: 1, isAccessible: true, metadata: { description: 'De-sensitization and quiet zone for neurodivergent fans', details: 'Soundproof doors, soft lighting, weighted blankets.' }, x: 45, y: 25 },

  // LEVEL 2: CLUB LEVEL (Nodes)
  { id: 'SEC_201', name: 'Section 201 (VIP Club)', type: 'section', level: 2, isAccessible: true, metadata: { description: 'Club level premium seating - West', details: 'Step-free access via Elevator West.' }, x: 35, y: 48 },
  { id: 'SEC_202', name: 'Section 202 (VIP Club)', type: 'section', level: 2, isAccessible: true, metadata: { description: 'Club level premium seating - East', details: 'Step-free access via Elevator East.' }, x: 65, y: 48 },
  { id: 'W_L2_ACC', name: 'Accessible Washroom L2', type: 'washroom', level: 2, isAccessible: true, metadata: { description: 'Club Level washroom', details: 'Step-free access, automated doors.' }, x: 36, y: 52 },
  { id: 'F_L2_BREWS', name: 'Brews & Dogs Premium', type: 'food', level: 2, isAccessible: true, metadata: { description: 'Club Level craft beverages & snacks', queueTimeSeconds: 60 }, x: 64, y: 52 },

  // LEVEL 3: UPPER CONCOURSE (Nodes)
  { id: 'SEC_301', name: 'Section 301 (Upper Deck)', type: 'section', level: 3, isAccessible: false, metadata: { description: 'Upper concourse seating - West' }, x: 32, y: 42 },
  { id: 'SEC_302', name: 'Section 302 (Upper Deck)', type: 'section', level: 3, isAccessible: true, metadata: { description: 'Upper concourse wheelchair platforms', details: 'Accessible seating bays at the front of the upper tier.' }, x: 68, y: 42 },
  { id: 'W_L3_STD', name: 'Standard Washroom L3', type: 'washroom', level: 3, isAccessible: false, metadata: { description: 'Upper concourse - East side' }, x: 67, y: 38 },
  { id: 'F_L3_BURGER', name: 'United Burgers', type: 'food', level: 3, isAccessible: true, metadata: { description: 'Standard quick concessions', queueTimeSeconds: 300 }, x: 33, y: 38 }
];

export const STADIUM_EDGES: StadiumEdge[] = [
  // Transit to Gates (Level 0 to Level 1)
  { from: 'T_METRO', to: 'G_A', distance: 150, isStepFree: true, baseDurationSeconds: 110 },
  { from: 'T_METRO', to: 'G_B', distance: 300, isStepFree: false, baseDurationSeconds: 220 }, // rough path
  { from: 'T_BUS', to: 'G_B', distance: 100, isStepFree: true, baseDurationSeconds: 70 },
  { from: 'T_BUS', to: 'G_C', distance: 280, isStepFree: true, baseDurationSeconds: 200 },
  { from: 'T_TAXI', to: 'G_C', distance: 120, isStepFree: true, baseDurationSeconds: 90 },
  { from: 'T_TAXI', to: 'G_D', distance: 250, isStepFree: false, baseDurationSeconds: 180 },
  { from: 'T_PARK_A', to: 'G_A', distance: 80, isStepFree: true, baseDurationSeconds: 60 },
  { from: 'T_PARK_B', to: 'G_D', distance: 180, isStepFree: true, baseDurationSeconds: 130 },

  // Gates to Level 1 Concourse elements
  { from: 'G_A', to: 'F_L1_TACOS', distance: 50, isStepFree: true, baseDurationSeconds: 35 },
  { from: 'G_A', to: 'W_L1_ACC', distance: 60, isStepFree: true, baseDurationSeconds: 45 },
  { from: 'G_A', to: 'M_L1', distance: 40, isStepFree: true, baseDurationSeconds: 30 },
  { from: 'G_A', to: 'E_WEST', distance: 80, isStepFree: true, baseDurationSeconds: 60 },
  { from: 'G_A', to: 'SEC_101', distance: 90, isStepFree: true, baseDurationSeconds: 65 },

  { from: 'G_B', to: 'W_L1_STD', distance: 40, isStepFree: true, baseDurationSeconds: 30 },
  { from: 'G_B', to: 'Q_L1', distance: 50, isStepFree: true, baseDurationSeconds: 35 },
  { from: 'G_B', to: 'SEC_102', distance: 60, isStepFree: true, baseDurationSeconds: 45 },
  { from: 'G_B', to: 'ST_NORTH', distance: 30, isStepFree: false, baseDurationSeconds: 20 },

  { from: 'G_C', to: 'F_L1_HALAL', distance: 40, isStepFree: true, baseDurationSeconds: 30 },
  { from: 'G_C', to: 'E_EAST', distance: 70, isStepFree: true, baseDurationSeconds: 50 },
  { from: 'G_C', to: 'SEC_103', distance: 80, isStepFree: true, baseDurationSeconds: 60 },

  { from: 'G_D', to: 'SEC_104', distance: 50, isStepFree: true, baseDurationSeconds: 35 },
  { from: 'G_D', to: 'ST_SOUTH', distance: 40, isStepFree: false, baseDurationSeconds: 30 },

  // Internal Level 1 links
  { from: 'SEC_101', to: 'W_L1_ACC', distance: 30, isStepFree: true, baseDurationSeconds: 22 },
  { from: 'SEC_101', to: 'M_L1', distance: 40, isStepFree: true, baseDurationSeconds: 30 },
  { from: 'SEC_102', to: 'W_L1_STD', distance: 20, isStepFree: true, baseDurationSeconds: 15 },
  { from: 'SEC_102', to: 'Q_L1', distance: 45, isStepFree: true, baseDurationSeconds: 32 },
  { from: 'SEC_103', to: 'F_L1_HALAL', distance: 30, isStepFree: true, baseDurationSeconds: 22 },
  { from: 'SEC_104', to: 'SEC_101', distance: 150, isStepFree: true, baseDurationSeconds: 110 },
  { from: 'SEC_104', to: 'SEC_103', distance: 150, isStepFree: true, baseDurationSeconds: 110 },
  { from: 'SEC_102', to: 'SEC_101', distance: 120, isStepFree: true, baseDurationSeconds: 90 },
  { from: 'SEC_102', to: 'SEC_103', distance: 120, isStepFree: true, baseDurationSeconds: 90 },

  // Connectors (Level 1 to Level 2)
  { from: 'E_WEST', to: 'SEC_201', distance: 40, isStepFree: true, baseDurationSeconds: 30 }, // elevator ride + path
  { from: 'E_EAST', to: 'SEC_202', distance: 40, isStepFree: true, baseDurationSeconds: 30 },
  { from: 'ST_NORTH', to: 'SEC_201', distance: 80, isStepFree: false, baseDurationSeconds: 65 }, // stairs
  { from: 'ST_NORTH', to: 'SEC_202', distance: 80, isStepFree: false, baseDurationSeconds: 65 }, // stairs
  { from: 'ST_SOUTH', to: 'SEC_201', distance: 90, isStepFree: false, baseDurationSeconds: 70 }, // stairs
  { from: 'ST_SOUTH', to: 'SEC_202', distance: 90, isStepFree: false, baseDurationSeconds: 70 }, // stairs

  // Level 2 elements
  { from: 'SEC_201', to: 'W_L2_ACC', distance: 25, isStepFree: true, baseDurationSeconds: 18 },
  { from: 'SEC_202', to: 'F_L2_BREWS', distance: 25, isStepFree: true, baseDurationSeconds: 18 },

  // Connectors (Level 2 to Level 3)
  { from: 'E_WEST', to: 'SEC_301', distance: 60, isStepFree: true, baseDurationSeconds: 45 },
  { from: 'E_EAST', to: 'SEC_302', distance: 60, isStepFree: true, baseDurationSeconds: 45 },
  { from: 'ST_NORTH', to: 'SEC_301', distance: 100, isStepFree: false, baseDurationSeconds: 85 },
  { from: 'ST_NORTH', to: 'SEC_302', distance: 100, isStepFree: false, baseDurationSeconds: 85 },

  // Level 3 elements
  { from: 'SEC_301', to: 'F_L3_BURGER', distance: 30, isStepFree: true, baseDurationSeconds: 22 },
  { from: 'SEC_302', to: 'W_L3_STD', distance: 30, isStepFree: true, baseDurationSeconds: 22 }
];
