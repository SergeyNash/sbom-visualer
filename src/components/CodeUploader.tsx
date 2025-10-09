import React, { useRef, useState } from 'react';
import { Code, Upload, AlertCircle, CheckCircle, X, FileText, Settings, Zap } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';
import { detectProjectType, generateSBOMFromCode, SUPPORTED_PROJECT_TYPES, GenerationOptions } from '../utils/sbomGenerator';
import { extractAndProcessArchive, ExtractedFile } from '../utils/archiveExtractor';

interface CodeUploaderProps {
  onSBOMLoad: (components: SBOMComponent[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CodeUploader: React.FC<CodeUploaderProps> = ({ onSBOMLoad, isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [detectedProjectType, setDetectedProjectType] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    projectType: '',
    includeDevDependencies: true,
    includeOptionalDependencies: false,
    outputFormat: 'json',
    includeMetadata: true
  });

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      let filesToProcess: File[] = [];

      // Check if it's an archive file
      if (file.name.toLowerCase().endsWith('.zip')) {
        const extractionResult = await extractAndProcessArchive(file);
        if (!extractionResult.success) {
          throw new Error(extractionResult.error || 'Failed to extract archive');
        }
        
        if (extractionResult.files) {
          setExtractedFiles(extractionResult.files);
          // Convert extracted files to File objects
          filesToProcess = extractionResult.files.map(extractedFile => {
            const blob = new Blob([extractedFile.content], { type: 'text/plain' });
            return new File([blob], extractedFile.name, {
              type: 'text/plain',
              lastModified: Date.now()
            });
          });
        }
      } else {
        // Single file upload
        filesToProcess = [file];
      }

      setUploadedFiles(filesToProcess);

      // Detect project type
      const projectType = detectProjectType(filesToProcess);
      if (projectType) {
        setDetectedProjectType(projectType.id);
        setGenerationOptions(prev => ({ ...prev, projectType: projectType.id }));
      } else {
        setDetectedProjectType(null);
        setError('Could not detect project type. Please ensure you have uploaded the appropriate package manager files (package.json, requirements.txt, pom.xml, etc.)');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process uploaded files');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await handleFile(file);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await handleFile(file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateSBOM = async () => {
    if (uploadedFiles.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateSBOMFromCode(uploadedFiles, generationOptions);
      
      if (result.success && result.sbomData) {
        onSBOMLoad(result.sbomData);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setUploadedFiles([]);
          setExtractedFiles([]);
          setDetectedProjectType(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to generate SBOM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SBOM');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    onClose();
    setUploadedFiles([]);
    setExtractedFiles([]);
    setDetectedProjectType(null);
    setError(null);
    setSuccess(false);
    setShowOptions(false);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
      setDetectedProjectType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleCloseModal}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Code className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-semibold text-gray-100">Generate SBOM from Code</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-green-400 bg-green-900/20'
                  : 'border-gray-600 hover:border-gray-500'
              } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json,.txt,.toml,.xml,.mod,.lock,.gradle,.csproj,.sln,.php"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  <p className="text-gray-300">Processing files...</p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                  <p className="text-green-300 font-medium">SBOM generated successfully!</p>
                  <p className="text-green-400 text-sm">Closing automatically...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-gray-300 font-medium mb-2">
                      Drop project files or ZIP archive here
                    </p>
                    <p className="text-gray-500 text-sm">
                      Supports: package.json, requirements.txt, pom.xml, go.mod, Cargo.toml, composer.json
                    </p>
                    <p className="text-green-400 text-sm mt-1">
                      ZIP archives will be automatically extracted
                    </p>
                  </div>
                  <button
                    onClick={handleButtonClick}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
                  >
                    Choose Files
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Processing Failed</p>
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Project Type Detection */}
            {detectedProjectType && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h4 className="text-green-300 font-medium">Project Type Detected</h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {SUPPORTED_PROJECT_TYPES.find(t => t.id === detectedProjectType)?.icon}
                  </span>
                  <div>
                    <p className="text-green-200 font-medium">
                      {SUPPORTED_PROJECT_TYPES.find(t => t.id === detectedProjectType)?.name}
                    </p>
                    <p className="text-green-400 text-sm">
                      {SUPPORTED_PROJECT_TYPES.find(t => t.id === detectedProjectType)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-300">
                    Project Files ({uploadedFiles.length})
                  </h4>
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Options
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generation Options */}
            {showOptions && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Generation Options</h4>
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeDevDependencies}
                        onChange={(e) => setGenerationOptions(prev => ({
                          ...prev,
                          includeDevDependencies: e.target.checked
                        }))}
                        className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400"
                      />
                      <span className="text-sm text-gray-300">Include dev dependencies</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeOptionalDependencies}
                        onChange={(e) => setGenerationOptions(prev => ({
                          ...prev,
                          includeOptionalDependencies: e.target.checked
                        }))}
                        className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400"
                      />
                      <span className="text-sm text-gray-300">Include optional dependencies</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeMetadata}
                        onChange={(e) => setGenerationOptions(prev => ({
                          ...prev,
                          includeMetadata: e.target.checked
                        }))}
                        className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400"
                      />
                      <span className="text-sm text-gray-300">Include metadata</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            {uploadedFiles.length > 0 && detectedProjectType && (
              <div className="mt-6">
                <button
                  onClick={handleGenerateSBOM}
                  disabled={loading || success}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Generate SBOM
                </button>
              </div>
            )}

            {/* Format Info */}
            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Supported Formats:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• <strong>Node.js:</strong> package.json, package-lock.json</li>
                <li>• <strong>Python:</strong> requirements.txt, pyproject.toml</li>
                <li>• <strong>Java:</strong> pom.xml, build.gradle</li>
                <li>• <strong>.NET:</strong> *.csproj, packages.config</li>
                <li>• <strong>Go:</strong> go.mod, go.sum</li>
                <li>• <strong>Rust:</strong> Cargo.toml, Cargo.lock</li>
                <li>• <strong>PHP:</strong> composer.json, composer.lock</li>
                <li>• <strong>Archives:</strong> ZIP files (auto-extracted)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeUploader;
