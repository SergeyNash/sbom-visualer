import React, { useRef, useState } from 'react';
import { Code, Upload, AlertCircle, CheckCircle, FileText, Settings, Zap, Download } from 'lucide-react';
import { RawSbomFile, SBOMComponent } from '../types/sbom';
import {
  createSbomOperations,
  type DataMode,
  type GenerationOptions,
  type ProjectType,
} from '../services/sbomOperations';

interface EmbeddedCodeGeneratorProps {
  onSBOMLoad: (components: SBOMComponent[]) => void;
  dataMode: DataMode;
  onDataModeChange: (mode: DataMode) => void;
}

const EmbeddedCodeGenerator: React.FC<EmbeddedCodeGeneratorProps> = ({
  onSBOMLoad,
  dataMode,
  onDataModeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [detectedProjectType, setDetectedProjectType] = useState<ProjectType | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [rawSboms, setRawSboms] = useState<RawSbomFile[]>([]);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    includeDevDependencies: true,
    includeOptionalDependencies: false,
    outputFormat: 'json',
    includeMetadata: true,
    sbomFormat: 'cyclonedx',
    generateBoth: false,
  });

  const ops = createSbomOperations(dataMode);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    setRawSboms([]);

    try {
      if (files.length === 1) {
        const f = files[0];
        const supported = await ops.isSupportedArchive(f.name);
        if (supported) {
          setArchiveFile(f);
          setUploadedFiles([f]);
          setDetectedProjectType(null);
          setGenerationOptions((prev) => ({ ...prev, projectType: undefined }));
          return;
        }
      }

      setArchiveFile(null);
      setUploadedFiles(files);

      const projectType = await ops.detectProjectType(files);
      if (projectType) {
        setDetectedProjectType(projectType);
        setGenerationOptions((prev) => ({ ...prev, projectType: projectType.id }));
      } else {
        setDetectedProjectType(null);
        setError(
          'Could not detect project type. Please ensure you have uploaded the appropriate package manager files (package.json, requirements.txt, pom.xml, etc.)'
        );
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
      await handleFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
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
    setSuccess(false);
    setRawSboms([]);

    try {
      const result = archiveFile
        ? await ops.generateFromArchive(archiveFile, generationOptions)
        : await ops.generateFromCode(uploadedFiles, generationOptions);

      if (result.success && result.sbomData) {
        onSBOMLoad(result.sbomData);
        setRawSboms(result.rawSboms ?? []);
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to generate SBOM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SBOM');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) setDetectedProjectType(null);
    if (uploadedFiles.length === 1) setArchiveFile(null);
  };

  const downloadRawSbom = (file: RawSbomFile) => {
    const blob = new Blob([file.content], { type: file.mediaType || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6 text-green-400" />
          <h2 className="text-lg font-semibold text-gray-100">Generate SBOM from Code</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Mode</span>
          <select
            value={dataMode}
            onChange={(e) => onDataModeChange(e.target.value as DataMode)}
            className="bg-gray-700 border border-gray-600 text-gray-100 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            title="Data processing mode"
          >
            <option value="auto">Auto</option>
            <option value="api">API only</option>
            <option value="local">Offline</option>
          </select>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
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
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-10 h-10 text-gray-400" />
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

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Processing Failed</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && !error && (
        <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-medium">SBOM generated successfully</p>
            <p className="text-green-400 text-sm mt-1">Components are loaded for visualization.</p>
          </div>
        </div>
      )}

      {detectedProjectType && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-300 font-medium">Project Type Detected</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{detectedProjectType.icon}</span>
            <div>
              <p className="text-green-200 font-medium">{detectedProjectType.name}</p>
              <p className="text-green-400 text-sm">{detectedProjectType.description}</p>
            </div>
          </div>
        </div>
      )}

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
                  <span className="text-red-400">×</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showOptions && (
        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Generation Options</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">SBOM standard</label>
              <select
                value={generationOptions.sbomFormat ?? 'cyclonedx'}
                onChange={(e) => setGenerationOptions(prev => ({
                  ...prev,
                  sbomFormat: e.target.value as GenerationOptions['sbomFormat'],
                }))}
                disabled={generationOptions.generateBoth}
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
              >
                <option value="cyclonedx">CycloneDX</option>
                <option value="spdx">SPDX</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generationOptions.generateBoth ?? false}
                  onChange={(e) => setGenerationOptions(prev => ({
                    ...prev,
                    generateBoth: e.target.checked,
                  }))}
                  className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400"
                />
                <span className="text-sm text-gray-300">Generate both CycloneDX + SPDX</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generationOptions.includeDevDependencies}
                  onChange={(e) => setGenerationOptions(prev => ({
                    ...prev,
                    includeDevDependencies: e.target.checked,
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
                    includeOptionalDependencies: e.target.checked,
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
                    includeMetadata: e.target.checked,
                  }))}
                  className="rounded border-gray-600 bg-gray-700 text-green-400 focus:ring-green-400"
                />
                <span className="text-sm text-gray-300">Include metadata</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (detectedProjectType || archiveFile) && (
        <div className="mt-6">
          <button
            onClick={handleGenerateSBOM}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium shadow-lg"
          >
            <Zap className="w-5 h-5" />
            Generate SBOM
          </button>
        </div>
      )}

      {rawSboms.length > 0 && (
        <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Download SBOM</h4>
          <div className="flex flex-wrap gap-2">
            {rawSboms.map((file, index) => (
              <button
                key={`${file.fileName}-${index}`}
                onClick={() => downloadRawSbom(file)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-md text-sm"
              >
                <Download className="w-4 h-4" />
                {file.fileName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedCodeGenerator;
