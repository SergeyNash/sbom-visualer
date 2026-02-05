using SbomAnalyzer.Api.Models;
using System.Text.Json;

namespace SbomAnalyzer.Api.Services;

public interface ISbomParserService
{
    List<SbomComponent> ParseSbomFile(SbomFile sbomData);
    bool ValidateSbomFile(object data);

    // Unified JSON entrypoints (CycloneDX + SPDX)
    List<SbomComponent> ParseSbomJson(JsonElement jsonElement);
    bool ValidateSbomJson(JsonElement jsonElement);
}

