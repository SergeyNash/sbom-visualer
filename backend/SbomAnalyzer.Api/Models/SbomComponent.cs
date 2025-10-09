namespace SbomAnalyzer.Api.Models;

public class SbomComponent
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public ComponentType Type { get; set; }
    public string License { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public RiskLevel RiskLevel { get; set; }
    public int CveCount { get; set; }
    public List<string> Dependencies { get; set; } = new();
    public string Description { get; set; } = string.Empty;
    public string? Publisher { get; set; }
    public List<Vulnerability>? Vulnerabilities { get; set; }
    public ComponentMetadata? Metadata { get; set; }
}

public enum ComponentType
{
    Library,
    Application,
    Dependency
}

public enum RiskLevel
{
    Low,
    Medium,
    High
}

public class Vulnerability
{
    public string Id { get; set; } = string.Empty;
    public VulnerabilitySeverity Severity { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? CveId { get; set; }
}

public enum VulnerabilitySeverity
{
    Low,
    Medium,
    High,
    Critical
}

public class ComponentMetadata
{
    public string? Source { get; set; }
    public string? PackageManager { get; set; }
    public string? Homepage { get; set; }
    public string? Repository { get; set; }
    public List<string>? Keywords { get; set; }
    public string? GroupId { get; set; }
    public string? ArtifactId { get; set; }
}

