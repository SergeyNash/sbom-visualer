import React, { useRef, useState } from 'react';
import { Upload, Code, AlertCircle, CheckCircle, X, Settings, FileText, FolderOpen, Archive } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';
import { 
  generateSBOMFromCode, 
  detectProjectType, 
  SUPPORTED_PROJECT_TYPES, 
  ProjectType, 
  GenerationOptions 
} from '../utils/sbomGenerator';
import { 
  extractAndProcessArchive, 
  isSupportedArchive, 
  convertExtractedFilesToFileObjects,
  SUPPORTED_ARCHIVE_EXTENSIONS 
} from '../utils/archiveExtractor';

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
  const [detectedProjectType, setDetectedProjectType] = useState<ProjectType | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isExtractingArchive, setIsExtractingArchive] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    projectType: '',
    includeDevDependencies: true,
    includeOptionalDependencies: true,
    outputFormat: 'json',
    includeMetadata: true
  });

  const handleFile = async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      // Validate files
      if (files.length === 0) {
        throw new Error('Please select at least one file');
      }

      // Check if it's an archive
      if (files.length === 1 && isSupportedArchive(files[0])) {
        setIsExtractingArchive(true);
        const archiveResult = await extractAndProcessArchive(files[0]);
        setIsExtractingArchive(false);

        if (!archiveResult.success) {
          throw new Error(archiveResult.error || 'Failed to extract archive');
        }

        if (!archiveResult.files || archiveResult.files.length === 0) {
          throw new Error('No relevant project files found in the archive');
        }

        // Convert extracted files to File objects
        const extractedFiles = convertExtractedFilesToFileObjects(archiveResult.files);
        setUploadedFiles(extractedFiles);

        // Detect project type from extracted files
        const detected = detectProjectType(extractedFiles);
        setDetectedProjectType(detected);
        
        if (detected) {
          setGenerationOptions(prev => ({ ...prev, projectType: detected.id }));
        } else {
          setError('Could not detect project type from extracted files. Please ensure the archive contains appropriate package manager files.');
        }

        return;
      }

      // Handle regular files
      // Check file sizes (limit to 50MB total)
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 50 * 1024 * 1024) {
        throw new Error('Total file size exceeds 50MB limit');
      }

      setUploadedFiles(files);

      // Detect project type
      const detected = detectProjectType(files);
      setDetectedProjectType(detected);
      
      if (detected) {
        setGenerationOptions(prev => ({ ...prev, projectType: detected.id }));
      } else {
        setError('Could not detect project type. Please ensure you have uploaded the appropriate package manager files (package.json, requirements.txt, pom.xml, etc.)');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
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
      await handleFile(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFile(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateSBOM = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload project files first');
      return;
    }

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
          setDetectedProjectType(null);
        }, 2000);
      } else {
        setError(result.error || 'Failed to generate SBOM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    if (newFiles.length === 0) {
      setDetectedProjectType(null);
    } else {
      const detected = detectProjectType(newFiles);
      setDetectedProjectType(detected);
      if (detected) {
        setGenerationOptions(prev => ({ ...prev, projectType: detected.id }));
      }
    }
  };

  const handleCloseModal = () => {
    onClose();
    setUploadedFiles([]);
    setDetectedProjectType(null);
    setError(null);
    setSuccess(false);
    setShowOptions(false);
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
                <h2 className="text-xl font-semibold text-gray-100">Generate SBOM from Source Code</h2>
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
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  <p className="text-gray-300">
                    {isExtractingArchive ? 'Extracting archive...' : 'Processing project files...'}
                  </p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                  <p className="text-green-300 font-medium">SBOM generated successfully!</p>
                  <p className="text-green-400 text-sm">Loading into analyzer...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-12 h-12 text-gray-400" />
                    <Archive className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-gray-300 font-medium mb-2">
                      Drop project files or archives here or click to browse
                    </p>
                    <p className="text-gray-500 text-sm">
                      Upload package manager files, source code, or ZIP archives
                    </p>
                    <p className="text-blue-400 text-sm mt-1">
                      Supported files: package.json, requirements.txt, pom.xml, Cargo.toml, go.mod, composer.json
                    </p>
                    <p className="text-green-400 text-sm mt-1">
                      Supported archives: ZIP files (up to 100MB)
                    </p>
                  </div>
                  <button
                    onClick={handleButtonClick}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
                  >
                    Choose Files or Archive
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Generation Failed</p>
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Project Type Detection */}
            {detectedProjectType && (
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{detectedProjectType.icon}</span>
                  <div>
                    <h4 className="text-blue-300 font-medium">Detected Project Type</h4>
                    <p className="text-blue-400 text-sm">{detectedProjectType.name}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">{detectedProjectType.description}</p>
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
                    <label className="block text-sm text-gray-400 mb-1">Project Type</label>
                    <select
                      value={generationOptions.projectType}
                      onChange={(e) => setGenerationOptions(prev => ({ ...prev, projectType: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 text-sm"
                    >
                      <option value="">Auto-detect</option>
                      {SUPPORTED_PROJECT_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeDevDependencies}
                        onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeDevDependencies: e.target.checked }))}
                        className="rounded border-gray-500 bg-gray-600 text-green-500"
                      />
                      Include Dev Dependencies
                    </label>
                    
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeOptionalDependencies}
                        onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeOptionalDependencies: e.target.checked }))}
                        className="rounded border-gray-500 bg-gray-600 text-green-500"
                      />
                      Include Optional Dependencies
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={generationOptions.includeMetadata}
                        onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                        className="rounded border-gray-500 bg-gray-600 text-green-500"
                      />
                      Include Metadata
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleGenerateSBOM}
                  disabled={loading || success || !detectedProjectType}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4" />
                      Generate SBOM
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Supported Project Types Info */}
            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Supported Project Types:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {SUPPORTED_PROJECT_TYPES.map(type => (
                  <div key={type.id} className="flex items-center gap-2 text-gray-400">
                    <span>{type.icon}</span>
                    <span>{type.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Archive Support:</h5>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Archive className="w-4 h-4" />
                  <span>ZIP archives (up to 100MB, max 10,000 files)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload ZIP archives containing your project files, or individual package manager files for automatic detection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeUploader;
