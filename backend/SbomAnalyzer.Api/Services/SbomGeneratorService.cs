using SbomAnalyzer.Api.Models;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace SbomAnalyzer.Api.Services;

public class SbomGeneratorService : ISbomGeneratorService
{
    private static readonly List<ProjectType> SUPPORTED_PROJECT_TYPES = new()
    {
        new ProjectType
        {
            Id = "nodejs",
            Name = "Node.js",
            Description = "JavaScript/TypeScript projects with package.json",
            Extensions = new List<string> { ".js", ".ts", ".jsx", ".tsx", ".json" },
            PackageManagers = new List<string> { "npm", "yarn", "pnpm" },
            Icon = "📦"
        },
        new ProjectType
        {
            Id = "python",
            Name = "Python",
            Description = "Python projects with requirements.txt or pyproject.toml",
            Extensions = new List<string> { ".py", ".pyc", ".pyo" },
            PackageManagers = new List<string> { "pip", "poetry", "conda" },
            Icon = "🐍"
        },
        new ProjectType
        {
            Id = "java",
            Name = "Java",
            Description = "Java projects with Maven or Gradle",
            Extensions = new List<string> { ".java", ".class", ".jar" },
            PackageManagers = new List<string> { "maven", "gradle" },
            Icon = "☕"
        },
        new ProjectType
        {
            Id = "dotnet",
            Name = ".NET",
            Description = ".NET projects with .csproj or packages.config",
            Extensions = new List<string> { ".cs", ".vb", ".fs" },
            PackageManagers = new List<string> { "nuget" },
            Icon = "🔷"
        },
        new ProjectType
        {
            Id = "go",
            Name = "Go",
            Description = "Go projects with go.mod",
            Extensions = new List<string> { ".go" },
            PackageManagers = new List<string> { "go mod" },
            Icon = "🐹"
        },
        new ProjectType
        {
            Id = "rust",
            Name = "Rust",
            Description = "Rust projects with Cargo.toml",
            Extensions = new List<string> { ".rs" },
            PackageManagers = new List<string> { "cargo" },
            Icon = "🦀"
        },
        new ProjectType
        {
            Id = "php",
            Name = "PHP",
            Description = "PHP projects with composer.json",
            Extensions = new List<string> { ".php" },
            PackageManagers = new List<string> { "composer" },
            Icon = "🐘"
        }
    };

    public List<ProjectType> GetSupportedProjectTypes() => SUPPORTED_PROJECT_TYPES;

    public ProjectType? DetectProjectType(List<string> fileNames)
    {
        var lowerFileNames = fileNames.Select(f => f.ToLowerInvariant()).ToList();

        foreach (var projectType in SUPPORTED_PROJECT_TYPES)
        {
            foreach (var packageManager in projectType.PackageManagers)
            {
                var hasPackageFile = packageManager.ToLowerInvariant() switch
                {
                    "npm" or "yarn" or "pnpm" => lowerFileNames.Contains("package.json"),
                    "pip" => lowerFileNames.Contains("requirements.txt"),
                    "poetry" => lowerFileNames.Contains("pyproject.toml"),
                    "maven" => lowerFileNames.Contains("pom.xml"),
                    "gradle" => lowerFileNames.Any(n => n == "build.gradle" || n == "build.gradle.kts"),
                    "nuget" => lowerFileNames.Any(n => n.EndsWith(".csproj") || n == "packages.config"),
                    "go mod" => lowerFileNames.Contains("go.mod"),
                    "cargo" => lowerFileNames.Contains("cargo.toml"),
                    "composer" => lowerFileNames.Contains("composer.json"),
                    _ => false
                };

                if (hasPackageFile)
                {
                    return projectType;
                }
            }
        }

        return null;
    }

