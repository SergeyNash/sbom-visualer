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

            // Mock CVE count (in real implementation, this would come from vulnerability database)
            var cveCount = new Random().Next(0, 3);

            var bomRef = string.IsNullOrEmpty(component.BomRef) ? component.Name : component.BomRef;

            components.Add(new SbomComponent
            {
                Id = bomRef,
                Name = component.Name,
                Type = type,
                License = license,
                Version = component.Version,
                RiskLevel = riskLevel,
                CveCount = cveCount,
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
            
            return jsonElement.ValueKind == JsonValueKind.Object &&
                   jsonElement.TryGetProperty("bomFormat", out _) &&
                   jsonElement.TryGetProperty("components", out var components) &&
                   components.ValueKind == JsonValueKind.Array;
        }
        catch
        {
            return false;
        }
    }
}

