using SbomAnalyzer.Api.Models;

namespace SbomAnalyzer.Api.Services;

public class SbomMergerService : ISbomMergerService
{
    public List<SbomComponent> MergeSboms(List<List<SbomComponent>> sboms)
    {
        var mergedComponents = new Dictionary<string, SbomComponent>();
        var seenIds = new HashSet<string>();

        for (int sbomIndex = 0; sbomIndex < sboms.Count; sbomIndex++)
        {
            var sbomComponents = sboms[sbomIndex];
            
            foreach (var component in sbomComponents)
            {
                var uniqueKey = $"{component.Name}@{component.Version}";

                if (!mergedComponents.ContainsKey(uniqueKey))
                {
                    var newId = seenIds.Contains(component.Id)
                        ? $"{component.Id}-{sbomIndex}"
                        : component.Id;

                    seenIds.Add(newId);

                    mergedComponents[uniqueKey] = new SbomComponent
                    {
                        Id = newId,
                        Name = component.Name,
                        Type = component.Type,
                        License = component.License,
                        Version = component.Version,
                        RiskLevel = component.RiskLevel,
                        CveCount = component.CveCount,
                        Dependencies = new List<string>(component.Dependencies),
                        Description = component.Description,
                        Publisher = component.Publisher,
                        Vulnerabilities = component.Vulnerabilities,
                        Metadata = component.Metadata
                    };
                }
                else
                {
                    var existing = mergedComponents[uniqueKey];

                    // Merge dependencies
                    var newDependencies = new HashSet<string>(existing.Dependencies);
                    foreach (var dep in component.Dependencies)
                    {
                        newDependencies.Add(dep);
                    }
                    existing.Dependencies = newDependencies.ToList();

                    // Take the maximum CVE count
                    existing.CveCount = Math.Max(existing.CveCount, component.CveCount);

                    // Take the highest risk level
                    if (component.RiskLevel == RiskLevel.High ||
                        (component.RiskLevel == RiskLevel.Medium && existing.RiskLevel == RiskLevel.Low))
                    {
                        existing.RiskLevel = component.RiskLevel;
                    }

                    // Update description if the existing one is generic
                    if (existing.Description == $"{existing.Type} component" &&
                        !string.IsNullOrEmpty(component.Description) &&
                        component.Description != $"{component.Type} component")
                    {
                        existing.Description = component.Description;
                    }
                }
            }
        }

        return mergedComponents.Values.ToList();
    }

    public List<SbomComponent> DeduplicateComponents(List<SbomComponent> components)
    {
        var seen = new Dictionary<string, SbomComponent>();

        foreach (var component in components)
        {
            var key = $"{component.Name}@{component.Version}";

            if (!seen.ContainsKey(key))
            {
                seen[key] = component;
            }
            else
            {
                var existing = seen[key];
                var merged = MergeSboms(new List<List<SbomComponent>> 
                { 
                    new List<SbomComponent> { existing }, 
                    new List<SbomComponent> { component } 
                })[0];
                seen[key] = merged;
            }
        }

        return seen.Values.ToList();
    }
}

