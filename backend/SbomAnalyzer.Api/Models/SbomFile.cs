using System.Text.Json.Serialization;

namespace SbomAnalyzer.Api.Models;

public class SbomFile
{
    public string BomFormat { get; set; } = string.Empty;
    public string SpecVersion { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public int? Version { get; set; }
    public SbomMetadata? Metadata { get; set; }
    public List<SbomFileComponent> Components { get; set; } = new();
    public List<SbomDependency>? Dependencies { get; set; }
}

public class SbomMetadata
{
    public string? Timestamp { get; set; }
    public List<SbomTool>? Tools { get; set; }
}

public class SbomTool
{
    public string? Vendor { get; set; }
    public string? Name { get; set; }
    public string? Version { get; set; }
}

public class SbomFileComponent
{
    [JsonPropertyName("bom-ref")]
    public string BomRef { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public List<SbomLicense>? Licenses { get; set; }
    public string? Description { get; set; }
    public List<ExternalReference>? ExternalReferences { get; set; }
}

public class SbomLicense
{
    public LicenseInfo? License { get; set; }
}

public class LicenseInfo
{
    public string? Id { get; set; }
    public string? Name { get; set; }
}

public class ExternalReference
{
    public string? Type { get; set; }
    public string? Url { get; set; }
}

public class SbomDependency
{
    public string Ref { get; set; } = string.Empty;
    public List<string> DependsOn { get; set; } = new();
}

