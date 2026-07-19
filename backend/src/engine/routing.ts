import { STADIUM_NODES, STADIUM_EDGES, StadiumNode, StadiumEdge } from './stadiumData';

export interface RouteOptions {
  stepFreeRequired?: boolean;
  avoidCrowds?: boolean;
  crowdDensities?: Record<string, 'Low' | 'Medium' | 'High' | 'Very High'>;
}

export interface RouteResult {
  path: StadiumNode[];
  totalDistance: number; // in meters
  totalDurationMinutes: number;
  directions: string[];
}

export function findRoute(
  startNodeId: string,
  endNodeId: string,
  options: RouteOptions = {}
): RouteResult | null {
  const { stepFreeRequired = false, avoidCrowds = false, crowdDensities = {} } = options;

  // Build adjacency list
  // Note: stadium edges are bidirectionally walkable in our stadium representation
  const adjacency: Record<string, { to: string; edge: StadiumEdge }[]> = {};
  
  for (const node of STADIUM_NODES) {
    adjacency[node.id] = [];
  }

  for (const edge of STADIUM_EDGES) {
    if (!adjacency[edge.from] || !adjacency[edge.to]) continue;

    // Apply strict filtering for accessibility
    if (stepFreeRequired && !edge.isStepFree) {
      continue; // Skip step-ridden paths
    }

    // Bidirectional paths
    adjacency[edge.from].push({ to: edge.to, edge });
    adjacency[edge.to].push({ to: edge.from, edge: { ...edge, from: edge.to, to: edge.from } });
  }

  // Dijkstra's algorithm
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of STADIUM_NODES) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }

  // Verify start node exists
  if (!distances.hasOwnProperty(startNodeId)) {
    return null;
  }
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let currentNodeId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (currentNodeId === null || minDistance === Infinity) {
      break; // Destination unreachable or all reachable nodes visited
    }

    if (currentNodeId === endNodeId) {
      break; // Found shortest path
    }

    unvisited.delete(currentNodeId);

    const neighbors = adjacency[currentNodeId] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      // Density weight multiplier
      let crowdMultiplier = 1.0;
      if (avoidCrowds) {
        const density = crowdDensities[neighbor.to] || 'Low';
        if (density === 'Medium') crowdMultiplier = 1.5;
        else if (density === 'High') crowdMultiplier = 3.0;
        else if (density === 'Very High') crowdMultiplier = 6.0;
      }

      // If step-free is required, ensure the target node is also accessible
      if (stepFreeRequired) {
        const targetNode = STADIUM_NODES.find(n => n.id === neighbor.to);
        if (targetNode && !targetNode.isAccessible) {
          // If the target is a final destination that's not accessible, we still need to reach it,
          // but we shouldn't route general paths through non-accessible intermediate nodes if they are sections.
          if (targetNode.type === 'section' && targetNode.id !== endNodeId) {
            continue;
          }
        }
      }

      const edgeWeight = neighbor.edge.distance * crowdMultiplier;
      const newDist = distances[currentNodeId] + edgeWeight;

      if (newDist < distances[neighbor.to]) {
        distances[neighbor.to] = newDist;
        previous[neighbor.to] = currentNodeId;
      }
    }
  }

  // Reconstruct path
  if (distances[endNodeId] === Infinity) {
    return null; // Path not found
  }

  const pathIds: string[] = [];
  let curr: string | null = endNodeId;
  while (curr !== null) {
    pathIds.unshift(curr);
    curr = previous[curr];
  }

  const pathNodes = pathIds.map(id => STADIUM_NODES.find(n => n.id === id)!);

  // Calculate actual distance and duration
  let totalDistance = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromId = pathNodes[i].id;
    const toId = pathNodes[i + 1].id;
    
    // Find the original edge connecting these two nodes
    const edge = STADIUM_EDGES.find(
      e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );

    if (edge) {
      totalDistance += edge.distance;
      
      let crowdMultiplier = 1.0;
      const density = crowdDensities[toId] || 'Low';
      if (density === 'Medium') crowdMultiplier = 1.5;
      else if (density === 'High') crowdMultiplier = 3.0;
      else if (density === 'Very High') crowdMultiplier = 6.0;

      totalDurationSeconds += edge.baseDurationSeconds * crowdMultiplier;
    }
  }

  // Generate turn-by-turn text directions
  const directions: string[] = [];
  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    const prevNode = i > 0 ? pathNodes[i - 1] : null;
    
    if (i === 0) {
      directions.push(`Start at ${node.name} (Level ${node.level}).`);
    } else {
      const edge = STADIUM_EDGES.find(
        e => (e.from === prevNode!.id && e.to === node.id) || (e.from === node.id && e.to === prevNode!.id)
      );
      const isElevator = node.type === 'elevator' || prevNode!.type === 'elevator';
      const isStairs = node.type === 'stairs' || prevNode!.type === 'stairs';
      
      let moveText = '';
      if (isElevator) {
        moveText = `Take the accessible elevator to Level ${node.level} (${node.name}).`;
      } else if (isStairs) {
        moveText = `Take the stairs to Level ${node.level} (${node.name}).`;
      } else {
        moveText = `Walk ${edge ? edge.distance : 30}m to ${node.name}.`;
      }

      const density = crowdDensities[node.id] || 'Low';
      if (density === 'High' || density === 'Very High') {
        moveText += ` (Caution: Current crowd is ${density.toLowerCase()})`;
      }
      directions.push(moveText);
    }
  }
  
  directions.push(`Arrive at your destination: ${pathNodes[pathNodes.length - 1].name}.`);

  return {
    path: pathNodes,
    totalDistance,
    totalDurationMinutes: Math.round((totalDurationSeconds / 60) * 10) / 10,
    directions
  };
}

export function getNearestFacility(
  startNodeId: string,
  facilityType: 'washroom' | 'food' | 'medical' | 'transit' | 'quiet',
  options: RouteOptions = {}
): RouteResult | null {
  const { stepFreeRequired = false } = options;
  
  // Find all nodes of the requested facility type
  const targetNodes = STADIUM_NODES.filter(node => {
    if (node.type !== facilityType) return false;
    if (stepFreeRequired && !node.isAccessible) return false;
    return true;
  });

  if (targetNodes.length === 0) return null;

  let bestRoute: RouteResult | null = null;
  let minDistance = Infinity;

  for (const target of targetNodes) {
    const route = findRoute(startNodeId, target.id, options);
    if (route && route.totalDistance < minDistance) {
      minDistance = route.totalDistance;
      bestRoute = route;
    }
  }

  return bestRoute;
}
