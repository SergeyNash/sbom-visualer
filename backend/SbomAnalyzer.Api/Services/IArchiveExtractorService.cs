using SbomAnalyzer.Api.Models;

namespace SbomAnalyzer.Api.Services;

public interface IArchiveExtractorService
{
    Task<ArchiveExtractionResult> ExtractArchiveAsync(Stream archiveStream, string fileName);
    bool IsSupportedArchive(string fileName);
    List<ExtractedFile> FilterRelevantProjectFiles(List<ExtractedFile> files);
}

