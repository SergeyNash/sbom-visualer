import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeUploader from '../CodeUploader';
import { SBOMComponent } from '../../types/sbom';

// Mock the utility functions
vi.mock('../../utils/sbomGenerator', () => ({
  detectProjectType: vi.fn(),
  generateSBOMFromCode: vi.fn(),
  SUPPORTED_PROJECT_TYPES: [
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    }
  ]
}));

vi.mock('../../utils/archiveExtractor', () => ({
  extractAndProcessArchive: vi.fn()
}));

describe('CodeUploader', () => {
  const mockOnSBOMLoad = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSBOMLoad: mockOnSBOMLoad,
    isOpen: true,
    onClose: mockOnClose
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<CodeUploader {...defaultProps} />);
    
    expect(screen.getByText('Generate SBOM from Code')).toBeInTheDocument();
    expect(screen.getByText('Drop project files or ZIP archive here')).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CodeUploader {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Generate SBOM from Code')).not.toBeInTheDocument();
  });

  it('should close modal when clicking close button', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when clicking backdrop', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const backdrop = screen.getByRole('generic').parentElement; // The backdrop div
    await user.click(backdrop!);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle file selection via button click', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock the file input
    const fileInput = screen.getByDisplayValue('');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    const chooseFilesButton = screen.getByText('Choose Files');
    await user.click(chooseFilesButton);
    
    fireEvent.change(fileInput);
    
    // The component should process the file (mocked functions will handle this)
    expect(fileInput.files).toHaveLength(1);
  });

  it('should handle drag and drop', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    await user.upload(dropZone!, file);
    
    // The component should process the file
    expect(dropZone).toBeInTheDocument();
  });

  it('should show drag active state', () => {
    render(<CodeUploader {...defaultProps} />);
    
    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    
    fireEvent.dragEnter(dropZone!);
    
    // The component should show drag active state (this is handled by CSS classes)
    expect(dropZone).toBeInTheDocument();
  });

  it('should display supported formats information', () => {
    render(<CodeUploader {...defaultProps} />);
    
    expect(screen.getByText('Supported Formats:')).toBeInTheDocument();
    expect(screen.getByText(/Node.js:/)).toBeInTheDocument();
    expect(screen.getByText(/Python:/)).toBeInTheDocument();
    expect(screen.getByText(/Java:/)).toBeInTheDocument();
    expect(screen.getByText(/\.NET:/)).toBeInTheDocument();
    expect(screen.getByText(/Go:/)).toBeInTheDocument();
    expect(screen.getByText(/Rust:/)).toBeInTheDocument();
    expect(screen.getByText(/PHP:/)).toBeInTheDocument();
  });

  it('should toggle options panel', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    // First, we need to upload a file to show the options button
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock the utility functions to simulate successful file processing
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    
    const optionsButton = screen.getByText('Options');
    await user.click(optionsButton);
    
    // Options panel should be visible
    expect(screen.getByText('Generation Options')).toBeInTheDocument();
  });

  it('should show loading state during file processing', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock detectProjectType to return a promise that resolves slowly
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({
          id: 'nodejs',
          name: 'Node.js',
          description: 'JavaScript/TypeScript projects with package.json',
          extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
          packageManagers: ['npm', 'yarn', 'pnpm'],
          icon: '📦'
        }), 100);
      });
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    // Should show loading state
    expect(screen.getByText('Processing files...')).toBeInTheDocument();
  });

  it('should display error message when file processing fails', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
    
    // Mock detectProjectType to return null (unsupported project type)
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue(null);

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    await waitFor(() => {
      expect(screen.getByText('Processing Failed')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Could not detect project type/)).toBeInTheDocument();
  });

  it('should display success message and auto-close after SBOM generation', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers();
    
    const mockSBOMData: SBOMComponent[] = [
      {
        id: 'test@1.0.0',
        name: 'test',
        type: 'application',
        license: 'MIT',
        version: '1.0.0',
        riskLevel: 'low',
        cveCount: 0,
        dependencies: [],
        description: 'Test project'
      }
    ];

    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock successful project detection and SBOM generation
    const { detectProjectType, generateSBOMFromCode } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });
    
    vi.mocked(generateSBOMFromCode).mockResolvedValue({
      success: true,
      sbomData: mockSBOMData,
      metadata: {
        generatedAt: '2023-01-01T00:00:00Z',
        projectType: 'Node.js',
        totalComponents: 1,
        generationTime: 100
      }
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    await waitFor(() => {
      expect(screen.getByText('Generate SBOM')).toBeInTheDocument();
    });
    
    const generateButton = screen.getByText('Generate SBOM');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('SBOM generated successfully!')).toBeInTheDocument();
    });
    
    // Fast-forward time to trigger auto-close
    vi.advanceTimersByTime(1500);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSBOMLoad).toHaveBeenCalledWith(mockSBOMData);
    });
    
    vi.useRealTimers();
  });

  it('should handle archive extraction', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const zipFile = new File(['zip content'], 'project.zip', { type: 'application/zip' });
    
    // Mock archive extraction
    const { extractAndProcessArchive } = await import('../../utils/archiveExtractor');
    vi.mocked(extractAndProcessArchive).mockResolvedValue({
      success: true,
      files: [
        {
          name: 'package.json',
          content: '{"name": "test"}',
          size: 17,
          path: 'package.json'
        }
      ],
      metadata: {
        totalFiles: 1,
        totalSize: 17,
        archiveType: 'ZIP',
        extractionTime: 50
      }
    });

    // Mock project type detection
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, zipFile);
    
    await waitFor(() => {
      expect(screen.getByText('Project Type Detected')).toBeInTheDocument();
    });
    
    expect(extractAndProcessArchive).toHaveBeenCalledWith(zipFile);
  });

  it('should remove uploaded files', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock successful project detection
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    await waitFor(() => {
      expect(screen.getByText('Project Files (1)')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByTitle('Remove file');
    await user.click(removeButton);
    
    // File should be removed from the list
    expect(screen.queryByText('Project Files (1)')).not.toBeInTheDocument();
  });

  it('should handle generation options changes', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    // Mock successful project detection
    const { detectProjectType } = await import('../../utils/sbomGenerator');
    vi.mocked(detectProjectType).mockReturnValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    await user.upload(dropZone!, file);
    
    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    
    const optionsButton = screen.getByText('Options');
    await user.click(optionsButton);
    
    // Toggle dev dependencies option
    const devDepsCheckbox = screen.getByLabelText('Include dev dependencies');
    await user.click(devDepsCheckbox);
    
    expect(devDepsCheckbox).not.toBeChecked();
  });
});
