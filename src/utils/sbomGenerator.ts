import { RawSbomFile, SBOMComponent, SbomFormat, SBOMFile } from '../types/sbom';

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
  sbomFormat: SbomFormat;
  generateBoth: boolean;
}

export interface GenerationResult {
  success: boolean;
  sbomData?: SBOMComponent[];
  rawSboms?: RawSbomFile[];
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

  const sourceType = detectProjectTypeBySourceFiles(fileNames);
  if (sourceType) {
    return sourceType;
  }

  return null;
}

const TOOL_VENDOR = 'sbom-visualer';
const TOOL_NAME = 'sbom-visualer';
const TOOL_VERSION = 'dev';

function normalizeFormat(format?: string): SbomFormat {
  return format === 'spdx' ? 'spdx' : 'cyclonedx';
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const part = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${part()}${part()}-${part()}-${part()}-${part()}-${part()}${part()}${part()}`;
}

function toSpdxId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9.-]+/g, '-');
  return `SPDXRef-${cleaned || 'component'}`;
}

function buildCycloneDxJson(components: SBOMComponent[]): SBOMFile {
  const now = new Date().toISOString();
  const serialNumber = `urn:uuid:${makeUuid()}`;

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber,
    version: 1,
    metadata: {
      timestamp: now,
      tools: [
        {
          vendor: TOOL_VENDOR,
          name: TOOL_NAME,
          version: TOOL_VERSION,
        },
      ],
    },
    components: components.map((component) => {
      const externalReferences = [];
      if (component.metadata?.homepage) {
        externalReferences.push({ type: 'website', url: component.metadata.homepage });
      }
      if (component.metadata?.repository) {
        externalReferences.push({ type: 'vcs', url: component.metadata.repository });
      }

      return {
        'bom-ref': component.id,
        type: component.type === 'application' ? 'application' : 'library',
        name: component.name,
        version: component.version,
        licenses: component.license && component.license !== 'Unknown'
          ? [{ license: { name: component.license } }]
          : undefined,
        description: component.description || undefined,
        externalReferences: externalReferences.length > 0 ? externalReferences : undefined,
      };
    }),
    dependencies: components.map((component) => ({
      ref: component.id,
      dependsOn: component.dependencies ?? [],
    })),
  };
}

function buildCycloneDxXml(components: SBOMComponent[]): string {
  const json = buildCycloneDxJson(components);
  const componentsXml = json.components
    .map((component) => {
      const licensesXml = component.licenses
        ? `<licenses>${component.licenses
            .map((lic) => `<license><name>${lic.license.name ?? ''}</name></license>`)
            .join('')}</licenses>`
        : '';
      const descXml = component.description ? `<description>${component.description}</description>` : '';
      const refsXml = component.externalReferences
        ? `<externalReferences>${component.externalReferences
            .map((ref) => `<reference type="${ref.type}"><url>${ref.url}</url></reference>`)
            .join('')}</externalReferences>`
        : '';
      return `<component type="${component.type}" bom-ref="${component['bom-ref']}"><name>${component.name}</name><version>${component.version}</version>${licensesXml}${descXml}${refsXml}</component>`;
    })
    .join('');

  const dependenciesXml = (json.dependencies ?? [])
    .map((dep) => {
      const dependsOn = (dep.dependsOn ?? []).map((ref) => `<dependency ref="${ref}" />`).join('');
      return `<dependency ref="${dep.ref}">${dependsOn}</dependency>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><bom xmlns="http://cyclonedx.org/schema/bom/1.5" serialNumber="${json.serialNumber}" version="${json.version}"><metadata><timestamp>${json.metadata.timestamp}</timestamp><tools><tool><vendor>${TOOL_VENDOR}</vendor><name>${TOOL_NAME}</name><version>${TOOL_VERSION}</version></tool></tools></metadata><components>${componentsXml}</components><dependencies>${dependenciesXml}</dependencies></bom>`;
}

function buildSpdxJson(components: SBOMComponent[]): string {
  const now = new Date().toISOString();
  const projectName =
    components.find((c) => c.type === 'application')?.name ||
    components[0]?.name ||
    'SBOM-Project';

  const doc = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: projectName,
    creationInfo: {
      created: now,
      creators: [`Tool: ${TOOL_NAME}`],
    },
    packages: components.map((component) => ({
      name: component.name,
      SPDXID: toSpdxId(component.id),
      versionInfo: component.version,
      downloadLocation: 'NOASSERTION',
      licenseConcluded: component.license && component.license !== 'Unknown' ? component.license : 'NOASSERTION',
      licenseDeclared: component.license && component.license !== 'Unknown' ? component.license : 'NOASSERTION',
      filesAnalyzed: false,
      supplier: component.publisher ? `Organization: ${component.publisher}` : 'NOASSERTION',
      summary: component.description || undefined,
    })),
  };

  return JSON.stringify(doc, null, 2);
}

function buildRawSboms(components: SBOMComponent[], options: GenerationOptions): RawSbomFile[] {
  const formats: SbomFormat[] = options.generateBoth
    ? ['cyclonedx', 'spdx']
    : [normalizeFormat(options.sbomFormat)];

  const rawSboms: RawSbomFile[] = [];
  for (const format of formats) {
    if (format === 'cyclonedx') {
      if (options.outputFormat === 'xml') {
        rawSboms.push({
          format,
          content: buildCycloneDxXml(components),
          fileName: 'sbom.cyclonedx.xml',
          mediaType: 'application/xml',
        });
      } else {
        rawSboms.push({
          format,
          content: JSON.stringify(buildCycloneDxJson(components), null, 2),
          fileName: 'sbom.cyclonedx.json',
          mediaType: 'application/json',
        });
      }
    } else {
      rawSboms.push({
        format,
        content: buildSpdxJson(components),
        fileName: 'sbom.spdx.json',
        mediaType: 'application/json',
      });
    }
  }

  return rawSboms;
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
      rawSboms: buildRawSboms(sbomData, options),
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

  if (components.length === 0) {
    const imports = extractPythonImports(projectFiles);
    for (const name of imports) {
      components.push({
        id: `${name}@unknown`,
        name,
        version: 'unknown',
        type: 'library',
        license: 'Unknown',
        description: '',
        publisher: 'Unknown',
        riskLevel: 'medium',
        vulnerabilities: [],
        dependencies: [],
        metadata: {
          source: 'import-scan',
          packageManager: 'pip',
        },
      });
    }
  }

  return components;
}

function detectProjectTypeBySourceFiles(fileNames: string[]): ProjectType | null {
  const matches = (extensions: string[]) => fileNames.some(name => extensions.some(ext => name.endsWith(ext)));

  const byId: Record<string, ProjectType> = Object.fromEntries(
    SUPPORTED_PROJECT_TYPES.map(pt => [pt.id, pt])
  );

  if (matches(['.py'])) return byId.python ?? null;
  if (matches(['.js', '.jsx', '.ts', '.tsx'])) return byId.nodejs ?? null;
  if (matches(['.java'])) return byId.java ?? null;
  if (matches(['.cs', '.vb', '.fs'])) return byId.dotnet ?? null;
  if (matches(['.go'])) return byId.go ?? null;
  if (matches(['.rs'])) return byId.rust ?? null;
  if (matches(['.php'])) return byId.php ?? null;

  return null;
}

function extractPythonImports(projectFiles: Map<string, string>): string[] {
  const imports = new Set<string>();

  for (const [fileName, content] of projectFiles.entries()) {
    if (!fileName.toLowerCase().endsWith('.py')) continue;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('from ')) {
        const modulePart = trimmed.slice(5).split(' ')[0];
        if (!modulePart || modulePart.startsWith('.')) continue;
        const root = modulePart.split('.')[0];
        if (root) imports.add(root);
        continue;
      }

      if (trimmed.startsWith('import ')) {
        const importPart = trimmed.slice(7).split('#')[0];
        const items = importPart.split(',');
        for (const item of items) {
          const token = item.trim().split(' ')[0];
          if (!token || token.startsWith('.')) continue;
          const root = token.split('.')[0];
          if (root) imports.add(root);
        }
      }
    }
  }

  return Array.from(imports.values());
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
