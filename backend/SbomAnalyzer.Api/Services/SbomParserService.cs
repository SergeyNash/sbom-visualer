using SbomAnalyzer.Api.Models;
using System.Text.Json;

namespace SbomAnalyzer.Api.Services;

public class SbomParserService : ISbomParserService
{
    public List<SbomComponent> ParseSbomFile(SbomFile sbomData)
    {
        var components = new List<SbomComponent>();

        if (sbomData.Components == null || sbomData.Components.Count == 0)
        {
            throw new ArgumentException("Invalid SBOM file: missing components");
        }

        // Create a map of dependencies
        var dependencyMap = new Dictionary<string, List<string>>();
        if (sbomData.Dependencies != null)
        {
            foreach (var dep in sbomData.Dependencies)
            {
                dependencyMap[dep.Ref] = dep.DependsOn ?? new List<string>();
            }
        }

        foreach (var component in sbomData.Components)
        {
            var license = component.Licenses?.FirstOrDefault()?.License?.Id 
                       ?? component.Licenses?.FirstOrDefault()?.License?.Name 
                       ?? "Unknown";

            // Determine component type
            ComponentType type = ComponentType.Library;
            if (component.Type.Equals("application", StringComparison.OrdinalIgnoreCase))
            {
                type = ComponentType.Application;
            }
            else if (component.Type.Equals("library", StringComparison.OrdinalIgnoreCase))
            {
                type = ComponentType.Library;
            }
            else
            {
                type = ComponentType.Dependency;
            }

            // Simple risk assessment based on license and type
            var riskLevel = RiskLevel.Low;
            if (license.Contains("GPL", StringComparison.OrdinalIgnoreCase) || license == "Unknown")
            {
                riskLevel = RiskLevel.Medium;
            }
            if (component.Name.Contains("deprecated", StringComparison.OrdinalIgnoreCase) ||
                component.Version.Contains("alpha", StringComparison.OrdinalIgnoreCase) ||
                component.Version.Contains("beta", StringComparison.OrdinalIgnoreCase))
            {
                riskLevel = RiskLevel.High;
            }

            var bomRef = string.IsNullOrEmpty(component.BomRef) ? component.Name : component.BomRef;

            components.Add(new SbomComponent
            {
                Id = bomRef,
                Name = component.Name,
                Type = type,
                License = license,
                Version = component.Version,
                RiskLevel = riskLevel,
                CveCount = 0,
                Dependencies = dependencyMap.ContainsKey(bomRef) ? dependencyMap[bomRef] : new List<string>(),
                Description = component.Description ?? $"{type} component"
            });
        }

        return components;
    }

    public bool ValidateSbomFile(object data)
    {
        try
        {
            if (data == null) return false;

            var jsonElement = (JsonElement)data;
            return ValidateSbomJson(jsonElement);
        }
        catch
        {
            return false;
        }
    }

    public bool ValidateSbomJson(JsonElement jsonElement)
    {
        try
        {
            if (jsonElement.ValueKind != JsonValueKind.Object) return false;

            // CycloneDX (JSON) heuristic
            if (jsonElement.TryGetProperty("bomFormat", out _) &&
                jsonElement.TryGetProperty("components", out var components) &&
                components.ValueKind == JsonValueKind.Array)
            {
                return true;
            }

            // SPDX (JSON) heuristic
            if (jsonElement.TryGetProperty("spdxVersion", out var spdxVersion) &&
                spdxVersion.ValueKind == JsonValueKind.String &&
                jsonElement.TryGetProperty("packages", out var packages) &&
                packages.ValueKind == JsonValueKind.Array)
            {
                var v = spdxVersion.GetString() ?? "";
                if (!v.StartsWith("SPDX-", StringComparison.OrdinalIgnoreCase)) return false;

                // Require at least one package with SPDXID
                foreach (var pkg in packages.EnumerateArray())
                {
                    if (pkg.ValueKind != JsonValueKind.Object) continue;
                    var spdxId = GetFirstString(pkg, "SPDXID", "spdxId");
                    if (!string.IsNullOrWhiteSpace(spdxId))
                    {
                        return true;
                    }
                }

                return false;
            }

            return false;
        }
        catch
        {
            return false;
        }
    }

