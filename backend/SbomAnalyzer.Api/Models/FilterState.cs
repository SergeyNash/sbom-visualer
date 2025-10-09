namespace SbomAnalyzer.Api.Models;

public class FilterState
{
    public List<string> Type { get; set; } = new();
    public List<string> License { get; set; } = new();
    public List<string> RiskLevel { get; set; } = new();
    public string SearchTerm { get; set; } = string.Empty;
}

