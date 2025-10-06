import { SBOMComponent } from '../types/sbom';

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  packageManagers: string[];
  icon: string;
}

export const SUPPORTED_PROJECT_TYPES: ProjectType[] = [
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'JavaScript/TypeScript projects with package.json',
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    packageManagers: ['npm', 'yarn', 'pnpm'],
    icon: '📦'
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python projects with requirements.txt or pyproject.toml',
    extensions: ['.py', '.pyc', '.pyo'],
    packageManagers: ['pip', 'poetry', 'conda'],
    icon: '🐍'
  },
  {
    'id': 'java',
    name: 'Java',
    description: 'Java projects with Maven or Gradle',
    extensions: ['.java', '.class', '.jar'],
    packageManagers: ['maven', 'gradle'],
    icon: '☕'
  },
  {
    id: 'dotnet',
    name: '.NET',
    description: '.NET projects with .csproj or packages.config',
    extensions: ['.cs', '.vb', '.fs'],
    packageManagers: ['nuget'],
    icon: '🔷'
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Go projects with go.mod',
    extensions: ['.go'],
    packageManagers: ['go mod'],
    icon: '🐹'
  },
  {
    id: 'rust',
    name: 'Rust',
    description: 'Rust projects with Cargo.toml',
    extensions: ['.rs'],
    packageManagers: ['cargo'],
    icon: '🦀'
  },
  {
    id: 'php',
    name: 'PHP',
    description: 'PHP projects with composer.json',
    extensions: ['.php'],
    packageManagers: ['composer'],
    icon: '🐘'
  }
];

export interface GenerationOptions {
  projectType: string;
  includeDevDependencies: boolean;
  includeOptionalDependencies: boolean;
  outputFormat: 'json' | 'xml';
  includeMetadata: boolean;
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

/**
 * Detects project type based on uploaded files
 */
export function detectProjectType(files: File[]): ProjectType | null {
  const fileNames = files.map(f => f.name.toLowerCase());
  
  for (const projectType of SUPPORTED_PROJECT_TYPES) {
    const hasPackageFile = projectType.packageManagers.some(manager => {
      switch (manager) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          return fileNames.some(name => name === 'package.json');
        case 'pip':
          return fileNames.some(name => name === 'requirements.txt');
        case 'poetry':
          return fileNames.some(name => name === 'pyproject.toml');
        case 'maven':
          return fileNames.some(name => name === 'pom.xml');
        case 'gradle':
          return fileNames.some(name => name === 'build.gradle' || name === 'build.gradle.kts');
        case 'nuget':
          return fileNames.some(name => name.endsWith('.csproj') || name === 'packages.config');
        case 'go mod':
          return fileNames.some(name => name === 'go.mod');
        case 'cargo':
          return fileNames.some(name => name === 'cargo.toml');
        case 'composer':
          return fileNames.some(name => name === 'composer.json');
        default:
          return false;
      }
    });

    if (hasPackageFile) {
      return projectType;
    }
  }

  return null;
}

/**
 * Generates SBOM from uploaded project files
 */
export async function generateSBOMFromCode(
  files: File[],
  options: GenerationOptions
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  try {
    // Detect project type if not specified
    const detectedType = options.projectType || detectProjectType(files);
    if (!detectedType) {
      return {
        success: false,
        error: 'Could not detect project type. Please ensure you have uploaded the appropriate package manager files (package.json, requirements.txt, pom.xml, etc.)'
      };
    }

    // Create a temporary directory structure
    const projectFiles = await createProjectStructure(files);
    
    // Generate SBOM based on project type
    let sbomData: SBOMComponent[];
    
    switch (detectedType.id) {
      case 'nodejs':
        sbomData = await generateNodeJSSBOM(projectFiles, options);
        break;
      case 'python':
        sbomData = await generatePythonSBOM(projectFiles, options);
        break;
      case 'java':
        sbomData = await generateJavaSBOM(projectFiles, options);
        break;
      case 'dotnet':
        sbomData = await generateDotNetSBOM(projectFiles, options);
        break;
      case 'go':
        sbomData = await generateGoSBOM(projectFiles, options);
        break;
      case 'rust':
        sbomData = await generateRustSBOM(projectFiles, options);
        break;
      case 'php':
        sbomData = await generatePHPSBOM(projectFiles, options);
        break;
      default:
        throw new Error(`Unsupported project type: ${detectedType.id}`);
    }

    const generationTime = Date.now() - startTime;

    return {
      success: true,
      sbomData,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectType: detectedType.name,
        totalComponents: sbomData.length,
        generationTime
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during SBOM generation'
    };
  }
}

