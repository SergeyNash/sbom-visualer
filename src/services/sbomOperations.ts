import type { SBOMComponent } from '../types/sbom';
import * as api from './apiService';
import { parseSBOMFile, validateSBOMFile } from '../utils/sbomParser';
import { mergeSBOMs } from '../utils/sbomMerger';
import {
  detectProjectType as detectProjectTypeLocal,
  generateSBOMFromCode as generateSBOMFromCodeLocal,
  type GenerationOptions as LocalGenerationOptions,
  type GenerationResult as LocalGenerationResult,
  type ProjectType as LocalProjectType,
} from '../utils/sbomGenerator';
import {
  extractAndProcessArchive,
  convertExtractedFilesToFileObjects,
  SUPPORTED_ARCHIVE_EXTENSIONS,
} from '../utils/archiveExtractor';

export type DataMode = 'auto' | 'api' | 'local';

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  packageManagers: string[];
  icon: string;
}

export interface GenerationOptions {
  projectType?: string;
  includeDevDependencies?: boolean;
  includeOptionalDependencies?: boolean;
  outputFormat?: 'json' | 'xml';
  includeMetadata?: boolean;
}

export interface GenerationResult {
  success: boolean;
  sbomData?: SBOMComponent[];
  error?: string;
  warnings?: string[];
  metadata?: {
    generatedAt: string;
    projectType: string;
    totalComponents: number;
    generationTime: number;
  };
}

export interface SbomOperations {
  uploadSbom: (file: File) => Promise<SBOMComponent[]>;
  uploadMultipleSboms: (files: File[]) => Promise<SBOMComponent[]>;
  validateSbom: (file: File) => Promise<boolean>;
  detectProjectType: (files: File[]) => Promise<ProjectType | null>;
  generateFromCode: (files: File[], options: GenerationOptions) => Promise<GenerationResult>;
  generateFromArchive: (archive: File, options: GenerationOptions) => Promise<GenerationResult>;
  isSupportedArchive: (fileName: string) => Promise<boolean>;
}

function isProbablyNetworkError(err: unknown): boolean {
  // fetch() network errors usually come as TypeError with message like:
  // - "Failed to fetch" (Chromium)
  // - "NetworkError when attempting to fetch resource." (Firefox)
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('fetch') && m.includes('network')
  );
}

function toLocalGenerationOptions(options: GenerationOptions): LocalGenerationOptions {
  return {
    projectType: options.projectType ?? '',
    includeDevDependencies: options.includeDevDependencies ?? true,
    includeOptionalDependencies: options.includeOptionalDependencies ?? false,
    outputFormat: options.outputFormat ?? 'json',
    includeMetadata: options.includeMetadata ?? true,
  };
}

function toUnifiedProjectType(pt: LocalProjectType | ProjectType): ProjectType {
  return {
    id: pt.id,
    name: pt.name,
    description: pt.description,
    extensions: pt.extensions,
    packageManagers: pt.packageManagers,
    icon: pt.icon,
  };
}

async function localParseSbomFile(file: File): Promise<SBOMComponent[]> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!validateSBOMFile(data)) {
    throw new Error('Invalid SBOM file format. Please ensure it follows CycloneDX or SPDX format.');
  }

  return parseSBOMFile(data);
}

async function localUploadMultiple(files: File[]): Promise<SBOMComponent[]> {
  const all = await Promise.all(files.map(localParseSbomFile));
  return mergeSBOMs(all);
}

async function localGenerateFromArchive(archive: File, options: GenerationOptions): Promise<GenerationResult> {
  const extraction = await extractAndProcessArchive(archive);
  if (!extraction.success || !extraction.files) {
    return {
      success: false,
      error: extraction.error || 'Failed to extract archive',
    };
  }
  const files = convertExtractedFilesToFileObjects(extraction.files);
  const localResult = await generateSBOMFromCodeLocal(files, toLocalGenerationOptions(options));
  return localResult as LocalGenerationResult as GenerationResult;
}

function isSupportedArchiveByExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function createSbomOperations(mode: DataMode): SbomOperations {
  const tryApi = mode === 'auto' || mode === 'api';
  const allowFallback = mode === 'auto';

  return {
    async uploadSbom(file) {
      if (!tryApi) return localParseSbomFile(file);
      try {
        return await api.uploadSbom(file);
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          return await localParseSbomFile(file);
        }
        throw err;
      }
    },

    async uploadMultipleSboms(files) {
      if (!tryApi) return localUploadMultiple(files);
      try {
        return await api.uploadMultipleSboms(files);
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          return await localUploadMultiple(files);
        }
        throw err;
      }
    },

    async validateSbom(file) {
      if (!tryApi) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          return validateSBOMFile(data);
        } catch {
          return false;
        }
      }

      try {
        return await api.validateSbom(file);
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            return validateSBOMFile(data);
          } catch {
            return false;
          }
        }
        throw err;
      }
    },

    async detectProjectType(files) {
      if (!tryApi) return Promise.resolve(detectProjectTypeLocal(files));
      try {
        const pt = await api.detectProjectType(files);
        return pt ? toUnifiedProjectType(pt) : null;
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          const localPt = detectProjectTypeLocal(files);
          return localPt ? toUnifiedProjectType(localPt) : null;
        }
        throw err;
      }
    },

    async generateFromCode(files, options) {
      if (!tryApi) {
        const localResult = await generateSBOMFromCodeLocal(files, toLocalGenerationOptions(options));
        return localResult as LocalGenerationResult as GenerationResult;
      }

      try {
        const result = await api.generateFromCode(files, options);
        return result as api.GenerationResult as GenerationResult;
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          const localResult = await generateSBOMFromCodeLocal(files, toLocalGenerationOptions(options));
          return localResult as LocalGenerationResult as GenerationResult;
        }
        throw err;
      }
    },

    async generateFromArchive(archive, options) {
      if (!tryApi) return localGenerateFromArchive(archive, options);
      try {
        const result = await api.generateFromArchive(archive, options);
        return result as api.GenerationResult as GenerationResult;
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          return localGenerateFromArchive(archive, options);
        }
        throw err;
      }
    },

    async isSupportedArchive(fileName) {
      if (!tryApi) return Promise.resolve(isSupportedArchiveByExtension(fileName));
      try {
        return await api.isSupportedArchive(fileName);
      } catch (err) {
        if (allowFallback && isProbablyNetworkError(err)) {
          return isSupportedArchiveByExtension(fileName);
        }
        throw err;
      }
    },
  };
}

