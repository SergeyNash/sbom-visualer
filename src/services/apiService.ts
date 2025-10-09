import { SBOMComponent } from '../types/sbom';

const API_BASE_URL = 'http://localhost:5000/api';

export interface GenerationOptions {
  projectType?: string;
  includeDevDependencies?: boolean;
  includeOptionalDependencies?: boolean;
  outputFormat?: string;
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

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  packageManagers: string[];
  icon: string;
}

/**
 * Uploads and parses a single SBOM file
 */
export async function uploadSbom(file: File): Promise<SBOMComponent[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/sbom/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload SBOM');
  }

  return response.json();
}

/**
 * Uploads and merges multiple SBOM files
 */
export async function uploadMultipleSboms(files: File[]): Promise<SBOMComponent[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/sbom/upload-multiple`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload multiple SBOMs');
  }

  return response.json();
}

/**
 * Validates SBOM file format
 */
export async function validateSbom(file: File): Promise<boolean> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/sbom/validate`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result.valid;
}

/**
 * Merges multiple component lists
 */
export async function mergeSboms(componentLists: SBOMComponent[][]): Promise<SBOMComponent[]> {
  const response = await fetch(`${API_BASE_URL}/sbom/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(componentLists),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to merge SBOMs');
  }

  return response.json();
}

/**
 * Gets list of supported project types
 */
export async function getProjectTypes(): Promise<ProjectType[]> {
  const response = await fetch(`${API_BASE_URL}/generator/project-types`);

  if (!response.ok) {
    throw new Error('Failed to get project types');
  }

  return response.json();
}

/**
 * Detects project type from uploaded files
 */
export async function detectProjectType(files: File[]): Promise<ProjectType | null> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/generator/detect-project-type`, {
    method: 'POST',
    body: formData,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to detect project type');
  }

  return response.json();
}

/**
 * Generates SBOM from uploaded source code files
 */
export async function generateFromCode(
  files: File[],
  options: GenerationOptions
): Promise<GenerationResult> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });

  // Add options
  if (options.projectType) {
    formData.append('options.projectType', options.projectType);
  }
  if (options.includeDevDependencies !== undefined) {
    formData.append('options.includeDevDependencies', String(options.includeDevDependencies));
  }
  if (options.includeOptionalDependencies !== undefined) {
    formData.append('options.includeOptionalDependencies', String(options.includeOptionalDependencies));
  }
  if (options.outputFormat) {
    formData.append('options.outputFormat', options.outputFormat);
  }
  if (options.includeMetadata !== undefined) {
    formData.append('options.includeMetadata', String(options.includeMetadata));
  }

  const response = await fetch(`${API_BASE_URL}/generator/generate-from-code`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to generate SBOM from code');
  }

  return result;
}

/**
 * Generates SBOM from uploaded archive
 */
export async function generateFromArchive(
  archive: File,
  options: GenerationOptions
): Promise<GenerationResult> {
  const formData = new FormData();
  formData.append('archive', archive);

  // Add options
  if (options.projectType) {
    formData.append('options.projectType', options.projectType);
  }
  if (options.includeDevDependencies !== undefined) {
    formData.append('options.includeDevDependencies', String(options.includeDevDependencies));
  }
  if (options.includeOptionalDependencies !== undefined) {
    formData.append('options.includeOptionalDependencies', String(options.includeOptionalDependencies));
  }
  if (options.outputFormat) {
    formData.append('options.outputFormat', options.outputFormat);
  }
  if (options.includeMetadata !== undefined) {
    formData.append('options.includeMetadata', String(options.includeMetadata));
  }

  const response = await fetch(`${API_BASE_URL}/generator/generate-from-archive`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to generate SBOM from archive');
  }

  return result;
}

/**
 * Checks if a file is a supported archive format
 */
export async function isSupportedArchive(fileName: string): Promise<boolean> {
  const response = await fetch(
    `${API_BASE_URL}/archive/is-supported?fileName=${encodeURIComponent(fileName)}`
  );

  const result = await response.json();
  return result.supported;
}

