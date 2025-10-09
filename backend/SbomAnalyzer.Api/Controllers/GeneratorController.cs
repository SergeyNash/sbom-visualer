using Microsoft.AspNetCore.Mvc;
using SbomAnalyzer.Api.Models;
using SbomAnalyzer.Api.Services;

namespace SbomAnalyzer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeneratorController : ControllerBase
{
    private readonly ISbomGeneratorService _generatorService;
    private readonly IArchiveExtractorService _archiveExtractorService;
    private readonly ILogger<GeneratorController> _logger;

    public GeneratorController(
        ISbomGeneratorService generatorService,
        IArchiveExtractorService archiveExtractorService,
        ILogger<GeneratorController> logger)
    {
        _generatorService = generatorService;
        _archiveExtractorService = archiveExtractorService;
        _logger = logger;
    }

    /// <summary>
    /// Gets list of supported project types
    /// </summary>
    [HttpGet("project-types")]
    public ActionResult<List<ProjectType>> GetProjectTypes()
    {
        var projectTypes = _generatorService.GetSupportedProjectTypes();
        return Ok(projectTypes);
    }

    /// <summary>
    /// Detects project type from uploaded files
    /// </summary>
    [HttpPost("detect-project-type")]
    public async Task<ActionResult<ProjectType>> DetectProjectType(List<IFormFile> files)
    {
        try
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { error = "No files uploaded" });
            }

            var fileNames = files.Select(f => f.FileName).ToList();
            var detectedType = _generatorService.DetectProjectType(fileNames);

            if (detectedType == null)
            {
                return NotFound(new { error = "Could not detect project type" });
            }

            return Ok(detectedType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting project type");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Generates SBOM from uploaded source code files
    /// </summary>
    [HttpPost("generate-from-code")]
    [RequestSizeLimit(104857600)] // 100MB
    public async Task<ActionResult<GenerationResult>> GenerateFromCode(
        [FromForm] GenerationOptions options,
        [FromForm] List<IFormFile> files)
    {
        try
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { error = "No files uploaded" });
            }

            var projectFiles = new Dictionary<string, string>();

            foreach (var file in files)
            {
                if (file.Length > 10485760) // 10MB per file
                {
                    _logger.LogWarning($"Skipping file {file.FileName} - exceeds 10MB limit");
                    continue;
                }

                using var stream = new StreamReader(file.OpenReadStream());
                var content = await stream.ReadToEndAsync();
                projectFiles[file.FileName] = content;
            }

            if (projectFiles.Count == 0)
            {
                return BadRequest(new { error = "No valid files found" });
            }

            var result = await _generatorService.GenerateFromCodeAsync(projectFiles, options);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            _logger.LogInformation($"Successfully generated SBOM with {result.SbomData?.Count ?? 0} components");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SBOM from code");
            return StatusCode(500, new GenerationResult
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Generates SBOM from uploaded archive (ZIP, TAR.GZ, etc.)
    /// </summary>
    [HttpPost("generate-from-archive")]
    [RequestSizeLimit(104857600)] // 100MB
    public async Task<ActionResult<GenerationResult>> GenerateFromArchive(
        [FromForm] GenerationOptions options,
        [FromForm] IFormFile archive)
    {
        try
        {
            if (archive == null || archive.Length == 0)
            {
                return BadRequest(new { error = "No archive uploaded" });
            }

            if (!_archiveExtractorService.IsSupportedArchive(archive.FileName))
            {
                return BadRequest(new { error = "Unsupported archive format" });
            }

            // Extract archive
            using var archiveStream = archive.OpenReadStream();
            var extractionResult = await _archiveExtractorService.ExtractArchiveAsync(archiveStream, archive.FileName);

            if (!extractionResult.Success)
            {
                return BadRequest(new GenerationResult
                {
                    Success = false,
                    Error = extractionResult.Error
                });
            }

            // Filter relevant project files
            var relevantFiles = _archiveExtractorService.FilterRelevantProjectFiles(extractionResult.Files!);

            if (relevantFiles.Count == 0)
            {
                return BadRequest(new GenerationResult
                {
                    Success = false,
                    Error = "No relevant project files found in archive"
                });
            }

            // Convert to dictionary
            var projectFiles = relevantFiles.ToDictionary(
                f => f.Name,
                f => f.Content
            );

            // Generate SBOM
            var result = await _generatorService.GenerateFromCodeAsync(projectFiles, options);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            _logger.LogInformation($"Successfully generated SBOM from archive with {result.SbomData?.Count ?? 0} components");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SBOM from archive");
            return StatusCode(500, new GenerationResult
            {
                Success = false,
                Error = ex.Message
            });
        }
    }
}

