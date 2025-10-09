namespace SbomAnalyzer.Api.Models;

public class ArchiveExtractionResult
{
    public bool Success { get; set; }
    public List<ExtractedFile>? Files { get; set; }
    public string? Error { get; set; }
    public ExtractionMetadata? Metadata { get; set; }
}

public class ExtractedFile
{
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Path { get; set; } = string.Empty;
}

public class ExtractionMetadata
{
    public int TotalFiles { get; set; }
    public long TotalSize { get; set; }
    public string ArchiveType { get; set; } = string.Empty;
    public long ExtractionTime { get; set; }
}

