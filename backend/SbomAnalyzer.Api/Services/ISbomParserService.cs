using SbomAnalyzer.Api.Models;

namespace SbomAnalyzer.Api.Services;

public interface ISbomParserService
{
    List<SbomComponent> ParseSbomFile(SbomFile sbomData);
    bool ValidateSbomFile(object data);
}

