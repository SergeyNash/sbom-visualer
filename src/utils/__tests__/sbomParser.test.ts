import { describe, it, expect } from 'vitest';
import { parseSBOMFile, validateSBOMFile } from '../sbomParser';
import { SBOMFile } from '../../types/sbom';

describe('sbomParser', () => {
  describe('parseSBOMFile', () => {
    it('should parse valid SBOM file with components', () => {
      const mockSBOMData: SBOMFile = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
        version: 1,
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          tools: [{
            vendor: 'Test Vendor',
            name: 'Test Tool',
            version: '1.0.0'
          }]
        },
        components: [
          {
            'bom-ref': 'pkg:npm/react@18.2.0',
            type: 'library',
            name: 'react',
            version: '18.2.0',
            licenses: [{
              license: {
                id: 'MIT'
              }
            }],
            description: 'A JavaScript library for building user interfaces'
          },
          {
            'bom-ref': 'pkg:npm/lodash@4.17.21',
            type: 'library',
            name: 'lodash',
            version: '4.17.21',
            licenses: [{
              license: {
                name: 'MIT License'
              }
            }]
          }
        ],
        dependencies: [
          {
            ref: 'pkg:npm/react@18.2.0',
            dependsOn: ['pkg:npm/lodash@4.17.21']
          }
        ]
      };

      const result = parseSBOMFile(mockSBOMData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'pkg:npm/react@18.2.0',
        name: 'react',
        type: 'library',
        license: 'MIT',
        version: '18.2.0',
        riskLevel: 'low',
        cveCount: expect.any(Number),
        dependencies: ['pkg:npm/lodash@4.17.21'],
        description: 'A JavaScript library for building user interfaces'
      });
    });

    it('should handle components without licenses', () => {
      const mockSBOMData: SBOMFile = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
        version: 1,
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          tools: [{
            vendor: 'Test Vendor',
            name: 'Test Tool',
            version: '1.0.0'
          }]
        },
        components: [
          {
            'bom-ref': 'pkg:npm/test@1.0.0',
            type: 'library',
            name: 'test',
            version: '1.0.0'
          }
        ]
      };

      const result = parseSBOMFile(mockSBOMData);

      expect(result[0].license).toBe('Unknown');
    });

    it('should determine correct component types', () => {
      const mockSBOMData: SBOMFile = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
        version: 1,
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          tools: []
        },
        components: [
          {
            'bom-ref': 'pkg:npm/app@1.0.0',
            type: 'application',
            name: 'app',
            version: '1.0.0'
          },
          {
            'bom-ref': 'pkg:npm/lib@1.0.0',
            type: 'library',
            name: 'lib',
            version: '1.0.0'
          },
          {
            'bom-ref': 'pkg:npm/other@1.0.0',
            type: 'framework',
            name: 'other',
            version: '1.0.0'
          }
        ]
      };

      const result = parseSBOMFile(mockSBOMData);

      expect(result[0].type).toBe('application');
      expect(result[1].type).toBe('library');
      expect(result[2].type).toBe('dependency');
    });

    it('should assess risk levels correctly', () => {
      const mockSBOMData: SBOMFile = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
        version: 1,
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          tools: []
        },
        components: [
          {
            'bom-ref': 'pkg:npm/gpl@1.0.0',
            type: 'library',
            name: 'gpl',
            version: '1.0.0',
            licenses: [{
              license: {
                id: 'GPL-3.0'
              }
            }]
          },
          {
            'bom-ref': 'pkg:npm/deprecated@1.0.0',
            type: 'library',
            name: 'deprecated-package',
            version: '1.0.0'
          },
          {
            'bom-ref': 'pkg:npm/beta@1.0.0',
            type: 'library',
            name: 'beta-package',
            version: '1.0.0-beta'
          }
        ]
      };

      const result = parseSBOMFile(mockSBOMData);

      expect(result[0].riskLevel).toBe('medium'); // GPL license
      expect(result[1].riskLevel).toBe('high'); // deprecated in name
      expect(result[2].riskLevel).toBe('high'); // beta version
    });

    it('should handle components without bom-ref', () => {
      const mockSBOMData: SBOMFile = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012',
        version: 1,
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          tools: []
        },
        components: [
          {
            'bom-ref': 'test-component@1.0.0',
            type: 'library',
            name: 'test-component',
            version: '1.0.0'
          }
        ]
      };

      const result = parseSBOMFile(mockSBOMData);

      expect(result[0].id).toBe('test-component');
      expect(result[0].dependencies).toEqual([]);
    });

    it('should throw error for invalid SBOM file', () => {
      const invalidSBOMData = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4'
        // missing components
      } as any;

      expect(() => parseSBOMFile(invalidSBOMData)).toThrow('Invalid SBOM file: missing components');
    });
  });

  describe('validateSBOMFile', () => {
    it('should validate correct SBOM file structure', () => {
      const validSBOMData = {
        bomFormat: 'CycloneDX',
        components: [
          {
            name: 'test',
            version: '1.0.0'
          }
        ]
      };

      expect(validateSBOMFile(validSBOMData)).toBe(true);
    });

    it('should reject invalid SBOM file structures', () => {
      expect(validateSBOMFile(null)).toBe(false);
      expect(validateSBOMFile(undefined)).toBe(false);
      expect(validateSBOMFile({})).toBe(false);
      expect(validateSBOMFile({ bomFormat: 'CycloneDX' })).toBe(false);
      expect(validateSBOMFile({ components: [] })).toBe(false);
      expect(validateSBOMFile({ bomFormat: 'CycloneDX', components: 'not-array' })).toBe(false);
    });

    it('should handle parsing errors gracefully', () => {
      // Create a circular reference to cause JSON.stringify to fail
      const circularRef: any = { bomFormat: 'CycloneDX' };
      circularRef.self = circularRef;

      expect(validateSBOMFile(circularRef)).toBe(false);
    });
  });
});
