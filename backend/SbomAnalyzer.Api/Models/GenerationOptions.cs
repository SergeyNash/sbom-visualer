namespace SbomAnalyzer.Api.Models;

public class GenerationOptions
{
    public string ProjectType { get; set; } = string.Empty;
    public bool IncludeDevDependencies { get; set; } = true;
    public bool IncludeOptionalDependencies { get; set; } = true;
    public string OutputFormat { get; set; } = "json";
    public bool IncludeMetadata { get; set; } = true;
    public string SbomFormat { get; set; } = "cyclonedx";
    public bool GenerateBoth { get; set; } = false;
}

public class GenerationResult
{
    public bool Success { get; set; }
    public List<SbomComponent>? SbomData { get; set; }
    public List<RawSbomFile>? RawSboms { get; set; }
    public string? Error { get; set; }
    public List<string>? Warnings { get; set; }
    public GenerationMetadata? Metadata { get; set; }
}

public class GenerationMetadata
{
    public string GeneratedAt { get; set; } = string.Empty;
    public string ProjectType { get; set; } = string.Empty;
    public int TotalComponents { get; set; }
    public long GenerationTime { get; set; }
}

public class ProjectType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Extensions { get; set; } = new();
    public List<string> PackageManagers { get; set; } = new();
    public string Icon { get; set; } = string.Empty;
}

public class RawSbomFile
{
    public string Format { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
}

