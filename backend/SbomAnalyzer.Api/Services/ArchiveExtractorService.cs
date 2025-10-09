using SbomAnalyzer.Api.Models;
using SharpCompress.Archives;
using SharpCompress.Common;
using System.Text;

namespace SbomAnalyzer.Api.Services;

public class ArchiveExtractorService : IArchiveExtractorService
{
    private const long MAX_ARCHIVE_SIZE = 100 * 1024 * 1024; // 100MB
    private const int MAX_FILES_IN_ARCHIVE = 10000;
    private const long MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private static readonly string[] SUPPORTED_EXTENSIONS = { ".zip", ".tar.gz", ".tgz", ".tar", ".gz" };

    public bool IsSupportedArchive(string fileName)
    {
        var lowerFileName = fileName.ToLowerInvariant();
        return SUPPORTED_EXTENSIONS.Any(ext => lowerFileName.EndsWith(ext));
    }

    public async Task<ArchiveExtractionResult> ExtractArchiveAsync(Stream archiveStream, string fileName)
    {
        var startTime = DateTime.Now;

        try
        {
            // Validate file size
            if (archiveStream.Length > MAX_ARCHIVE_SIZE)
            {
                return new ArchiveExtractionResult
                {
                    Success = false,
                    Error = $"Archive size ({archiveStream.Length / 1024.0 / 1024.0:F1}MB) exceeds maximum allowed size ({MAX_ARCHIVE_SIZE / 1024 / 1024}MB)"
                };
            }

            var extractedFiles = new List<ExtractedFile>();
            long totalSize = 0;
            int fileCount = 0;

            using (var archive = ArchiveFactory.Open(archiveStream))
            {
                foreach (var entry in archive.Entries)
                {
                    // Skip directories
                    if (entry.IsDirectory)
                    {
                        continue;
                    }

                    // Limit number of files
                    if (fileCount >= MAX_FILES_IN_ARCHIVE)
                    {
                        return new ArchiveExtractionResult
                        {
                            Success = false,
                            Error = $"Archive contains too many files ({fileCount}+). Maximum allowed: {MAX_FILES_IN_ARCHIVE}"
                        };
                    }

                    // Check individual file size
                    if (entry.Size > MAX_INDIVIDUAL_FILE_SIZE)
                    {
                        Console.WriteLine($"Skipping large file: {entry.Key} ({entry.Size / 1024.0 / 1024.0:F1}MB)");
                        continue;
                    }

                    try
                    {
                        // Extract file content
                        using var entryStream = entry.OpenEntryStream();
                        using var memoryStream = new MemoryStream();
                        await entryStream.CopyToAsync(memoryStream);
                        var content = Encoding.UTF8.GetString(memoryStream.ToArray());

                        var entryFileName = Path.GetFileName(entry.Key);

                        extractedFiles.Add(new ExtractedFile
                        {
                            Name = entryFileName,
                            Content = content,
                            Size = content.Length,
                            Path = entry.Key
                        });

                        totalSize += content.Length;
                        fileCount++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to extract file: {entry.Key}, Error: {ex.Message}");
                        continue;
                    }
                }
            }

            var extractionTime = (long)(DateTime.Now - startTime).TotalMilliseconds;

            return new ArchiveExtractionResult
            {
                Success = true,
                Files = extractedFiles,
                Metadata = new ExtractionMetadata
                {
                    TotalFiles = fileCount,
                    TotalSize = totalSize,
                    ArchiveType = Path.GetExtension(fileName).ToUpperInvariant(),
                    ExtractionTime = extractionTime
                }
            };
        }
        catch (Exception ex)
        {
            return new ArchiveExtractionResult
            {
                Success = false,
                Error = $"Failed to extract archive: {ex.Message}"
            };
        }
    }

    public List<ExtractedFile> FilterRelevantProjectFiles(List<ExtractedFile> files)
    {
        var relevantFileNames = new[]
        {
            "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
            "requirements.txt", "pyproject.toml", "Pipfile", "setup.py",
            "pom.xml", "build.gradle", "build.gradle.kts",
            "packages.config", "go.mod", "go.sum",
            "Cargo.toml", "Cargo.lock",
            "composer.json", "composer.lock"
        };

        var relevantExtensions = new[]
        {
            ".js", ".ts", ".jsx", ".tsx",
            ".py", ".java", ".cs", ".vb", ".fs",
            ".go", ".rs", ".php",
            ".json", ".toml", ".yaml", ".yml", ".xml",
            ".csproj", ".sln"
        };

        var excludedDirectories = new[]
        {
            "node_modules", ".git", "dist", "build", ".vscode", ".idea",
            "bin", "obj", "__pycache__", ".next", ".nuxt", "target"
        };

        return files.Where(file =>
        {
            var lowerFileName = file.Name.ToLowerInvariant();
            var lowerFilePath = file.Path.ToLowerInvariant();

            // Check if file is in excluded directory
            if (excludedDirectories.Any(dir => lowerFilePath.Contains($"/{dir}/") || lowerFilePath.Contains($"\\{dir}\\")))
            {
                return false;
            }

            // Check if it's a package manager file
            if (relevantFileNames.Any(name => lowerFileName == name.ToLowerInvariant()))
            {
                return true;
            }

            // Check if it's a source code file
            if (relevantExtensions.Any(ext => lowerFileName.EndsWith(ext)))
            {
                return true;
            }

            return false;
        }).ToList();
    }
}

