using SbomAnalyzer.Api.Models;

namespace SbomAnalyzer.Api.Services;

public interface ISbomGeneratorService
{
    Task<GenerationResult> GenerateFromCodeAsync(Dictionary<string, string> files, GenerationOptions options);
    ProjectType? DetectProjectType(List<string> fileNames);
    List<ProjectType> GetSupportedProjectTypes();
}

