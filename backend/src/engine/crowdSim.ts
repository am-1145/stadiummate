import { STADIUM_NODES, STADIUM_EDGES } from './stadiumData';

export type DensityLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export class CrowdSimulator {
  private densities: Record<string, DensityLevel> = {};

  constructor() {
    this.initializeDensities();
  }

  private initializeDensities() {
    // Initialize default density configurations
    for (const node of STADIUM_NODES) {
      if (node.type === 'transit') {
        this.densities[node.id] = 'Medium';
      } else if (node.type === 'gate') {
        this.densities[node.id] = 'Low';
      } else if (node.type === 'section') {
        this.densities[node.id] = Math.random() > 0.5 ? 'Medium' : 'Low';
      } else if (node.type === 'food') {
        this.densities[node.id] = 'Medium';
      } else {
        this.densities[node.id] = 'Low';
      }
    }
    // Set some hardcoded high congestion zones for testing
    this.densities['SEC_104'] = 'High';
    this.densities['G_C'] = 'High';
    this.densities['T_METRO'] = 'Very High';
  }

  public getDensities(): Record<string, DensityLevel> {
    return { ...this.densities };
  }

  public setDensity(nodeId: string, density: DensityLevel): boolean {
    if (this.densities.hasOwnProperty(nodeId)) {
      this.densities[nodeId] = density;
      return true;
    }
    return false;
  }

  // Simulates a tick of time where crowd patterns change slightly
  public tick() {
    for (const node of STADIUM_NODES) {
      // Don't fluctuate critical emergency or transit points wildly
      if (node.id === 'T_METRO') {
        this.densities[node.id] = Math.random() > 0.8 ? 'High' : 'Very High';
        continue;
      }
      
      const rand = Math.random();
      const current = this.densities[node.id];

      if (node.type === 'section') {
        if (rand > 0.85) {
          this.densities[node.id] = this.shiftDensity(current, 1);
        } else if (rand < 0.15) {
          this.densities[node.id] = this.shiftDensity(current, -1);
        }
      } else if (node.type === 'food' || node.type === 'washroom') {
        if (rand > 0.8) {
          this.densities[node.id] = this.shiftDensity(current, 1);
        } else if (rand < 0.2) {
          this.densities[node.id] = this.shiftDensity(current, -1);
        }
      } else if (node.type === 'gate') {
        if (rand > 0.9) {
          this.densities[node.id] = this.shiftDensity(current, 1);
        } else if (rand < 0.1) {
          this.densities[node.id] = this.shiftDensity(current, -1);
        }
      }
    }
  }

  private shiftDensity(current: DensityLevel, direction: number): DensityLevel {
    const levels: DensityLevel[] = ['Low', 'Medium', 'High', 'Very High'];
    const index = levels.indexOf(current);
    const nextIndex = Math.max(0, Math.min(levels.length - 1, index + direction));
    return levels[nextIndex];
  }

  public getQueueTimeSeconds(nodeId: string): number {
    const density = this.densities[nodeId] || 'Low';
    switch (density) {
      case 'Low':
        return Math.floor(Math.random() * 60) + 30; // 30s - 1.5m
      case 'Medium':
        return Math.floor(Math.random() * 120) + 120; // 2m - 4m
      case 'High':
        return Math.floor(Math.random() * 240) + 300; // 5m - 9m
      case 'Very High':
        return Math.floor(Math.random() * 600) + 600; // 10m - 20m
    }
  }
}

export const crowdSimulator = new CrowdSimulator();
export default crowdSimulator;
