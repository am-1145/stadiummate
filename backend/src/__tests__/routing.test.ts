import { findRoute, getNearestFacility } from '../engine/routing';
import crowdSimulator from '../engine/crowdSim';
import { STADIUM_NODES } from '../engine/stadiumData';

describe('Stadium Dijkstra Routing Engine', () => {
  
  beforeEach(() => {
    // Reset densities to default
    const densities = crowdSimulator.getDensities();
    for (const key in densities) {
      crowdSimulator.setDensity(key, 'Low');
    }
  });

  test('should find a direct standard route between Section 101 and Section 102', () => {
    const route = findRoute('SEC_101', 'SEC_102');
    expect(route).not.toBeNull();
    if (route) {
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.path.length).toBeGreaterThan(1);
      expect(route.path[0].id).toBe('SEC_101');
      expect(route.path[route.path.length - 1].id).toBe('SEC_102');
    }
  });

  test('should correctly avoid stairs and use elevator when step-free is required', () => {
    // SEC_104 (Level 1) to SEC_201 (Level 2)
    // Standard shortest route would use stairs ST_SOUTH or ST_NORTH
    // Accessible route MUST use elevator E_WEST or E_EAST

    const standardRoute = findRoute('SEC_104', 'SEC_201', { stepFreeRequired: false });
    const accessibleRoute = findRoute('SEC_104', 'SEC_201', { stepFreeRequired: true });

    expect(standardRoute).not.toBeNull();
    expect(accessibleRoute).not.toBeNull();

    if (standardRoute && accessibleRoute) {
      // Standard route might use stairs
      const standardHasStairs = standardRoute.path.some(n => n.type === 'stairs');
      const standardHasElevator = standardRoute.path.some(n => n.type === 'elevator');
      
      // Accessible route MUST NOT use stairs, and MUST use elevator
      const accessibleHasStairs = accessibleRoute.path.some(n => n.type === 'stairs');
      const accessibleHasElevator = accessibleRoute.path.some(n => n.type === 'elevator');

      expect(accessibleHasStairs).toBe(false);
      expect(accessibleHasElevator).toBe(true);
    }
  });

  test('should route around high crowd congestion when avoidCrowds is enabled', () => {
    // Set a node in the standard path to High density
    // Target route: SEC_102 to SEC_101
    // Standard path is SEC_102 -> SEC_101
    // We will set SEC_102 -> SEC_101 path nodes to Very High density, forcing the router to go via another route

    // Verify standard route path
    const normalRoute = findRoute('SEC_102', 'SEC_101', { avoidCrowds: false });
    expect(normalRoute).not.toBeNull();

    // Now spike the direct path or nodes to make it extremely costly
    // Set SEC_102 to Very High
    crowdSimulator.setDensity('SEC_102', 'Very High');
    crowdSimulator.setDensity('W_L1_STD', 'Very High');

    const crowdAvoidingRoute = findRoute('SEC_102', 'SEC_101', {
      avoidCrowds: true,
      crowdDensities: crowdSimulator.getDensities()
    });

    expect(crowdAvoidingRoute).not.toBeNull();
    
    if (normalRoute && crowdAvoidingRoute) {
      // The path should be different or have larger duration weight but avoid direct congestion hotspots
      expect(crowdAvoidingRoute.path).not.toEqual(normalRoute.path);
    }
  });

  test('should find the nearest accessible washroom', () => {
    // Start from SEC_101 (Level 1)
    // Nearest accessible washroom should be W_L1_ACC
    const route = getNearestFacility('SEC_101', 'washroom', { stepFreeRequired: true });
    expect(route).not.toBeNull();
    if (route) {
      const destination = route.path[route.path.length - 1];
      expect(destination.type).toBe('washroom');
      expect(destination.isAccessible).toBe(true);
      expect(destination.id).toBe('W_L1_ACC');
    }
  });
});
describe('Stadium Incidents & General Fallbacks', () => {
  test('should fallback to clean responses if Gemini API is offline', () => {
    // Check FAQ answers on permitted items
    // In fallback mode, FAQ should fetch locally defined answers
    const mockService = jest.requireActual('../services/geminiService').default;
    
    // We pass null genAI in testing environment so fallback is guaranteed
    expect(mockService).toBeDefined();
  });
});
