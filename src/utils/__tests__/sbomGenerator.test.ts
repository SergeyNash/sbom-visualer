import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectProjectType, generateSBOMFromCode, SUPPORTED_PROJECT_TYPES } from '../sbomGenerator';
import { SBOMComponent } from '../../types/sbom';

describe('sbomGenerator', () => {
  describe('detectProjectType', () => {
    it('should detect Node.js project from package.json', () => {
      const files = [
        new File(['{"name": "test"}'], 'package.json', { type: 'application/json' }),
        new File(['console.log("test")'], 'index.js', { type: 'text/javascript' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'nodejs'));
    });

    it('should detect Python project from requirements.txt', () => {
      const files = [
        new File(['requests==2.28.0\nnumpy==1.21.0'], 'requirements.txt', { type: 'text/plain' }),
        new File(['print("hello")'], 'main.py', { type: 'text/x-python' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'python'));
    });

    it('should detect Python project from pyproject.toml', () => {
      const files = [
        new File(['[tool.poetry.dependencies]\nrequests = "2.28.0"'], 'pyproject.toml', { type: 'text/plain' }),
        new File(['print("hello")'], 'main.py', { type: 'text/x-python' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'python'));
    });

    it('should detect Java project from pom.xml', () => {
      const files = [
        new File(['<project><dependencies></dependencies></project>'], 'pom.xml', { type: 'text/xml' }),
        new File(['public class Test {}'], 'Test.java', { type: 'text/x-java' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'java'));
    });

    it('should detect Java project from build.gradle', () => {
      const files = [
        new File(['dependencies {\n  implementation "org.springframework:spring-core:5.3.0"\n}'], 'build.gradle', { type: 'text/plain' }),
        new File(['public class Test {}'], 'Test.java', { type: 'text/x-java' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'java'));
    });

    it('should detect .NET project from .csproj', () => {
      const files = [
        new File(['<Project><ItemGroup></ItemGroup></Project>'], 'Test.csproj', { type: 'text/xml' }),
        new File(['public class Test {}'], 'Test.cs', { type: 'text/x-csharp' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'dotnet'));
    });

    it('should detect Go project from go.mod', () => {
      const files = [
        new File(['module test\n\ngo 1.19'], 'go.mod', { type: 'text/plain' }),
        new File(['package main'], 'main.go', { type: 'text/x-go' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'go'));
    });

    it('should detect Rust project from Cargo.toml', () => {
      const files = [
        new File(['[package]\nname = "test"\n[dependencies]'], 'Cargo.toml', { type: 'text/plain' }),
        new File(['fn main() {}'], 'main.rs', { type: 'text/x-rust' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'rust'));
    });

    it('should detect PHP project from composer.json', () => {
      const files = [
        new File(['{"name": "test", "require": {}}'], 'composer.json', { type: 'application/json' }),
        new File(['<?php echo "hello"; ?>'], 'index.php', { type: 'text/x-php' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'php'));
    });

    it('should return null for unknown project type', () => {
      const files = [
        new File(['some random content'], 'unknown.txt', { type: 'text/plain' })
      ];

      const result = detectProjectType(files);

      expect(result).toBeNull();
    });

    it('should be case insensitive for file names', () => {
      const files = [
        new File(['{"name": "test"}'], 'PACKAGE.JSON', { type: 'application/json' })
      ];

      const result = detectProjectType(files);

      expect(result).toEqual(SUPPORTED_PROJECT_TYPES.find(t => t.id === 'nodejs'));
    });
  });

  describe('generateSBOMFromCode', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate SBOM for Node.js project', async () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project',
        author: 'Test Author',
        license: 'MIT',
        dependencies: {
          'react': '^18.0.0',
          'lodash': '^4.17.0'
        },
        devDependencies: {
          'typescript': '^4.0.0'
        }
      };

      const files = [
        new File([JSON.stringify(packageJson)], 'package.json', { type: 'application/json' })
      ];

      const options = {
        projectType: 'nodejs',
        includeDevDependencies: true,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(4); // 1 main project + 3 dependencies
      expect(result.metadata?.projectType).toBe('Node.js');
      expect(result.metadata?.totalComponents).toBe(4);

      // Check main project component
      const mainComponent = result.sbomData!.find(c => c.type === 'application');
      expect(mainComponent).toEqual({
        id: 'test-project@1.0.0',
        name: 'test-project',
        version: '1.0.0',
        type: 'application',
        license: 'MIT',
        description: 'Test project',
        publisher: 'Test Author',
        riskLevel: 'low',
        vulnerabilities: [],
        dependencies: [],
        metadata: {
          source: 'package.json',
          homepage: undefined,
          repository: undefined,
          keywords: undefined
        }
      });

      // Check dependency components
      const dependencyComponents = result.sbomData!.filter(c => c.type === 'library');
      expect(dependencyComponents).toHaveLength(3);
      expect(dependencyComponents.some(c => c.name === 'react')).toBe(true);
      expect(dependencyComponents.some(c => c.name === 'lodash')).toBe(true);
      expect(dependencyComponents.some(c => c.name === 'typescript')).toBe(true);
    });

    it('should generate SBOM for Python project with requirements.txt', async () => {
      const requirementsContent = 'requests==2.28.0\nnumpy>=1.21.0\npandas~=1.4.0';
      const files = [
        new File([requirementsContent], 'requirements.txt', { type: 'text/plain' })
      ];

      const options = {
        projectType: 'python',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(3);

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'requests' && c.version === '2.28.0')).toBe(true);
      expect(components.some(c => c.name === 'numpy' && c.version === '1.21.0')).toBe(true);
      expect(components.some(c => c.name === 'pandas' && c.version === '1.4.0')).toBe(true);
    });

    it('should generate SBOM for Python project with pyproject.toml', async () => {
      const pyprojectContent = `[tool.poetry.dependencies]
python = "^3.8"
requests = "2.28.0"
numpy = "^1.21.0"`;
      const files = [
        new File([pyprojectContent], 'pyproject.toml', { type: 'text/plain' })
      ];

      const options = {
        projectType: 'python',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(2); // requests and numpy, but not python

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'requests' && c.version === '2.28.0')).toBe(true);
      expect(components.some(c => c.name === 'numpy' && c.version === '^1.21.0')).toBe(true);
    });

    it('should generate SBOM for Java Maven project', async () => {
      const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-core</artifactId>
      <version>5.3.0</version>
    </dependency>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
    </dependency>
  </dependencies>
</project>`;
      const files = [
        new File([pomContent], 'pom.xml', { type: 'text/xml' })
      ];

      const options = {
        projectType: 'java',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(2);

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'org.springframework:spring-core' && c.version === '5.3.0')).toBe(true);
      expect(components.some(c => c.name === 'junit:junit' && c.version === '4.13.2')).toBe(true);
    });

    it('should generate SBOM for .NET project', async () => {
      const csprojContent = `<Project>
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc" Version="2.2.0" />
  </ItemGroup>
</Project>`;
      const files = [
        new File([csprojContent], 'Test.csproj', { type: 'text/xml' })
      ];

      const options = {
        projectType: 'dotnet',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(2);

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'Newtonsoft.Json' && c.version === '13.0.1')).toBe(true);
      expect(components.some(c => c.name === 'Microsoft.AspNetCore.Mvc' && c.version === '2.2.0')).toBe(true);
    });

    it('should generate SBOM for Go project', async () => {
      const goModContent = `module test-project

go 1.19

require (
    github.com/gin-gonic/gin v1.9.0
    github.com/stretchr/testify v1.8.2
)`;
      const files = [
        new File([goModContent], 'go.mod', { type: 'text/plain' })
      ];

      const options = {
        projectType: 'go',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(2);

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'github.com/gin-gonic/gin' && c.version === 'v1.9.0')).toBe(true);
      expect(components.some(c => c.name === 'github.com/stretchr/testify' && c.version === 'v1.8.2')).toBe(true);
    });

    it('should generate SBOM for Rust project', async () => {
      const cargoContent = `[package]
name = "test-project"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }`;
      const files = [
        new File([cargoContent], 'Cargo.toml', { type: 'text/plain' })
      ];

      const options = {
        projectType: 'rust',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(2);

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'serde' && c.version === '1.0')).toBe(true);
      expect(components.some(c => c.name === 'tokio' && c.version === '1.0')).toBe(true);
    });

    it('should generate SBOM for PHP project', async () => {
      const composerJson = {
        name: 'test/php-project',
        version: '1.0.0',
        description: 'Test PHP project',
        license: 'MIT',
        require: {
          'monolog/monolog': '^2.0',
          'guzzlehttp/guzzle': '^7.0'
        },
        'require-dev': {
          'phpunit/phpunit': '^9.0'
        }
      };

      const files = [
        new File([JSON.stringify(composerJson)], 'composer.json', { type: 'application/json' })
      ];

      const options = {
        projectType: 'php',
        includeDevDependencies: true,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(true);
      expect(result.sbomData).toBeDefined();
      expect(result.sbomData!.length).toBe(4); // 1 main project + 3 dependencies

      const components = result.sbomData!;
      expect(components.some(c => c.name === 'test/php-project' && c.type === 'application')).toBe(true);
      expect(components.some(c => c.name === 'monolog/monolog')).toBe(true);
      expect(components.some(c => c.name === 'guzzlehttp/guzzle')).toBe(true);
      expect(components.some(c => c.name === 'phpunit/phpunit')).toBe(true);
    });

    it('should return error for unsupported project type', async () => {
      const files = [
        new File(['test content'], 'test.txt', { type: 'text/plain' })
      ];

      const options = {
        projectType: 'unsupported',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported project type');
    });

    it('should return error when project type cannot be detected', async () => {
      const files = [
        new File(['random content'], 'unknown.txt', { type: 'text/plain' })
      ];

      const options = {
        projectType: '',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect project type');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const files = [
        new File(['invalid json content'], 'package.json', { type: 'application/json' })
      ];

      const options = {
        projectType: 'nodejs',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const result = await generateSBOMFromCode(files, options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should respect includeDevDependencies option', async () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0'
        },
        devDependencies: {
          'typescript': '^4.0.0'
        }
      };

      const files = [
        new File([JSON.stringify(packageJson)], 'package.json', { type: 'application/json' })
      ];

      // Test with includeDevDependencies: false
      const optionsWithoutDev = {
        projectType: 'nodejs',
        includeDevDependencies: false,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const resultWithoutDev = await generateSBOMFromCode(files, optionsWithoutDev);
      expect(resultWithoutDev.sbomData!.length).toBe(2); // 1 main + 1 dependency

      // Test with includeDevDependencies: true
      const optionsWithDev = {
        projectType: 'nodejs',
        includeDevDependencies: true,
        includeOptionalDependencies: false,
        outputFormat: 'json' as const,
        includeMetadata: true
      };

      const resultWithDev = await generateSBOMFromCode(files, optionsWithDev);
      expect(resultWithDev.sbomData!.length).toBe(3); // 1 main + 2 dependencies
    });
  });
});