    public List<SbomComponent> ParseSbomJson(JsonElement jsonElement)
    {
        if (!ValidateSbomJson(jsonElement))
        {
            throw new ArgumentException("Invalid SBOM file format");
        }

        // CycloneDX JSON
        if (jsonElement.TryGetProperty("bomFormat", out _))
        {
            var sbomFile = JsonSerializer.Deserialize<SbomFile>(
                jsonElement.GetRawText(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            );

            if (sbomFile == null)
            {
                throw new ArgumentException("Invalid CycloneDX SBOM file");
            }

            return ParseSbomFile(sbomFile);
        }

        // SPDX JSON
        return ParseSpdxJson(jsonElement);
    }

    private static RiskLevel AssessRisk(string license, string name, string version)
    {
        var risk = RiskLevel.Low;

        if (!string.IsNullOrEmpty(license) &&
            (license.Contains("GPL", StringComparison.OrdinalIgnoreCase) ||
             license.Equals("Unknown", StringComparison.OrdinalIgnoreCase)))
        {
            risk = RiskLevel.Medium;
        }

        if (!string.IsNullOrEmpty(name) && name.Contains("deprecated", StringComparison.OrdinalIgnoreCase))
        {
            risk = RiskLevel.High;
        }

        if (!string.IsNullOrEmpty(version) &&
            (version.Contains("alpha", StringComparison.OrdinalIgnoreCase) ||
             version.Contains("beta", StringComparison.OrdinalIgnoreCase)))
        {
            risk = RiskLevel.High;
        }

        return risk;
    }

    private static string GetFirstString(JsonElement obj, params string[] propertyNames)
    {
        foreach (var p in propertyNames)
        {
            if (obj.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.String)
            {
                var s = v.GetString();
                if (!string.IsNullOrWhiteSpace(s)) return s!;
            }
        }
        return string.Empty;
    }

    private static string NormalizeLicense(string license)
    {
        if (string.IsNullOrWhiteSpace(license)) return "Unknown";
        var trimmed = license.Trim();

        // SPDX special values
        if (trimmed.Equals("NOASSERTION", StringComparison.OrdinalIgnoreCase)) return "Unknown";
        if (trimmed.Equals("NONE", StringComparison.OrdinalIgnoreCase)) return "None";

        return trimmed;
    }

    private static string ExtractSpdxLicense(JsonElement pkg)
    {
        var license = GetFirstString(pkg, "licenseConcluded", "licenseDeclared");
        if (!string.IsNullOrWhiteSpace(license)) return NormalizeLicense(license);

        // Some SPDX documents use licenseInfoFromFiles
        if (pkg.TryGetProperty("licenseInfoFromFiles", out var info) && info.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in info.EnumerateArray())
            {
                if (entry.ValueKind == JsonValueKind.String)
                {
                    var s = entry.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                    {
                        return NormalizeLicense(s!);
                    }
                }
            }
        }

        return "Unknown";
    }

