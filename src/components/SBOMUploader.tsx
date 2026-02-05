import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';
import { createSbomOperations, type DataMode } from '../services/sbomOperations';

interface SBOMUploaderProps {
  onSBOMLoad: (components: SBOMComponent[]) => void;
  isOpen: boolean;
  onClose: () => void;
  dataMode: DataMode;
  onDataModeChange: (mode: DataMode) => void;
}

type UploadedSbomEntry = {
  name: string;
  file: File;
  components: SBOMComponent[];
};

const SBOMUploader: React.FC<SBOMUploaderProps> = ({
  onSBOMLoad,
  isOpen,
  onClose,
  dataMode,
  onDataModeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedSBOMs, setUploadedSBOMs] = useState<UploadedSbomEntry[]>([]);

  const ops = createSbomOperations(dataMode);

  const processFile = async (file: File): Promise<UploadedSbomEntry> => {
    const components = await ops.uploadSbom(file);
    return { name: file.name, file, components };
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // If user uploads a single file and nothing was queued, keep the old UX:
      // load immediately and close.
      if (uploadedSBOMs.length === 0 && files.length === 1) {
        const entry = await processFile(files[0]);
        onSBOMLoad(entry.components);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setUploadedSBOMs([]);
        }, 1500);
        return;
      }

      const entries = [];
      for (const f of files) {
        entries.push(await processFile(f));
      }

      setUploadedSBOMs((prev) => [...prev, ...entries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process SBOM file(s)');
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

  const handleRemoveSBOM = (index: number) => {
    setUploadedSBOMs(prev => prev.filter((_, i) => i !== index));
  };

  const handleMergeAndLoad = () => {
    if (uploadedSBOMs.length === 0) return;
    setLoading(true);
    setError(null);

    const files = uploadedSBOMs.map((s) => s.file);
    ops
      .uploadMultipleSboms(files)
      .then((merged) => {
        onSBOMLoad(merged);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setUploadedSBOMs([]);
        }, 1500);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to merge SBOM files');
      })
      .finally(() => setLoading(false));
  };

  const handleCloseModal = () => {
    onClose();
    setUploadedSBOMs([]);
    setError(null);
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleCloseModal}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl w-full max-w-md">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-100">Upload SBOM Files</h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={dataMode}
                  onChange={(e) => onDataModeChange(e.target.value as DataMode)}
                  className="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Data processing mode"
                >
                  <option value="auto">Auto</option>
                  <option value="api">API only</option>
                  <option value="local">Offline</option>
                </select>
                <button
                  onClick={handleCloseModal}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-400 bg-blue-900/20'
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
                accept=".json"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <p className="text-gray-300">Processing SBOM file...</p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                  <p className="text-green-300 font-medium">SBOM loaded successfully!</p>
                  <p className="text-green-400 text-sm">Closing automatically...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-gray-300 font-medium mb-2">
                      Drop SBOM files here or click to browse
                    </p>
                    <p className="text-gray-500 text-sm">
                      Supports CycloneDX and SPDX JSON formats
                    </p>
                    {uploadedSBOMs.length > 0 ? (
                      <p className="text-yellow-400 text-sm mt-1">
                        Additional files will be merged with existing data
                      </p>
                    ) : (
                      <p className="text-blue-400 text-sm mt-1">
                        First file loads automatically • Multiple files will be merged
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleButtonClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Upload Failed</p>
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedSBOMs.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-300">
                    Additional Files ({uploadedSBOMs.length})
                  </h4>
                  <button
                    onClick={handleMergeAndLoad}
                    disabled={loading || success}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm font-medium shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Merge & Load All
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedSBOMs.map((sbom, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {sbom.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sbom.components.length} components
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSBOM(index)}
                        className="p-1.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Format Info */}
            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Upload Process:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• <strong>Single file:</strong> Loads automatically</li>
                <li>• <strong>Multiple files:</strong> First loads immediately, others wait for merge</li>
                <li>• <strong>Formats:</strong> CycloneDX & SPDX JSON</li>
                <li>• <strong>Limit:</strong> 10MB per file</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SBOMUploader;