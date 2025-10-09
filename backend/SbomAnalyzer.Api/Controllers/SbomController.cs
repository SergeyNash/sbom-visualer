using Microsoft.AspNetCore.Mvc;
using SbomAnalyzer.Api.Models;
using SbomAnalyzer.Api.Services;
using System.Text.Json;

namespace SbomAnalyzer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SbomController : ControllerBase
{
    private readonly ISbomParserService _parserService;
    private readonly ISbomMergerService _mergerService;
    private readonly ILogger<SbomController> _logger;

    public SbomController(
        ISbomParserService parserService,
        ISbomMergerService mergerService,
        ILogger<SbomController> logger)
    {
        _parserService = parserService;
        _mergerService = mergerService;
        _logger = logger;
    }

    /// <summary>
    /// Uploads and parses a single SBOM file
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(10485760)] // 10MB
    public async Task<ActionResult<List<SbomComponent>>> UploadSbom(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded" });
            }

            if (file.Length > 10485760) // 10MB
            {
                return BadRequest(new { error = "File size exceeds 10MB limit" });
            }

            using var stream = new StreamReader(file.OpenReadStream());
            var content = await stream.ReadToEndAsync();

            var sbomFile = JsonSerializer.Deserialize<SbomFile>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            if (sbomFile == null)
            {
                return BadRequest(new { error = "Invalid SBOM file format" });
            }

            var components = _parserService.ParseSbomFile(sbomFile);
            _logger.LogInformation($"Successfully parsed SBOM file with {components.Count} components");

            return Ok(components);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing SBOM file");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Uploads and parses multiple SBOM files and merges them
    /// </summary>
    [HttpPost("upload-multiple")]
    [RequestSizeLimit(104857600)] // 100MB total
    public async Task<ActionResult<List<SbomComponent>>> UploadMultipleSboms(List<IFormFile> files)
    {
        try
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { error = "No files uploaded" });
            }

            var allComponentLists = new List<List<SbomComponent>>();

            foreach (var file in files)
            {
                if (file.Length > 10485760) // 10MB per file
                {
                    _logger.LogWarning($"Skipping file {file.FileName} - exceeds 10MB limit");
                    continue;
                }

                using var stream = new StreamReader(file.OpenReadStream());
                var content = await stream.ReadToEndAsync();

                var sbomFile = JsonSerializer.Deserialize<SbomFile>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                if (sbomFile != null)
                {
                    var components = _parserService.ParseSbomFile(sbomFile);
                    allComponentLists.Add(components);
                }
            }

            if (allComponentLists.Count == 0)
            {
                return BadRequest(new { error = "No valid SBOM files found" });
            }

            var mergedComponents = _mergerService.MergeSboms(allComponentLists);
            _logger.LogInformation($"Successfully merged {files.Count} SBOM files into {mergedComponents.Count} components");

            return Ok(mergedComponents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging SBOM files");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Validates SBOM file format
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<bool>> ValidateSbom(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded" });
            }

            using var stream = new StreamReader(file.OpenReadStream());
            var content = await stream.ReadToEndAsync();
            var data = JsonSerializer.Deserialize<object>(content);

            var isValid = _parserService.ValidateSbomFile(data);
            return Ok(new { valid = isValid });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating SBOM file");
            return Ok(new { valid = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Merges component lists
    /// </summary>
    [HttpPost("merge")]
    public ActionResult<List<SbomComponent>> MergeSboms([FromBody] List<List<SbomComponent>> componentLists)
    {
        try
        {
            if (componentLists == null || componentLists.Count == 0)
            {
                return BadRequest(new { error = "No component lists provided" });
            }

            var mergedComponents = _mergerService.MergeSboms(componentLists);
            return Ok(mergedComponents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging SBOM data");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Deduplicates components
    /// </summary>
    [HttpPost("deduplicate")]
    public ActionResult<List<SbomComponent>> DeduplicateComponents([FromBody] List<SbomComponent> components)
    {
        try
        {
            if (components == null || components.Count == 0)
            {
                return BadRequest(new { error = "No components provided" });
            }

            var deduplicated = _mergerService.DeduplicateComponents(components);
            return Ok(deduplicated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deduplicating components");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Filters components based on filter state
    /// </summary>
    [HttpPost("filter")]
    public ActionResult<List<SbomComponent>> FilterComponents(
        [FromBody] FilterComponentsRequest request)
    {
        try
        {
            var filtered = request.Components.Where(component =>
            {
                // Search term filter
                if (!string.IsNullOrEmpty(request.Filters.SearchTerm) &&
                    !component.Name.Contains(request.Filters.SearchTerm, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Type filter
                if (request.Filters.Type.Count > 0 &&
                    !request.Filters.Type.Contains(component.Type.ToString(), StringComparer.OrdinalIgnoreCase))
                {
                    return false;
                }

                // License filter
                if (request.Filters.License.Count > 0 &&
                    !request.Filters.License.Contains(component.License, StringComparer.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Risk level filter
                if (request.Filters.RiskLevel.Count > 0 &&
                    !request.Filters.RiskLevel.Contains(component.RiskLevel.ToString(), StringComparer.OrdinalIgnoreCase))
                {
                    return false;
                }

                return true;
            }).ToList();

            return Ok(filtered);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error filtering components");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class FilterComponentsRequest
{
    public List<SbomComponent> Components { get; set; } = new();
    public FilterState Filters { get; set; } = new();
}

