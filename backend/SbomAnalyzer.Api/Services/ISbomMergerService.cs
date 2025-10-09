using SbomAnalyzer.Api.Models;

namespace SbomAnalyzer.Api.Services;

public interface ISbomMergerService
{
    List<SbomComponent> MergeSboms(List<List<SbomComponent>> sboms);
    List<SbomComponent> DeduplicateComponents(List<SbomComponent> components);
}

