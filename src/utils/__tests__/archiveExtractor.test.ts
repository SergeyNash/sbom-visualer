import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import {
  isSupportedArchive,
  extractZipArchive,
  convertExtractedFilesToFileObjects,
  filterRelevantProjectFiles,
  extractAndProcessArchive,
  SUPPORTED_ARCHIVE_TYPES,
  SUPPORTED_ARCHIVE_EXTENSIONS,
  MAX_ARCHIVE_SIZE,
  MAX_FILES_IN_ARCHIVE,
  MAX_INDIVIDUAL_FILE_SIZE
} from '../archiveExtractor';

// Mock JSZip
vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    loadAsync: vi.fn(),
    files: {}
  }))
}));

describe('archiveExtractor', () => {
  describe('isSupportedArchive', () => {
    it('should return true for supported MIME types', () => {
      const file = new File([''], 'test.zip', { type: 'application/zip' });
      expect(isSupportedArchive(file)).toBe(true);
    });

    it('should return true for supported file extensions', () => {
      SUPPORTED_ARCHIVE_EXTENSIONS.forEach(ext => {
        const file = new File([''], `test${ext}`, { type: 'application/octet-stream' });
        expect(isSupportedArchive(file)).toBe(true);
      });
    });

    it('should return false for unsupported file types', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(isSupportedArchive(file)).toBe(false);
    });

    it('should be case insensitive for file extensions', () => {
      const file = new File([''], 'TEST.ZIP', { type: 'application/octet-stream' });
      expect(isSupportedArchive(file)).toBe(true);
    });
  });

  describe('extractZipArchive', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should extract files from ZIP archive successfully', async () => {
      const mockZipContent = {
        'package.json': {
          dir: false,
          uncompressedSize: 100,
          async: vi.fn().mockResolvedValue('{"name": "test"}')
        },
        'src/index.js': {
          dir: false,
          uncompressedSize: 50,
          async: vi.fn().mockResolvedValue('console.log("test");')
        },
        'node_modules/': {
          dir: true,
          uncompressedSize: 0,
          async: vi.fn()
        }
      };

      const mockZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent
        })
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractZipArchive(file);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2); // Only non-directory files
      expect(result.files![0]).toEqual({
        name: 'package.json',
        content: '{"name": "test"}',
        size: 17,
        path: 'package.json'
      });
      expect(result.files![1]).toEqual({
        name: 'index.js',
        content: 'console.log("test");',
        size: 20,
        path: 'src/index.js'
      });
      expect(result.metadata?.totalFiles).toBe(2);
      expect(result.metadata?.archiveType).toBe('ZIP');
    });

    it('should reject archives that are too large', async () => {
      const file = new File([''], 'large.zip', { type: 'application/zip' });
      Object.defineProperty(file, 'size', { value: MAX_ARCHIVE_SIZE + 1 });

      const result = await extractZipArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject archives with too many files', async () => {
      const mockFiles: any = {};
      for (let i = 0; i < MAX_FILES_IN_ARCHIVE + 1; i++) {
        mockFiles[`file${i}.txt`] = {
          dir: false,
          uncompressedSize: 10,
          async: vi.fn().mockResolvedValue('content')
        };
      }

      const mockZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockFiles
        })
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractZipArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too many files');
    });

    it('should skip files that are too large', async () => {
      const mockZipContent = {
        'small.txt': {
          dir: false,
          uncompressedSize: 100,
          async: vi.fn().mockResolvedValue('small content')
        },
        'large.txt': {
          dir: false,
          uncompressedSize: MAX_INDIVIDUAL_FILE_SIZE + 1,
          async: vi.fn().mockResolvedValue('large content')
        }
      };

      const mockZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent
        })
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractZipArchive(file);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1); // Only the small file
      expect(result.files![0].name).toBe('small.txt');
    });

    it('should handle extraction errors gracefully', async () => {
      const mockZipContent = {
        'corrupted.txt': {
          dir: false,
          uncompressedSize: 100,
          async: vi.fn().mockRejectedValue(new Error('Corrupted file'))
        },
        'good.txt': {
          dir: false,
          uncompressedSize: 50,
          async: vi.fn().mockResolvedValue('good content')
        }
      };

      const mockZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent
        })
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractZipArchive(file);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1); // Only the good file
      expect(result.files![0].name).toBe('good.txt');
    });

    it('should handle JSZip loading errors', async () => {
      const mockZip = {
        loadAsync: vi.fn().mockRejectedValue(new Error('Invalid ZIP file'))
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['invalid zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractZipArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ZIP file');
    });
  });

  describe('convertExtractedFilesToFileObjects', () => {
    it('should convert extracted files to File objects', () => {
      const extractedFiles = [
        {
          name: 'package.json',
          content: '{"name": "test"}',
          size: 17,
          path: 'package.json'
        },
        {
          name: 'index.js',
          content: 'console.log("test");',
          size: 20,
          path: 'src/index.js'
        }
      ];

      const result = convertExtractedFilesToFileObjects(extractedFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(File);
      expect(result[0].name).toBe('package.json');
      expect(result[1]).toBeInstanceOf(File);
      expect(result[1].name).toBe('index.js');
    });
  });

  describe('filterRelevantProjectFiles', () => {
    it('should filter to only relevant project files', () => {
      const extractedFiles = [
        {
          name: 'package.json',
          content: '{"name": "test"}',
          size: 17,
          path: 'package.json'
        },
        {
          name: 'index.js',
          content: 'console.log("test");',
          size: 20,
          path: 'src/index.js'
        },
        {
          name: 'node_modules_artifact.txt',
          content: 'should be filtered',
          size: 10,
          path: 'node_modules/dependency/file.txt'
        },
        {
          name: 'requirements.txt',
          content: 'requests==2.28.0',
          size: 15,
          path: 'requirements.txt'
        },
        {
          name: 'random.txt',
          content: 'not relevant',
          size: 10,
          path: 'random.txt'
        }
      ];

      const result = filterRelevantProjectFiles(extractedFiles);

      expect(result).toHaveLength(3); // package.json, index.js, requirements.txt
      expect(result.some(f => f.name === 'package.json')).toBe(true);
      expect(result.some(f => f.name === 'index.js')).toBe(true);
      expect(result.some(f => f.name === 'requirements.txt')).toBe(true);
      expect(result.some(f => f.name === 'node_modules_artifact.txt')).toBe(false);
      expect(result.some(f => f.name === 'random.txt')).toBe(false);
    });

    it('should include files with relevant extensions', () => {
      const extractedFiles = [
        {
          name: 'app.py',
          content: 'print("hello")',
          size: 15,
          path: 'src/app.py'
        },
        {
          name: 'config.toml',
          content: '[config]',
          size: 10,
          path: 'config.toml'
        },
        {
          name: 'data.xml',
          content: '<data></data>',
          size: 12,
          path: 'data.xml'
        }
      ];

      const result = filterRelevantProjectFiles(extractedFiles);

      expect(result).toHaveLength(3);
      expect(result.every(f => f.name.match(/\.(py|toml|xml)$/))).toBe(true);
    });

    it('should exclude files in irrelevant directories', () => {
      const extractedFiles = [
        {
          name: 'package.json',
          content: '{"name": "test"}',
          size: 17,
          path: 'package.json'
        },
        {
          name: 'package.json',
          content: '{"name": "dependency"}',
          size: 20,
          path: 'node_modules/dependency/package.json'
        },
        {
          name: 'index.js',
          content: 'console.log("test");',
          size: 20,
          path: '.git/hooks/index.js'
        }
      ];

      const result = filterRelevantProjectFiles(extractedFiles);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('package.json');
    });
  });

  describe('extractAndProcessArchive', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should extract and process ZIP archive successfully', async () => {
      const mockZipContent = {
        'package.json': {
          dir: false,
          uncompressedSize: 100,
          async: vi.fn().mockResolvedValue('{"name": "test"}')
        },
        'src/index.js': {
          dir: false,
          uncompressedSize: 50,
          async: vi.fn().mockResolvedValue('console.log("test");')
        }
      };

      const mockZip = {
        loadAsync: vi.fn().mockResolvedValue({
          files: mockZipContent
        })
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractAndProcessArchive(file);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.metadata?.totalFiles).toBe(2);
    });

    it('should reject unsupported archive formats', async () => {
      const file = new File([''], 'test.rar', { type: 'application/x-rar' });

      const result = await extractAndProcessArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported archive format');
    });

    it('should reject non-ZIP files even if they have ZIP extension', async () => {
      const file = new File([''], 'test.zip', { type: 'application/zip' });

      const result = await extractAndProcessArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Currently only ZIP archives are supported');
    });

    it('should handle extraction errors', async () => {
      const mockZip = {
        loadAsync: vi.fn().mockRejectedValue(new Error('Invalid ZIP'))
      };

      (JSZip as any).mockImplementation(() => mockZip);

      const file = new File(['invalid content'], 'test.zip', { type: 'application/zip' });
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await extractAndProcessArchive(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ZIP');
    });
  });
});
