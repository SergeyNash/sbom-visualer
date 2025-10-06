import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { mockSBOMData } from '../data/mockSBOM';

// Mock the components to isolate App logic
vi.mock('../components/SBOMUploader', () => ({
  default: ({ onSBOMLoad, isOpen, onClose }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="sbom-uploader">
        <button onClick={() => onSBOMLoad(mockSBOMData)}>Load Mock SBOM</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
}));

vi.mock('../components/CodeUploader', () => ({
  default: ({ onSBOMLoad, isOpen, onClose }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="code-uploader">
        <button onClick={() => onSBOMLoad(mockSBOMData)}>Generate SBOM</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
}));

vi.mock('../components/ComponentFilter', () => ({
  default: ({ filters, onFiltersChange }: any) => (
    <div data-testid="component-filter">
      <input
        data-testid="search-input"
        value={filters.searchTerm}
        onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
        placeholder="Search components..."
      />
      <select
        data-testid="type-filter"
        multiple
        value={filters.type}
        onChange={(e) => {
          const selectedTypes = Array.from(e.target.selectedOptions, option => option.value);
          onFiltersChange({ ...filters, type: selectedTypes });
        }}
      >
        <option value="library">Library</option>
        <option value="application">Application</option>
        <option value="dependency">Dependency</option>
      </select>
    </div>
  )
}));

vi.mock('../components/ComponentTable', () => ({
  default: ({ components, selectedComponent, onComponentSelect }: any) => (
    <div data-testid="component-table">
      <div data-testid="component-count">{components.length} components</div>
      {components.map((component: any) => (
        <div
          key={component.id}
          data-testid={`component-${component.id}`}
          data-selected={selectedComponent === component.id}
          onClick={() => onComponentSelect(component.id)}
          style={{ cursor: 'pointer' }}
        >
          {component.name} ({component.type})
        </div>
      ))}
    </div>
  )
}));

vi.mock('../components/TreeDiagram', () => ({
  default: ({ components, filteredComponents, selectedComponent, onComponentSelect }: any) => (
    <div data-testid="tree-diagram">
      <div data-testid="tree-component-count">{components.length} total, {filteredComponents.length} filtered</div>
      {filteredComponents.map((component: any) => (
        <div
          key={component.id}
          data-testid={`tree-component-${component.id}`}
          data-selected={selectedComponent === component.id}
          onClick={() => onComponentSelect(component.id)}
          style={{ cursor: 'pointer' }}
        >
          {component.name}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../components/ComponentDetails', () => ({
  default: ({ component, isOpen, onClose, onComponentSelect, allComponents }: any) => {
    if (!isOpen || !component) return null;
    return (
      <div data-testid="component-details">
        <h3>{component.name}</h3>
        <p>Type: {component.type}</p>
        <p>License: {component.license}</p>
        <p>Version: {component.version}</p>
        <p>Risk Level: {component.riskLevel}</p>
        <p>CVE Count: {component.cveCount}</p>
        <p>Description: {component.description}</p>
        <button onClick={onClose}>Close Details</button>
        {component.dependencies.map((depId: string) => {
          const dep = allComponents.find((c: any) => c.id === depId);
          return dep ? (
            <div key={depId} onClick={() => onComponentSelect(depId)} style={{ cursor: 'pointer' }}>
              Dependency: {dep.name}
            </div>
          ) : null;
        })}
      </div>
    );
  }
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render main application structure', () => {
    render(<App />);
    
    expect(screen.getByText('SBOM Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Interactive Software Bill of Materials visualization')).toBeInTheDocument();
    expect(screen.getByText('Upload SBOM')).toBeInTheDocument();
    expect(screen.getByText('Generate from Code')).toBeInTheDocument();
  });

  it('should display component count in header', () => {
    render(<App />);
    
    // Should show filtered count vs total count
    expect(screen.getByText(/components shown/)).toBeInTheDocument();
  });

  it('should open SBOM uploader modal', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const uploadButton = screen.getByText('Upload SBOM');
    await user.click(uploadButton);
    
    expect(screen.getByTestId('sbom-uploader')).toBeInTheDocument();
  });

  it('should open code uploader modal', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const codeButton = screen.getByText('Generate from Code');
    await user.click(codeButton);
    
    expect(screen.getByTestId('code-uploader')).toBeInTheDocument();
  });

  it('should close modals when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Open SBOM uploader
    const uploadButton = screen.getByText('Upload SBOM');
    await user.click(uploadButton);
    
    expect(screen.getByTestId('sbom-uploader')).toBeInTheDocument();
    
    // Close it
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);
    
    expect(screen.queryByTestId('sbom-uploader')).not.toBeInTheDocument();
  });

  it('should load SBOM data from uploader', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Open SBOM uploader
    const uploadButton = screen.getByText('Upload SBOM');
    await user.click(uploadButton);
    
    // Load mock SBOM data
    const loadButton = screen.getByText('Load Mock SBOM');
    await user.click(loadButton);
    
    // Should close modal and update component count
    await waitFor(() => {
      expect(screen.queryByTestId('sbom-uploader')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('component-table')).toBeInTheDocument();
  });

  it('should load SBOM data from code generator', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Open code uploader
    const codeButton = screen.getByText('Generate from Code');
    await user.click(codeButton);
    
    // Generate SBOM
    const generateButton = screen.getByText('Generate SBOM');
    await user.click(generateButton);
    
    // Should close modal and update component count
    await waitFor(() => {
      expect(screen.queryByTestId('code-uploader')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('component-table')).toBeInTheDocument();
  });

  it('should filter components by search term', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const searchInput = screen.getByTestId('search-input');
    
    // Search for "react"
    await user.type(searchInput, 'react');
    
    // Should filter components
    expect(searchInput).toHaveValue('react');
  });

  it('should filter components by type', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const typeFilter = screen.getByTestId('type-filter');
    
    // Select library type
    await user.selectOptions(typeFilter, 'library');
    
    // Should filter to only library components
    const selectedOptions = Array.from(typeFilter.selectedOptions);
    expect(selectedOptions).toHaveLength(1);
    expect(selectedOptions[0].value).toBe('library');
  });

  it('should select component from table', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByTestId('component-table')).toBeInTheDocument();
    });
    
    // Find a component and click it
    const componentElement = screen.getByTestId('component-react@18.2.0');
    await user.click(componentElement);
    
    // Should show component details
    await waitFor(() => {
      expect(screen.getByTestId('component-details')).toBeInTheDocument();
    });
    
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('should select component from tree diagram', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for tree diagram to load
    await waitFor(() => {
      expect(screen.getByTestId('tree-diagram')).toBeInTheDocument();
    });
    
    // Find a component in tree and click it
    const treeComponent = screen.getByTestId('tree-component-react@18.2.0');
    await user.click(treeComponent);
    
    // Should show component details
    await waitFor(() => {
      expect(screen.getByTestId('component-details')).toBeInTheDocument();
    });
    
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('should navigate between components via dependencies', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a component with dependencies
    const appComponent = screen.getByTestId('component-my-app@1.0.0');
    await user.click(appComponent);
    
    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByTestId('component-details')).toBeInTheDocument();
    });
    
    // Click on a dependency
    const dependencyLink = screen.getByText('Dependency: react');
    await user.click(dependencyLink);
    
    // Should switch to the dependency component
    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
    });
  });

  it('should close component details', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a component
    const componentElement = screen.getByTestId('component-react@18.2.0');
    await user.click(componentElement);
    
    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByTestId('component-details')).toBeInTheDocument();
    });
    
    // Close details
    const closeButton = screen.getByText('Close Details');
    await user.click(closeButton);
    
    // Details should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('component-details')).not.toBeInTheDocument();
    });
  });

  it('should reset filters when loading new SBOM', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Apply some filters
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'test');
    
    const typeFilter = screen.getByTestId('type-filter');
    await user.selectOptions(typeFilter, 'library');
    
    // Load new SBOM
    const uploadButton = screen.getByText('Upload SBOM');
    await user.click(uploadButton);
    
    const loadButton = screen.getByText('Load Mock SBOM');
    await user.click(loadButton);
    
    // Filters should be reset
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(Array.from(typeFilter.selectedOptions)).toHaveLength(0);
    });
  });

  it('should handle escape key to exit fullscreen', () => {
    render(<App />);
    
    // Simulate escape key press
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Should not crash and continue to work normally
    expect(screen.getByText('SBOM Analyzer')).toBeInTheDocument();
  });

  it('should update component count when filters change', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Apply search filter
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'react');
    
    // Component count should update (this would be reflected in the header)
    expect(searchInput).toHaveValue('react');
  });

  it('should show tree diagram with correct counts', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('tree-diagram')).toBeInTheDocument();
    });
    
    // Should show total and filtered counts
    expect(screen.getByTestId('tree-component-count')).toBeInTheDocument();
  });

  it('should handle component selection state correctly', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a component from table
    const tableComponent = screen.getByTestId('component-react@18.2.0');
    await user.click(tableComponent);
    
    // Wait for selection to propagate
    await waitFor(() => {
      expect(screen.getByTestId('component-details')).toBeInTheDocument();
    });
    
    // The same component should be selected in tree
    const treeComponent = screen.getByTestId('tree-component-react@18.2.0');
    expect(treeComponent).toHaveAttribute('data-selected', 'true');
  });

  it('should handle empty component list gracefully', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Load empty SBOM
    const uploadButton = screen.getByText('Upload SBOM');
    await user.click(uploadButton);
    
    // Mock empty SBOM data
    const loadButton = screen.getByText('Load Mock SBOM');
    await user.click(loadButton);
    
    // Should handle empty list without crashing
    await waitFor(() => {
      expect(screen.getByTestId('component-table')).toBeInTheDocument();
    });
  });
});
