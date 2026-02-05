import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSbomOperations } from '../sbomOperations';

vi.mock('../apiService', () => ({
  uploadSbom: vi.fn(),
  uploadMultipleSboms: vi.fn(),
  validateSbom: vi.fn(),
  detectProjectType: vi.fn(),
  generateFromCode: vi.fn(),
  generateFromArchive: vi.fn(),
  isSupportedArchive: vi.fn(),
}));

vi.mock('../../utils/sbomParser', () => ({
  validateSBOMFile: vi.fn(() => true),
  parseSBOMFile: vi.fn(() => [
    {
      id: 'a@1.0.0',
      name: 'a',
      type: 'library',
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low',
      cveCount: 0,
      dependencies: [],
      description: 'a',
    },
  ]),
}));

vi.mock('../../utils/sbomMerger', () => ({
  mergeSBOMs: vi.fn((lists: any[]) => lists.flat()),
}));

vi.mock('../../utils/sbomGenerator', () => ({
  detectProjectType: vi.fn(() => null),
  generateSBOMFromCode: vi.fn(async () => ({ success: false, error: 'not implemented' })),
}));

vi.mock('../../utils/archiveExtractor', () => ({
  extractAndProcessArchive: vi.fn(async () => ({ success: false, error: 'not implemented' })),
  convertExtractedFilesToFileObjects: vi.fn(() => []),
  SUPPORTED_ARCHIVE_EXTENSIONS: ['.zip'],
}));

describe('sbomOperations (dual-mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto mode uses API when available', async () => {
    const api = await import('../apiService');
    vi.mocked(api.uploadSbom).mockResolvedValue([
      {
        id: 'api@1',
        name: 'api',
        type: 'library',
        license: 'MIT',
        version: '1',
        riskLevel: 'low',
        cveCount: 0,
        dependencies: [],
        description: 'api',
      },
    ]);

    const ops = createSbomOperations('auto');
    const file = new File(['{"bomFormat":"CycloneDX","components":[]}'], 'sbom.json', {
      type: 'application/json',
    });

    const result = await ops.uploadSbom(file);
    expect(api.uploadSbom).toHaveBeenCalledTimes(1);
    expect(result[0].id).toBe('api@1');
  });

  it('auto mode falls back to local on network error', async () => {
    const api = await import('../apiService');
    const parser = await import('../../utils/sbomParser');

    vi.mocked(api.uploadSbom).mockRejectedValue(new TypeError('Failed to fetch'));

    const ops = createSbomOperations('auto');
    const file = new File(['{"bomFormat":"CycloneDX","components":[{"name":"a","version":"1"}]}'], 'sbom.json', {
      type: 'application/json',
    });

    const result = await ops.uploadSbom(file);
    expect(api.uploadSbom).toHaveBeenCalledTimes(1);
    expect(parser.parseSBOMFile).toHaveBeenCalledTimes(1);
    expect(result[0].id).toBe('a@1.0.0');
  });

  it('api mode does not fall back on network error', async () => {
    const api = await import('../apiService');
    const parser = await import('../../utils/sbomParser');

    vi.mocked(api.uploadSbom).mockRejectedValue(new TypeError('Failed to fetch'));

    const ops = createSbomOperations('api');
    const file = new File(['{"bomFormat":"CycloneDX","components":[{"name":"a","version":"1"}]}'], 'sbom.json', {
      type: 'application/json',
    });

    await expect(ops.uploadSbom(file)).rejects.toThrow();
    expect(parser.parseSBOMFile).not.toHaveBeenCalled();
  });
});