/**
 * Creates a virtual project structure from uploaded files
 */
async function createProjectStructure(files: File[]): Promise<Map<string, string>> {
  const projectFiles = new Map<string, string>();
  
  for (const file of files) {
    const content = await file.text();
    projectFiles.set(file.name, content);
  }
  
  return projectFiles;
}

/**
 * Generates SBOM for Node.js projects
 */
async function generateNodeJSSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const packageJsonContent = projectFiles.get('package.json');
  if (!packageJsonContent) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(packageJsonContent);
  const components: SBOMComponent[] = [];

  // Add main project as component
  components.push({
    id: `${packageJson.name}@${packageJson.version}`,
    name: packageJson.name || 'Unknown Project',
    version: packageJson.version || '0.0.0',
    type: 'application',
    license: packageJson.license || 'Unknown',
    description: packageJson.description || '',
    publisher: packageJson.author?.name || packageJson.author || 'Unknown',
    riskLevel: 'low',
    vulnerabilities: [],
    dependencies: [],
    metadata: {
      source: 'package.json',
      homepage: packageJson.homepage,
      repository: packageJson.repository?.url,
      keywords: packageJson.keywords || []
    }
  });

  // Process dependencies
  const dependencies = { ...packageJson.dependencies };
  if (options.includeDevDependencies && packageJson.devDependencies) {
    Object.assign(dependencies, packageJson.devDependencies);
  }
  if (options.includeOptionalDependencies && packageJson.optionalDependencies) {
    Object.assign(dependencies, packageJson.optionalDependencies);
  }

  for (const [name, version] of Object.entries(dependencies)) {
    const versionStr = typeof version === 'string' ? version : 'unknown';
    components.push({
      id: `${name}@${versionStr}`,
      name,
      version: versionStr,
      type: 'library',
      license: 'Unknown',
      description: '',
      publisher: 'Unknown',
      riskLevel: 'medium',
      vulnerabilities: [],
      dependencies: [],
      metadata: {
        source: 'npm',
        packageManager: 'npm'
      }
    });
  }

  return components;
}

/**
 * Generates SBOM for Python projects
 */
async function generatePythonSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  // Check for requirements.txt
  const requirementsContent = projectFiles.get('requirements.txt');
  if (requirementsContent) {
    const lines = requirementsContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [name, version] = trimmed.split(/[>=<!=]/);
        if (name) {
          components.push({
            id: `${name.trim()}@${version?.trim() || 'latest'}`,
            name: name.trim(),
            version: version?.trim() || 'latest',
            type: 'library',
            license: 'Unknown',
            description: '',
            publisher: 'Unknown',
            riskLevel: 'medium',
            vulnerabilities: [],
            dependencies: [],
            metadata: {
              source: 'pip',
              packageManager: 'pip'
            }
          });
        }
      }
    }
  }

  // Check for pyproject.toml
  const pyprojectContent = projectFiles.get('pyproject.toml');
  if (pyprojectContent) {
    // Simple TOML parsing for dependencies
    const lines = pyprojectContent.split('\n');
    let inDependencies = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[tool.poetry.dependencies]' || trimmed === '[dependencies]') {
        inDependencies = true;
        continue;
      }
      if (trimmed.startsWith('[') && inDependencies) {
        break;
      }
      if (inDependencies && trimmed && !trimmed.startsWith('#')) {
        const [name, version] = trimmed.split('=');
        if (name && !name.includes('python')) {
          components.push({
            id: `${name.trim()}@${version?.trim().replace(/['"]/g, '') || 'latest'}`,
            name: name.trim(),
            version: version?.trim().replace(/['"]/g, '') || 'latest',
            type: 'library',
            license: 'Unknown',
            description: '',
            publisher: 'Unknown',
            riskLevel: 'medium',
            vulnerabilities: [],
            dependencies: [],
            metadata: {
              source: 'poetry',
              packageManager: 'poetry'
            }
          });
        }
      }
    }
  }

  return components;
}

/**
 * Generates SBOM for Java projects (Maven)
 */
async function generateJavaSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  const pomContent = projectFiles.get('pom.xml');
  if (pomContent) {
    // Simple XML parsing for Maven dependencies
    const dependencyRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/g;
    let match;
    
    while ((match = dependencyRegex.exec(pomContent)) !== null) {
      const [, groupId, artifactId, version] = match;
      components.push({
        id: `${groupId}:${artifactId}@${version}`,
        name: `${groupId}:${artifactId}`,
        version,
        type: 'library',
        license: 'Unknown',
        description: '',
        publisher: 'Unknown',
        riskLevel: 'medium',
        vulnerabilities: [],
        dependencies: [],
        metadata: {
          source: 'maven',
          packageManager: 'maven',
          groupId,
          artifactId
        }
      });
    }
  }

  return components;
}

