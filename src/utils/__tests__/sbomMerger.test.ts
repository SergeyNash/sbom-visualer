import { describe, it, expect } from 'vitest';
import { mergeSBOMs, deduplicateComponents } from '../sbomMerger';
import { SBOMComponent } from '../../types/sbom';

describe('sbomMerger', () => {
  describe('mergeSBOMs', () => {
    it('should merge multiple SBOMs without duplicates', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['lodash@4.17.21'],
          description: 'A JavaScript library for building user interfaces'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'lodash@4.17.21',
          name: 'lodash',
          type: 'library',
          license: 'MIT',
          version: '4.17.21',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'A modern JavaScript utility library'
        },
        {
          id: 'typescript@4.9.0',
          name: 'typescript',
          type: 'library',
          license: 'Apache-2.0',
          version: '4.9.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'TypeScript is a superset of JavaScript'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result).toHaveLength(3);
      expect(result.some(c => c.name === 'react')).toBe(true);
      expect(result.some(c => c.name === 'lodash')).toBe(true);
      expect(result.some(c => c.name === 'typescript')).toBe(true);
    });

    it('should merge duplicate components with same name and version', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['lodash@4.17.21'],
          description: 'A JavaScript library for building user interfaces'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'medium',
          cveCount: 2,
          dependencies: ['typescript@4.9.0'],
          description: 'React library'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result).toHaveLength(1);
      const mergedComponent = result[0];
      expect(mergedComponent.name).toBe('react');
      expect(mergedComponent.version).toBe('18.2.0');
      expect(mergedComponent.riskLevel).toBe('medium'); // Higher risk level preserved
      expect(mergedComponent.cveCount).toBe(2); // Higher CVE count preserved
      expect(mergedComponent.dependencies).toContain('lodash@4.17.21');
      expect(mergedComponent.dependencies).toContain('typescript@4.9.0');
      expect(mergedComponent.description).toBe('A JavaScript library for building user interfaces'); // Better description preserved
    });

    it('should handle conflicting component IDs by adding suffix', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'Component from SBOM 1'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'Component from SBOM 2'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result).toHaveLength(1);
      const mergedComponent = result[0];
      expect(mergedComponent.name).toBe('component');
      expect(mergedComponent.version).toBe('1.0.0');
      expect(mergedComponent.id).toBe('component@1.0.0'); // First one keeps original ID
    });

    it('should merge dependencies correctly', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'app@1.0.0',
          name: 'app',
          type: 'application',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['react@18.2.0', 'lodash@4.17.21'],
          description: 'Main application'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'app@1.0.0',
          name: 'app',
          type: 'application',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['react@18.2.0', 'typescript@4.9.0'],
          description: 'Main application'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result).toHaveLength(1);
      const mergedComponent = result[0];
      expect(mergedComponent.dependencies).toHaveLength(3);
      expect(mergedComponent.dependencies).toContain('react@18.2.0');
      expect(mergedComponent.dependencies).toContain('lodash@4.17.21');
      expect(mergedComponent.dependencies).toContain('typescript@4.9.0');
    });

    it('should handle empty SBOM arrays', () => {
      const result = mergeSBOMs([]);
      expect(result).toHaveLength(0);
    });

    it('should handle SBOMs with empty components', () => {
      const result = mergeSBOMs([[], []]);
      expect(result).toHaveLength(0);
    });

    it('should preserve higher risk levels correctly', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'Component'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'high',
          cveCount: 5,
          dependencies: [],
          description: 'Component'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result[0].riskLevel).toBe('high');
      expect(result[0].cveCount).toBe(5);
    });

    it('should handle medium risk level correctly', () => {
      const sbom1: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'Component'
        }
      ];

      const sbom2: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'medium',
          cveCount: 2,
          dependencies: [],
          description: 'Component'
        }
      ];

      const result = mergeSBOMs([sbom1, sbom2]);

      expect(result[0].riskLevel).toBe('medium');
      expect(result[0].cveCount).toBe(2);
    });
  });

  describe('deduplicateComponents', () => {
    it('should remove duplicate components with same name and version', () => {
      const components: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['lodash@4.17.21'],
          description: 'A JavaScript library for building user interfaces'
        },
        {
          id: 'react@18.2.0-duplicate',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'medium',
          cveCount: 1,
          dependencies: ['typescript@4.9.0'],
          description: 'React library'
        },
        {
          id: 'lodash@4.17.21',
          name: 'lodash',
          type: 'library',
          license: 'MIT',
          version: '4.17.21',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'A modern JavaScript utility library'
        }
      ];

      const result = deduplicateComponents(components);

      expect(result).toHaveLength(2);
      expect(result.some(c => c.name === 'react')).toBe(true);
      expect(result.some(c => c.name === 'lodash')).toBe(true);

      const reactComponent = result.find(c => c.name === 'react')!;
      expect(reactComponent.dependencies).toContain('lodash@4.17.21');
      expect(reactComponent.dependencies).toContain('typescript@4.9.0');
      expect(reactComponent.riskLevel).toBe('medium');
      expect(reactComponent.cveCount).toBe(1);
    });

    it('should handle components with different versions as separate', () => {
      const components: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'React 18.2.0'
        },
        {
          id: 'react@18.1.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.1.0',
          riskLevel: 'medium',
          cveCount: 1,
          dependencies: [],
          description: 'React 18.1.0'
        }
      ];

      const result = deduplicateComponents(components);

      expect(result).toHaveLength(2);
      expect(result.some(c => c.version === '18.2.0')).toBe(true);
      expect(result.some(c => c.version === '18.1.0')).toBe(true);
    });

    it('should handle empty components array', () => {
      const result = deduplicateComponents([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single component', () => {
      const components: SBOMComponent[] = [
        {
          id: 'react@18.2.0',
          name: 'react',
          type: 'library',
          license: 'MIT',
          version: '18.2.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'A JavaScript library'
        }
      ];

      const result = deduplicateComponents(components);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('react');
    });

    it('should preserve better descriptions when merging', () => {
      const components: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'library component' // Generic description
        },
        {
          id: 'component@1.0.0-duplicate',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: [],
          description: 'A comprehensive utility library for data processing' // Better description
        }
      ];

      const result = deduplicateComponents(components);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('A comprehensive utility library for data processing');
    });

    it('should handle multiple duplicates correctly', () => {
      const components: SBOMComponent[] = [
        {
          id: 'component@1.0.0',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'low',
          cveCount: 0,
          dependencies: ['dep1@1.0.0'],
          description: 'library component'
        },
        {
          id: 'component@1.0.0-duplicate1',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'medium',
          cveCount: 1,
          dependencies: ['dep2@1.0.0'],
          description: 'library component'
        },
        {
          id: 'component@1.0.0-duplicate2',
          name: 'component',
          type: 'library',
          license: 'MIT',
          version: '1.0.0',
          riskLevel: 'high',
          cveCount: 3,
          dependencies: ['dep3@1.0.0'],
          description: 'A comprehensive utility library'
        }
      ];

      const result = deduplicateComponents(components);

      expect(result).toHaveLength(1);
      const merged = result[0];
      expect(merged.riskLevel).toBe('high');
      expect(merged.cveCount).toBe(3);
      expect(merged.description).toBe('A comprehensive utility library');
      expect(merged.dependencies).toHaveLength(3);
      expect(merged.dependencies).toContain('dep1@1.0.0');
      expect(merged.dependencies).toContain('dep2@1.0.0');
      expect(merged.dependencies).toContain('dep3@1.0.0');
    });
  });
});