    public async Task<GenerationResult> GenerateFromCodeAsync(Dictionary<string, string> files, GenerationOptions options)
    {
        var startTime = DateTime.Now;

        try
        {
            // Detect project type if not specified
            var fileNames = files.Keys.ToList();
            var detectedType = string.IsNullOrEmpty(options.ProjectType)
                ? DetectProjectType(fileNames)
                : SUPPORTED_PROJECT_TYPES.FirstOrDefault(pt => pt.Id == options.ProjectType);

            if (detectedType == null)
            {
                return new GenerationResult
                {
                    Success = false,
                    Error = "Could not detect project type. Please ensure you have uploaded the appropriate package manager files."
                };
            }

            List<SbomComponent> sbomData;

            switch (detectedType.Id)
            {
                case "nodejs":
                    sbomData = await GenerateNodeJsSbomAsync(files, options);
                    break;
                case "python":
                    sbomData = await GeneratePythonSbomAsync(files, options);
                    break;
                case "java":
                    sbomData = await GenerateJavaSbomAsync(files, options);
                    break;
                case "dotnet":
                    sbomData = await GenerateDotNetSbomAsync(files, options);
                    break;
                case "go":
                    sbomData = await GenerateGoSbomAsync(files, options);
                    break;
                case "rust":
                    sbomData = await GenerateRustSbomAsync(files, options);
                    break;
                case "php":
                    sbomData = await GeneratePhpSbomAsync(files, options);
                    break;
                default:
                    throw new NotSupportedException($"Unsupported project type: {detectedType.Id}");
            }

            var generationTime = (long)(DateTime.Now - startTime).TotalMilliseconds;

            return new GenerationResult
            {
                Success = true,
                SbomData = sbomData,
                Metadata = new GenerationMetadata
                {
                    GeneratedAt = DateTime.UtcNow.ToString("o"),
                    ProjectType = detectedType.Name,
                    TotalComponents = sbomData.Count,
                    GenerationTime = generationTime
                }
            };
        }
        catch (Exception ex)
        {
            return new GenerationResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    private async Task<List<SbomComponent>> GenerateNodeJsSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        if (!files.TryGetValue("package.json", out var packageJsonContent))
        {
            throw new FileNotFoundException("package.json not found");
        }

        var packageJson = JsonSerializer.Deserialize<JsonElement>(packageJsonContent);
        var components = new List<SbomComponent>();

        var name = packageJson.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : "Unknown Project";
        var version = packageJson.TryGetProperty("version", out var versionProp) ? versionProp.GetString() : "0.0.0";
        var description = packageJson.TryGetProperty("description", out var descProp) ? descProp.GetString() : "";
        var license = packageJson.TryGetProperty("license", out var licenseProp) ? licenseProp.GetString() : "Unknown";
        
        // Add main project as component
        components.Add(new SbomComponent
        {
            Id = $"{name}@{version}",
            Name = name ?? "Unknown Project",
            Version = version ?? "0.0.0",
            Type = ComponentType.Application,
            License = license ?? "Unknown",
            Description = description ?? "",
            RiskLevel = RiskLevel.Low,
            Vulnerabilities = new List<Vulnerability>(),
            Dependencies = new List<string>(),
            Metadata = new ComponentMetadata
            {
                Source = "package.json",
                PackageManager = "npm"
            }
        });

        // Process dependencies
        var dependencies = new Dictionary<string, string>();
        
        if (packageJson.TryGetProperty("dependencies", out var deps))
        {
            foreach (var dep in deps.EnumerateObject())
            {
                dependencies[dep.Name] = dep.Value.GetString() ?? "unknown";
            }
        }

        if (options.IncludeDevDependencies && packageJson.TryGetProperty("devDependencies", out var devDeps))
        {
            foreach (var dep in devDeps.EnumerateObject())
            {
                dependencies[dep.Name] = dep.Value.GetString() ?? "unknown";
            }
        }

        if (options.IncludeOptionalDependencies && packageJson.TryGetProperty("optionalDependencies", out var optDeps))
        {
            foreach (var dep in optDeps.EnumerateObject())
            {
                dependencies[dep.Name] = dep.Value.GetString() ?? "unknown";
            }
        }

        foreach (var (depName, depVersion) in dependencies)
        {
            components.Add(new SbomComponent
            {
                Id = $"{depName}@{depVersion}",
                Name = depName,
                Version = depVersion,
                Type = ComponentType.Library,
                License = "Unknown",
                Description = "",
                RiskLevel = RiskLevel.Medium,
                Vulnerabilities = new List<Vulnerability>(),
                Dependencies = new List<string>(),
                Metadata = new ComponentMetadata
                {
                    Source = "npm",
                    PackageManager = "npm"
                }
            });
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GeneratePythonSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        // Check for requirements.txt
        if (files.TryGetValue("requirements.txt", out var requirementsContent))
        {
            var lines = requirementsContent.Split('\n');
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (!string.IsNullOrEmpty(trimmed) && !trimmed.StartsWith('#'))
                {
                    var parts = Regex.Split(trimmed, @"[>=<!]=?");
                    var name = parts[0].Trim();
                    var version = parts.Length > 1 ? parts[1].Trim() : "latest";

                    if (!string.IsNullOrEmpty(name))
                    {
                        components.Add(new SbomComponent
                        {
                            Id = $"{name}@{version}",
                            Name = name,
                            Version = version,
                            Type = ComponentType.Library,
                            License = "Unknown",
                            Description = "",
                            RiskLevel = RiskLevel.Medium,
                            Vulnerabilities = new List<Vulnerability>(),
                            Dependencies = new List<string>(),
                            Metadata = new ComponentMetadata
                            {
                                Source = "pip",
                                PackageManager = "pip"
                            }
                        });
                    }
                }
            }
        }

        // Check for pyproject.toml
        if (files.TryGetValue("pyproject.toml", out var pyprojectContent))
        {
            var lines = pyprojectContent.Split('\n');
            bool inDependencies = false;

            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (trimmed == "[tool.poetry.dependencies]" || trimmed == "[dependencies]")
                {
                    inDependencies = true;
                    continue;
                }
                if (trimmed.StartsWith('[') && inDependencies)
                {
                    break;
                }
                if (inDependencies && !string.IsNullOrEmpty(trimmed) && !trimmed.StartsWith('#'))
                {
                    var parts = trimmed.Split('=');
                    if (parts.Length >= 2)
                    {
                        var name = parts[0].Trim();
                        var version = parts[1].Trim().Trim('"', '\'');

                        if (!name.Contains("python"))
                        {
                            components.Add(new SbomComponent
                            {
                                Id = $"{name}@{version}",
                                Name = name,
                                Version = version,
                                Type = ComponentType.Library,
                                License = "Unknown",
                                Description = "",
                                RiskLevel = RiskLevel.Medium,
                                Vulnerabilities = new List<Vulnerability>(),
                                Dependencies = new List<string>(),
                                Metadata = new ComponentMetadata
                                {
                                    Source = "poetry",
                                    PackageManager = "poetry"
                                }
                            });
                        }
                    }
                }
            }
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GenerateJavaSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        if (files.TryGetValue("pom.xml", out var pomContent))
        {
            try
            {
                var doc = XDocument.Parse(pomContent);
                var ns = doc.Root?.Name.Namespace;

                if (ns != null)
                {
                    var dependencies = doc.Descendants(ns + "dependency");

                    foreach (var dependency in dependencies)
                    {
                        var groupId = dependency.Element(ns + "groupId")?.Value ?? "";
                        var artifactId = dependency.Element(ns + "artifactId")?.Value ?? "";
                        var version = dependency.Element(ns + "version")?.Value ?? "unknown";

                        components.Add(new SbomComponent
                        {
                            Id = $"{groupId}:{artifactId}@{version}",
                            Name = $"{groupId}:{artifactId}",
                            Version = version,
                            Type = ComponentType.Library,
                            License = "Unknown",
                            Description = "",
                            RiskLevel = RiskLevel.Medium,
                            Vulnerabilities = new List<Vulnerability>(),
                            Dependencies = new List<string>(),
                            Metadata = new ComponentMetadata
                            {
                                Source = "maven",
                                PackageManager = "maven",
                                GroupId = groupId,
                                ArtifactId = artifactId
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing pom.xml: {ex.Message}");
            }
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GenerateDotNetSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        foreach (var (fileName, content) in files)
        {
            if (fileName.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var doc = XDocument.Parse(content);
                    var packageReferences = doc.Descendants("PackageReference");

                    foreach (var packageRef in packageReferences)
                    {
                        var name = packageRef.Attribute("Include")?.Value ?? "";
                        var version = packageRef.Attribute("Version")?.Value ?? "unknown";

                        if (!string.IsNullOrEmpty(name))
                        {
                            components.Add(new SbomComponent
                            {
                                Id = $"{name}@{version}",
                                Name = name,
                                Version = version,
                                Type = ComponentType.Library,
                                License = "Unknown",
                                Description = "",
                                RiskLevel = RiskLevel.Medium,
                                Vulnerabilities = new List<Vulnerability>(),
                                Dependencies = new List<string>(),
                                Metadata = new ComponentMetadata
                                {
                                    Source = "nuget",
                                    PackageManager = "nuget"
                                }
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error parsing {fileName}: {ex.Message}");
                }
            }
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GenerateGoSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        if (files.TryGetValue("go.mod", out var goModContent))
        {
            var lines = goModContent.Split('\n');
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (trimmed.StartsWith("require ") || (!trimmed.StartsWith("module ") && 
                    !trimmed.StartsWith("go ") && !trimmed.StartsWith("//") && 
                    !string.IsNullOrEmpty(trimmed) && trimmed.Contains("/")))
                {
                    var parts = trimmed.Replace("require ", "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        var name = parts[0];
                        var version = parts[1];

                        components.Add(new SbomComponent
                        {
                            Id = $"{name}@{version}",
                            Name = name,
                            Version = version,
                            Type = ComponentType.Library,
                            License = "Unknown",
                            Description = "",
                            RiskLevel = RiskLevel.Medium,
                            Vulnerabilities = new List<Vulnerability>(),
                            Dependencies = new List<string>(),
                            Metadata = new ComponentMetadata
                            {
                                Source = "go mod",
                                PackageManager = "go mod"
                            }
                        });
                    }
                }
            }
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GenerateRustSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        if (files.TryGetValue("Cargo.toml", out var cargoContent))
        {
            var lines = cargoContent.Split('\n');
            bool inDependencies = false;

            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (trimmed == "[dependencies]")
                {
                    inDependencies = true;
                    continue;
                }
                if (trimmed.StartsWith('[') && inDependencies)
                {
                    break;
                }
                if (inDependencies && !string.IsNullOrEmpty(trimmed) && !trimmed.StartsWith('#'))
                {
                    var parts = trimmed.Split('=');
                    if (parts.Length >= 2)
                    {
                        var name = parts[0].Trim();
                        var version = parts[1].Trim().Trim('"', '\'');

                        components.Add(new SbomComponent
                        {
                            Id = $"{name}@{version}",
                            Name = name,
                            Version = version,
                            Type = ComponentType.Library,
                            License = "Unknown",
                            Description = "",
                            RiskLevel = RiskLevel.Medium,
                            Vulnerabilities = new List<Vulnerability>(),
                            Dependencies = new List<string>(),
                            Metadata = new ComponentMetadata
                            {
                                Source = "cargo",
                                PackageManager = "cargo"
                            }
                        });
                    }
                }
            }
        }

        return await Task.FromResult(components);
    }

    private async Task<List<SbomComponent>> GeneratePhpSbomAsync(
        Dictionary<string, string> files, GenerationOptions options)
    {
        var components = new List<SbomComponent>();

        if (files.TryGetValue("composer.json", out var composerContent))
        {
            var composer = JsonSerializer.Deserialize<JsonElement>(composerContent);

            // Add main project
            if (composer.TryGetProperty("name", out var nameProp))
            {
                var name = nameProp.GetString() ?? "Unknown";
                var version = composer.TryGetProperty("version", out var versionProp) ? versionProp.GetString() : "0.0.0";
                var description = composer.TryGetProperty("description", out var descProp) ? descProp.GetString() : "";
                var license = composer.TryGetProperty("license", out var licenseProp) ? licenseProp.GetString() : "Unknown";

                components.Add(new SbomComponent
                {
                    Id = $"{name}@{version}",
                    Name = name,
                    Version = version ?? "0.0.0",
                    Type = ComponentType.Application,
                    License = license ?? "Unknown",
                    Description = description ?? "",
                    RiskLevel = RiskLevel.Low,
                    Vulnerabilities = new List<Vulnerability>(),
                    Dependencies = new List<string>(),
                    Metadata = new ComponentMetadata
                    {
                        Source = "composer.json",
                        PackageManager = "composer"
                    }
                });
            }

            // Process dependencies
            var dependencies = new Dictionary<string, string>();

            if (composer.TryGetProperty("require", out var require))
            {
                foreach (var dep in require.EnumerateObject())
                {
                    dependencies[dep.Name] = dep.Value.GetString() ?? "unknown";
                }
            }

            if (options.IncludeDevDependencies && composer.TryGetProperty("require-dev", out var requireDev))
            {
                foreach (var dep in requireDev.EnumerateObject())
                {
                    dependencies[dep.Name] = dep.Value.GetString() ?? "unknown";
                }
            }

            foreach (var (depName, depVersion) in dependencies)
            {
                components.Add(new SbomComponent
                {
                    Id = $"{depName}@{depVersion}",
                    Name = depName,
                    Version = depVersion,
                    Type = ComponentType.Library,
                    License = "Unknown",
                    Description = "",
                    RiskLevel = RiskLevel.Medium,
                    Vulnerabilities = new List<Vulnerability>(),
                    Dependencies = new List<string>(),
                    Metadata = new ComponentMetadata
                    {
                        Source = "composer",
                        PackageManager = "composer"
                    }
                });
            }
        }

        return await Task.FromResult(components);
    }
}

