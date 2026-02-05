import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeUploader from '../CodeUploader';
import { SBOMComponent } from '../../types/sbom';

const opsMock = {
  isSupportedArchive: vi.fn(),
  detectProjectType: vi.fn(),
  generateFromCode: vi.fn(),
  generateFromArchive: vi.fn(),
};

vi.mock('../../services/sbomOperations', () => ({
  createSbomOperations: () => opsMock,
}));

describe('CodeUploader', () => {
  const mockOnSBOMLoad = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnDataModeChange = vi.fn();

  const defaultProps = {
    onSBOMLoad: mockOnSBOMLoad,
    isOpen: true,
    onClose: mockOnClose,
    dataMode: 'auto' as any,
    onDataModeChange: mockOnDataModeChange,
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
    
    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle file selection via file input', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });

    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js'],
      packageManagers: ['npm'],
      icon: '📦',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    await user.upload(fileInput!, file);

    await waitFor(() => {
      expect(screen.getByText('Project Files (1)')).toBeInTheDocument();
    });
  });

  it('should show detected project type when available', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });

    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js'],
      packageManagers: ['npm'],
      icon: '📦',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);

    await waitFor(() => {
      expect(screen.getByText('Project Type Detected')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
  });

  it('should show drag active state', () => {
    render(<CodeUploader {...defaultProps} />);

    const dropZone = screen.getByText('Drop project files or ZIP archive here').closest('div');
    fireEvent.dragEnter(dropZone!);
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
    
    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
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
    vi.useFakeTimers();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    opsMock.isSupportedArchive.mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve(false), 100));
    });
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js'],
      packageManagers: ['npm'],
      icon: '📦',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
    // Should show loading state
    expect(screen.getByText('Processing files...')).toBeInTheDocument();

    vi.advanceTimersByTime(120);
    vi.useRealTimers();
  });

  it('should display error message when file processing fails', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
    
    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue(null);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
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
    
    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });
    
    opsMock.generateFromCode.mockResolvedValue({
      success: true,
      sbomData: mockSBOMData,
      metadata: {
        generatedAt: '2023-01-01T00:00:00Z',
        projectType: 'Node.js',
        totalComponents: 1,
        generationTime: 100
      }
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
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

  it('should treat supported archive as archive workflow', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const zipFile = new File(['zip content'], 'project.zip', { type: 'application/zip' });
    
    opsMock.isSupportedArchive.mockResolvedValue(true);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, zipFile);

    await waitFor(() => {
      expect(screen.getByText('Project Files (1)')).toBeInTheDocument();
      expect(screen.getByText('Generate SBOM')).toBeInTheDocument();
    });
    expect(opsMock.detectProjectType).not.toHaveBeenCalled();
  });

  it('should remove uploaded files', async () => {
    const user = userEvent.setup();
    render(<CodeUploader {...defaultProps} />);
    
    const file = new File(['{"name": "test"}'], 'package.json', { type: 'application/json' });
    
    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
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
    
    opsMock.isSupportedArchive.mockResolvedValue(false);
    opsMock.detectProjectType.mockResolvedValue({
      id: 'nodejs',
      name: 'Node.js',
      description: 'JavaScript/TypeScript projects with package.json',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      packageManagers: ['npm', 'yarn', 'pnpm'],
      icon: '📦'
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    await user.upload(fileInput!, file);
    
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