/**
 * Generates SBOM for .NET projects
 */
async function generateDotNetSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  // Check for .csproj files
  for (const [fileName, content] of projectFiles) {
    if (fileName.endsWith('.csproj')) {
      // Simple XML parsing for NuGet packages
      const packageRegex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/?>/g;
      let match;
      
      while ((match = packageRegex.exec(content)) !== null) {
        const [, name, version] = match;
        components.push({
          id: `${name}@${version}`,
          name,
          version,
          type: 'library',
          license: 'Unknown',
          description: '',
          publisher: 'Unknown',
          riskLevel: 'medium',
          vulnerabilities: [],
          dependencies: [],
          metadata: {
            source: 'nuget',
            packageManager: 'nuget'
          }
        });
      }
    }
  }

  return components;
}

/**
 * Generates SBOM for Go projects
 */
async function generateGoSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  const goModContent = projectFiles.get('go.mod');
  if (goModContent) {
    const lines = goModContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('require ') || (trimmed && !trimmed.startsWith('module ') && !trimmed.startsWith('go ') && !trimmed.startsWith('//'))) {
        const parts = trimmed.split(' ');
        if (parts.length >= 2) {
          const name = parts[0];
          const version = parts[1];
          components.push({
            id: `${name}@${version}`,
            name,
            version,
            type: 'library',
            license: 'Unknown',
            description: '',
            publisher: 'Unknown',
            riskLevel: 'medium',
            vulnerabilities: [],
            dependencies: [],
            metadata: {
              source: 'go mod',
              packageManager: 'go mod'
            }
          });
        }
      }
    }
  }

  return components;
}

/**
 * Generates SBOM for Rust projects
 */
async function generateRustSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  const cargoContent = projectFiles.get('Cargo.toml');
  if (cargoContent) {
    // Simple TOML parsing for Cargo dependencies
    const lines = cargoContent.split('\n');
    let inDependencies = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[dependencies]') {
        inDependencies = true;
        continue;
      }
      if (trimmed.startsWith('[') && inDependencies) {
        break;
      }
      if (inDependencies && trimmed && !trimmed.startsWith('#')) {
        const [name, version] = trimmed.split('=');
        if (name) {
          components.push({
            id: `${name.trim()}@${version?.trim().replace(/['"]/g, '') || 'latest'}`,
            name: name.trim(),
            version: version?.trim().replace(/['"]/g, '') || 'latest',
            type: 'library',
            license: 'Unknown',
            description: '',
            publisher: 'Unknown',
            riskLevel: 'medium',
            vulnerabilities: [],
            dependencies: [],
            metadata: {
              source: 'cargo',
              packageManager: 'cargo'
            }
          });
        }
      }
    }
  }

  return components;
}

/**
 * Generates SBOM for PHP projects
 */
async function generatePHPSBOM(
  projectFiles: Map<string, string>,
  options: GenerationOptions
): Promise<SBOMComponent[]> {
  const components: SBOMComponent[] = [];
  
  const composerContent = projectFiles.get('composer.json');
  if (composerContent) {
    const composer = JSON.parse(composerContent);
    
    // Add main project
    if (composer.name) {
      components.push({
        id: `${composer.name}@${composer.version || '0.0.0'}`,
        name: composer.name,
        version: composer.version || '0.0.0',
        type: 'application',
        license: composer.license || 'Unknown',
        description: composer.description || '',
        publisher: 'Unknown',
        riskLevel: 'low',
        vulnerabilities: [],
        dependencies: [],
        metadata: {
          source: 'composer.json',
          homepage: composer.homepage,
          repository: composer.repository?.url,
          keywords: composer.keywords || []
        }
      });
    }

    // Process dependencies
    const dependencies = { ...composer.require };
    if (options.includeDevDependencies && composer['require-dev']) {
      Object.assign(dependencies, composer['require-dev']);
    }

    for (const [name, version] of Object.entries(dependencies)) {
      const versionStr = typeof version === 'string' ? version : 'unknown';
      components.push({
        id: `${name}@${versionStr}`,
        name,
        version: versionStr,
        type: 'library',
        license: 'Unknown',
        description: '',
        publisher: 'Unknown',
        riskLevel: 'medium',
        vulnerabilities: [],
        dependencies: [],
        metadata: {
          source: 'composer',
          packageManager: 'composer'
        }
      });
    }
  }

  return components;
}