    private List<SbomComponent> ParseSpdxJson(JsonElement root)
    {
        var components = new Dictionary<string, SbomComponent>(StringComparer.OrdinalIgnoreCase);
        var dependencyMap = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var applicationIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // SPDX also has a top-level documentDescribes field
        if (root.TryGetProperty("documentDescribes", out var describes) && describes.ValueKind == JsonValueKind.Array)
        {
            foreach (var d in describes.EnumerateArray())
            {
                if (d.ValueKind == JsonValueKind.String)
                {
                    var id = d.GetString();
                    if (!string.IsNullOrWhiteSpace(id)) applicationIds.Add(id!);
                }
            }
        }

        if (root.TryGetProperty("packages", out var packages) && packages.ValueKind == JsonValueKind.Array)
        {
            foreach (var pkg in packages.EnumerateArray())
            {
                if (pkg.ValueKind != JsonValueKind.Object) continue;

                var spdxId = GetFirstString(pkg, "SPDXID", "spdxId");
                if (string.IsNullOrWhiteSpace(spdxId)) continue;

                var name = GetFirstString(pkg, "name");
                var version = GetFirstString(pkg, "versionInfo", "version");
                var license = ExtractSpdxLicense(pkg);
                var description = GetFirstString(pkg, "description");

                components[spdxId] = new SbomComponent
                {
                    Id = spdxId,
                    Name = string.IsNullOrWhiteSpace(name) ? spdxId : name,
                    Version = string.IsNullOrWhiteSpace(version) ? "unknown" : version,
                    License = license,
                    Type = ComponentType.Library,
                    RiskLevel = AssessRisk(license, name, version),
                    CveCount = 0,
                    Dependencies = new List<string>(),
                    Description = string.IsNullOrWhiteSpace(description) ? "SPDX package" : description
                };
            }
        }

        if (root.TryGetProperty("relationships", out var relationships) && relationships.ValueKind == JsonValueKind.Array)
        {
            foreach (var rel in relationships.EnumerateArray())
            {
                if (rel.ValueKind != JsonValueKind.Object) continue;

                var relationshipType = GetFirstString(rel, "relationshipType", "relationship");
                var from = GetFirstString(rel, "spdxElementId", "spdxElementID", "spdxElementId");
                var to = GetFirstString(rel, "relatedSpdxElement", "relatedSpdxElementId");

                if (string.IsNullOrWhiteSpace(relationshipType) ||
                    string.IsNullOrWhiteSpace(from) ||
                    string.IsNullOrWhiteSpace(to))
                {
                    continue;
                }

                // Mark "main" described package as Application, when present.
                if (relationshipType.Equals("DESCRIBES", StringComparison.OrdinalIgnoreCase) &&
                    (from.Equals("DOCUMENT", StringComparison.OrdinalIgnoreCase) || from.Equals("SPDXRef-DOCUMENT", StringComparison.OrdinalIgnoreCase)))
                {
                    applicationIds.Add(to);
                    continue;
                }

                bool addAsEdge = false;
                string edgeFrom = from;
                string edgeTo = to;

                // Direct dependency-like edges
                if (relationshipType.Equals("DEPENDS_ON", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("CONTAINS", StringComparison.OrdinalIgnoreCase))
                {
                    addAsEdge = true;
                }

                // Inverse relationship types: X DEPENDENCY_OF Y means Y depends on X (Y -> X)
                if (relationshipType.Equals("DEPENDENCY_OF", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("CONTAINED_BY", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("BUILD_DEPENDENCY_OF", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("RUNTIME_DEPENDENCY_OF", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("DEV_DEPENDENCY_OF", StringComparison.OrdinalIgnoreCase) ||
                    relationshipType.Equals("OPTIONAL_DEPENDENCY_OF", StringComparison.OrdinalIgnoreCase))
                {
                    addAsEdge = true;
                    edgeFrom = to;
                    edgeTo = from;
                }

                if (addAsEdge)
                {
                    if (edgeFrom.Equals("DOCUMENT", StringComparison.OrdinalIgnoreCase) || edgeFrom.Equals("SPDXRef-DOCUMENT", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                    if (edgeTo.Equals("DOCUMENT", StringComparison.OrdinalIgnoreCase) || edgeTo.Equals("SPDXRef-DOCUMENT", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!dependencyMap.TryGetValue(edgeFrom, out var set))
                    {
                        set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        dependencyMap[edgeFrom] = set;
                    }
                    set.Add(edgeTo);
                }
            }
        }

        // Ensure referenced nodes exist (placeholders)
        foreach (var (from, deps) in dependencyMap)
        {
            if (!components.ContainsKey(from))
            {
                components[from] = new SbomComponent
                {
                    Id = from,
                    Name = from,
                    Version = "unknown",
                    License = "Unknown",
                    Type = ComponentType.Dependency,
                    RiskLevel = RiskLevel.Medium,
                    CveCount = 0,
                    Dependencies = new List<string>(),
                    Description = "SPDX reference"
                };
            }

            foreach (var dep in deps)
            {
                if (!components.ContainsKey(dep))
                {
                    components[dep] = new SbomComponent
                    {
                        Id = dep,
                        Name = dep,
                        Version = "unknown",
                        License = "Unknown",
                        Type = ComponentType.Dependency,
                        RiskLevel = RiskLevel.Medium,
                        CveCount = 0,
                        Dependencies = new List<string>(),
                        Description = "SPDX reference"
                    };
                }
            }
        }

        // Apply application typing based on DESCRIBES relationships
        foreach (var appId in applicationIds)
        {
            if (components.TryGetValue(appId, out var c))
            {
                c.Type = ComponentType.Application;
            }
        }

        // Assign dependencies
        foreach (var (from, deps) in dependencyMap)
        {
            if (components.TryGetValue(from, out var c))
            {
                c.Dependencies = deps.ToList();
            }
        }

        return components.Values.ToList();
    }
}

