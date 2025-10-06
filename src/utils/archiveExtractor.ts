import JSZip from 'jszip';

export interface ExtractedFile {
  name: string;
  content: string;
  size: number;
  path: string;
}

export interface ArchiveExtractionResult {
  success: boolean;
  files?: ExtractedFile[];
  error?: string;
  metadata?: {
    totalFiles: number;
    totalSize: number;
    archiveType: string;
    extractionTime: number;
  };
}

/**
 * Supported archive formats
 */
export const SUPPORTED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream' // For .zip files that might not have correct MIME type
];

/**
 * Supported archive file extensions
 */
export const SUPPORTED_ARCHIVE_EXTENSIONS = [
  '.zip',
  '.tar.gz',
  '.tgz',
  '.tar',
  '.gz'
];

/**
 * Maximum file size for archives (100MB)
 */
export const MAX_ARCHIVE_SIZE = 100 * 1024 * 1024;

/**
 * Maximum number of files to extract from archive
 */
export const MAX_FILES_IN_ARCHIVE = 10000;

/**
 * Maximum individual file size (10MB)
 */
export const MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Checks if a file is a supported archive
 */
export function isSupportedArchive(file: File): boolean {
  // Check by MIME type
  if (SUPPORTED_ARCHIVE_TYPES.includes(file.type)) {
    return true;
  }

  // Check by file extension
  const fileName = file.name.toLowerCase();
  return SUPPORTED_ARCHIVE_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

/**
 * Extracts files from a ZIP archive
 */
export async function extractZipArchive(file: File): Promise<ArchiveExtractionResult> {
  const startTime = Date.now();

  try {
    // Validate file size
    if (file.size > MAX_ARCHIVE_SIZE) {
      return {
        success: false,
        error: `Archive size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${MAX_ARCHIVE_SIZE / 1024 / 1024}MB)`
      };
    }

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(arrayBuffer);

    const extractedFiles: ExtractedFile[] = [];
    let totalSize = 0;
    let fileCount = 0;

    // Extract files from ZIP
    for (const [relativePath, zipEntry] of Object.entries(zipContents.files)) {
      // Skip directories
      if (zipEntry.dir) {
        continue;
      }

      // Limit number of files
      if (fileCount >= MAX_FILES_IN_ARCHIVE) {
        return {
          success: false,
          error: `Archive contains too many files (${fileCount}+). Maximum allowed: ${MAX_FILES_IN_ARCHIVE}`
        };
      }

      // Check individual file size
      if (zipEntry.uncompressedSize > MAX_INDIVIDUAL_FILE_SIZE) {
        console.warn(`Skipping large file: ${relativePath} (${(zipEntry.uncompressedSize / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }

      try {
        // Extract file content
        const content = await zipEntry.async('text');
        const fileName = relativePath.split('/').pop() || relativePath;

        extractedFiles.push({
          name: fileName,
          content,
          size: content.length,
          path: relativePath
        });

        totalSize += content.length;
        fileCount++;

      } catch (error) {
        console.warn(`Failed to extract file: ${relativePath}`, error);
        continue;
      }
    }

    const extractionTime = Date.now() - startTime;

    return {
      success: true,
      files: extractedFiles,
      metadata: {
        totalFiles: fileCount,
        totalSize,
        archiveType: 'ZIP',
        extractionTime
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract ZIP archive'
    };
  }
}

/**
 * Converts extracted files to File objects for compatibility with existing code
 */
export function convertExtractedFilesToFileObjects(extractedFiles: ExtractedFile[]): File[] {
  return extractedFiles.map(extractedFile => {
    const blob = new Blob([extractedFile.content], { type: 'text/plain' });
    return new File([blob], extractedFile.name, {
      type: 'text/plain',
      lastModified: Date.now()
    });
  });
}

/**
 * Filters extracted files to only include relevant project files
 */
export function filterRelevantProjectFiles(extractedFiles: ExtractedFile[]): ExtractedFile[] {
  const relevantExtensions = [
    // Package manager files
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py',
    'pom.xml', 'build.gradle', 'build.gradle.kts',
    '*.csproj', 'packages.config', '*.sln',
    'go.mod', 'go.sum',
    'Cargo.toml', 'Cargo.lock',
    'composer.json', 'composer.lock',
    
    // Source code files
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.cs', '.vb', '.fs',
    '.go', '.rs', '.php',
    
    // Config files
    '.json', '.toml', '.yaml', '.yml', '.xml'
  ];

  return extractedFiles.filter(file => {
    const fileName = file.name.toLowerCase();
    const filePath = file.path.toLowerCase();

    // Check if it's a package manager file
    const isPackageManagerFile = relevantExtensions.some(ext => 
      fileName === ext || fileName.endsWith(ext.replace('*', ''))
    );

    // Check if it's a source code file
    const isSourceFile = relevantExtensions.some(ext => 
      ext.startsWith('.') && fileName.endsWith(ext)
    );

    // Check if it's in a relevant directory (not in node_modules, .git, etc.)
    const isInRelevantDirectory = !filePath.includes('node_modules') &&
                                 !filePath.includes('.git') &&
                                 !filePath.includes('dist') &&
                                 !filePath.includes('build') &&
                                 !filePath.includes('.vscode') &&
                                 !filePath.includes('.idea');

    return (isPackageManagerFile || isSourceFile) && isInRelevantDirectory;
  });
}

/**
 * Main function to extract and process archive files
 */
export async function extractAndProcessArchive(file: File): Promise<ArchiveExtractionResult> {
  if (!isSupportedArchive(file)) {
    return {
      success: false,
      error: 'Unsupported archive format. Please upload a ZIP file.'
    };
  }

  // For now, we only support ZIP files
  // TAR.GZ support would require additional libraries
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      success: false,
      error: 'Currently only ZIP archives are supported. TAR.GZ support coming soon.'
    };
  }

  const result = await extractZipArchive(file);
  
  if (result.success && result.files) {
    // Filter to only relevant project files
    const relevantFiles = filterRelevantProjectFiles(result.files);
    
    return {
      ...result,
      files: relevantFiles,
      metadata: {
        ...result.metadata!,
        totalFiles: relevantFiles.length
      }
    };
  }

  return result;
}


