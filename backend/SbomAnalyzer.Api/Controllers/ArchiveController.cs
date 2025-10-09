using Microsoft.AspNetCore.Mvc;
using SbomAnalyzer.Api.Models;
using SbomAnalyzer.Api.Services;

namespace SbomAnalyzer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArchiveController : ControllerBase
{
    private readonly IArchiveExtractorService _archiveExtractorService;
    private readonly ILogger<ArchiveController> _logger;

    public ArchiveController(
        IArchiveExtractorService archiveExtractorService,
        ILogger<ArchiveController> logger)
    {
        _archiveExtractorService = archiveExtractorService;
        _logger = logger;
    }

    /// <summary>
    /// Extracts files from an archive
    /// </summary>
    [HttpPost("extract")]
    [RequestSizeLimit(104857600)] // 100MB
    public async Task<ActionResult<ArchiveExtractionResult>> ExtractArchive(IFormFile archive)
    {
        try
        {
            if (archive == null || archive.Length == 0)
            {
                return BadRequest(new { error = "No archive uploaded" });
            }

            if (!_archiveExtractorService.IsSupportedArchive(archive.FileName))
            {
                return BadRequest(new { error = "Unsupported archive format. Supported formats: ZIP, TAR.GZ" });
            }

            using var stream = archive.OpenReadStream();
            var result = await _archiveExtractorService.ExtractArchiveAsync(stream, archive.FileName);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            _logger.LogInformation($"Successfully extracted {result.Files?.Count ?? 0} files from archive");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting archive");
            return StatusCode(500, new ArchiveExtractionResult
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Checks if a file is a supported archive format
    /// </summary>
    [HttpGet("is-supported")]
    public ActionResult<bool> IsSupportedArchive([FromQuery] string fileName)
    {
        if (string.IsNullOrEmpty(fileName))
        {
            return BadRequest(new { error = "File name is required" });
        }

        var isSupported = _archiveExtractorService.IsSupportedArchive(fileName);
        return Ok(new { supported = isSupported });
    }
}

