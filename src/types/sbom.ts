export interface SBOMComponent {
  id: string;
  name: string;
  type: 'library' | 'application' | 'dependency';
  license: string;
  version: string;
  riskLevel: 'low' | 'medium' | 'high';
  cveCount: number;
  dependencies: string[];
  description: string;
  publisher?: string;
  vulnerabilities?: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    cveId?: string;
  }>;
  metadata?: {
    source?: string;
    packageManager?: string;
    homepage?: string;
    repository?: string;
    keywords?: string[];
    groupId?: string;
    artifactId?: string;
  };
}

export interface FilterState {
  type: string[];
  license: string[];
  riskLevel: string[];
  searchTerm: string;
}

export interface DiagramNode {
  id: string;
  name: string;
  type: SBOMComponent['type'];
  riskLevel: SBOMComponent['riskLevel'];
  x: number;
  y: number;
  angle: number;
  radius: number;
}

export interface DiagramEdge {
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface SBOMFile {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{
      vendor: string;
      name: string;
      version: string;
    }>;
  };
  components: Array<{
    'bom-ref': string;
    type: string;
    name: string;
    version: string;
    licenses?: Array<{
      license: {
        id?: string;
        name?: string;
      };
    }>;
    description?: string;
    externalReferences?: Array<{
      type: string;
      url: string;
    }>;
  }>;
  dependencies?: Array<{
    ref: string;
    dependsOn: string[];
  }>;
}