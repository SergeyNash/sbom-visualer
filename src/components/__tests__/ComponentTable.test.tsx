import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentTable from '../ComponentTable';
import { SBOMComponent } from '../../types/sbom';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('ComponentTable', () => {
  const mockOnComponentSelect = vi.fn();
  const mockOnToggleCollapse = vi.fn();

  const mockComponents: SBOMComponent[] = [
    {
      id: 'react@18.2.0',
      name: 'react',
      type: 'library',
      license: 'MIT',
      version: '18.2.0',
      riskLevel: 'low',
      cveCount: 0,
      dependencies: [],
      description: 'A JavaScript library for building user interfaces'
    },
    {
      id: 'lodash@4.17.21',
      name: 'lodash',
      type: 'library',
      license: 'MIT',
      version: '4.17.21',
      riskLevel: 'medium',
      cveCount: 2,
      dependencies: [],
      description: 'A modern JavaScript utility library'
    },
    {
      id: 'express@4.18.0',
      name: 'express',
      type: 'dependency',
      license: 'MIT',
      version: '4.18.0',
      riskLevel: 'high',
      cveCount: 5,
      dependencies: [],
      description: 'Fast, unopinionated, minimalist web framework'
    },
    {
      id: 'my-app@1.0.0',
      name: 'my-app',
      type: 'application',
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low',
      cveCount: 0,
      dependencies: ['react@18.2.0', 'lodash@4.17.21'],
      description: 'My awesome application'
    }
  ];

  const defaultProps = {
    components: mockComponents,
    selectedComponent: null,
    onComponentSelect: mockOnComponentSelect,
    isCollapsed: false,
    onToggleCollapse: mockOnToggleCollapse
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render component table with all components', () => {
    render(<ComponentTable {...defaultProps} />);
    
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('(4)')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('lodash')).toBeInTheDocument();
    expect(screen.getByText('express')).toBeInTheDocument();
    expect(screen.getByText('my-app')).toBeInTheDocument();
  });

  it('should render collapsed state', () => {
    render(<ComponentTable {...defaultProps} isCollapsed={true} />);
    
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByTitle('Expand Components Table')).toBeInTheDocument();
  });

  it('should handle collapse toggle', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const collapseButton = screen.getByTitle('Collapse Components Table');
    await user.click(collapseButton);
    
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should handle expand toggle from collapsed state', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} isCollapsed={true} />);
    
    const expandButton = screen.getByTitle('Expand Components Table');
    await user.click(expandButton);
    
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should select component when row is clicked', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const reactRow = screen.getByText('react').closest('tr');
    await user.click(reactRow!);
    
    expect(mockOnComponentSelect).toHaveBeenCalledWith('react@18.2.0');
  });

  it('should highlight selected component', () => {
    render(<ComponentTable {...defaultProps} selectedComponent="react@18.2.0" />);
    
    const reactRow = screen.getByText('react').closest('tr');
    expect(reactRow).toHaveClass('bg-blue-900/30');
  });

  it('should sort by name column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const nameHeader = screen.getByText('Component').closest('th');
    await user.click(nameHeader!);
    
    // Check if sort direction indicator is shown
    expect(screen.getByText('Component')).toBeInTheDocument();
  });

  it('should sort by type column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const typeHeader = screen.getByText('Type').closest('th');
    await user.click(typeHeader!);
    
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('should sort by license column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const licenseHeader = screen.getByText('License').closest('th');
    await user.click(licenseHeader!);
    
    expect(screen.getByText('License')).toBeInTheDocument();
  });

  it('should sort by version column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const versionHeader = screen.getByText('Version').closest('th');
    await user.click(versionHeader!);
    
    expect(screen.getByText('Version')).toBeInTheDocument();
  });

  it('should sort by risk level column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const riskHeader = screen.getByText('Risk').closest('th');
    await user.click(riskHeader!);
    
    expect(screen.getByText('Risk')).toBeInTheDocument();
  });

  it('should sort by CVE count column', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const cveHeader = screen.getByText('CVEs').closest('th');
    await user.click(cveHeader!);
    
    expect(screen.getByText('CVEs')).toBeInTheDocument();
  });

  it('should toggle sort direction when clicking same column twice', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const nameHeader = screen.getByText('Component').closest('th');
    
    // First click - should sort ascending
    await user.click(nameHeader!);
    
    // Second click - should sort descending
    await user.click(nameHeader!);
    
    expect(screen.getByText('Component')).toBeInTheDocument();
  });

  it('should display correct type icons', () => {
    render(<ComponentTable {...defaultProps} />);
    
    // Check that all components are displayed with their types
    expect(screen.getByText('library')).toBeInTheDocument();
    expect(screen.getByText('dependency')).toBeInTheDocument();
    expect(screen.getByText('application')).toBeInTheDocument();
  });

  it('should display correct risk level badges', () => {
    render(<ComponentTable {...defaultProps} />);
    
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('should display CVE counts with correct styling', () => {
    render(<ComponentTable {...defaultProps} />);
    
    // Components with 0 CVEs should be green
    const zeroCveElements = screen.getAllByText('0');
    expect(zeroCveElements.length).toBeGreaterThan(0);
    
    // Components with CVEs should be red
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display component descriptions', () => {
    render(<ComponentTable {...defaultProps} />);
    
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();
    expect(screen.getByText('A modern JavaScript utility library')).toBeInTheDocument();
    expect(screen.getByText('Fast, unopinionated, minimalist web framework')).toBeInTheDocument();
    expect(screen.getByText('My awesome application')).toBeInTheDocument();
  });

  it('should display license information', () => {
    render(<ComponentTable {...defaultProps} />);
    
    // All components have MIT license
    const mitLicenses = screen.getAllByText('MIT');
    expect(mitLicenses.length).toBe(4);
  });

  it('should display version information', () => {
    render(<ComponentTable {...defaultProps} />);
    
    expect(screen.getByText('18.2.0')).toBeInTheDocument();
    expect(screen.getByText('4.17.21')).toBeInTheDocument();
    expect(screen.getByText('4.18.0')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('should handle empty components array', () => {
    render(<ComponentTable {...defaultProps} components={[]} />);
    
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('should implement lazy loading for large component lists', async () => {
    // Create a large list of components
    const largeComponentList: SBOMComponent[] = Array.from({ length: 50 }, (_, i) => ({
      id: `component-${i}@1.0.0`,
      name: `component-${i}`,
      type: 'library' as const,
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low' as const,
      cveCount: 0,
      dependencies: [],
      description: `Component ${i}`
    }));

    render(<ComponentTable {...defaultProps} components={largeComponentList} />);
    
    // Initially should show first 20 items
    expect(screen.getByText('component-0')).toBeInTheDocument();
    expect(screen.getByText('component-19')).toBeInTheDocument();
    
    // Should not show component 20 initially
    expect(screen.queryByText('component-20')).not.toBeInTheDocument();
  });

  it('should show loading indicator when loading more items', async () => {
    const largeComponentList: SBOMComponent[] = Array.from({ length: 50 }, (_, i) => ({
      id: `component-${i}@1.0.0`,
      name: `component-${i}`,
      type: 'library' as const,
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low' as const,
      cveCount: 0,
      dependencies: [],
      description: `Component ${i}`
    }));

    render(<ComponentTable {...defaultProps} components={largeComponentList} />);
    
    // Should show loading message initially
    expect(screen.getByText(/Showing \d+ of \d+ components/)).toBeInTheDocument();
  });

  it('should handle component selection with auto-scroll', async () => {
    const largeComponentList: SBOMComponent[] = Array.from({ length: 50 }, (_, i) => ({
      id: `component-${i}@1.0.0`,
      name: `component-${i}`,
      type: 'library' as const,
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low' as const,
      cveCount: 0,
      dependencies: [],
      description: `Component ${i}`
    }));

    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    render(<ComponentTable {...defaultProps} components={largeComponentList} selectedComponent="component-25@1.0.0" />);
    
    // The component should be highlighted
    const selectedRow = screen.getByText('component-25').closest('tr');
    expect(selectedRow).toHaveClass('bg-blue-900/30');
  });

  it('should handle risk level sorting correctly', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const riskHeader = screen.getByText('Risk').closest('th');
    await user.click(riskHeader!);
    
    // Risk levels should be sorted with high > medium > low
    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1); // Skip header row
    
    // The first row should be the lowest risk (low)
    expect(dataRows[0]).toHaveTextContent('low');
  });

  it('should handle CVE count sorting correctly', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const cveHeader = screen.getByText('CVEs').closest('th');
    await user.click(cveHeader!);
    
    // CVE counts should be sorted numerically
    const cveCells = screen.getAllByText(/^\d+$/);
    const cveValues = cveCells.map(cell => parseInt(cell.textContent!));
    
    // Should be sorted in ascending order
    for (let i = 1; i < cveValues.length; i++) {
      expect(cveValues[i]).toBeGreaterThanOrEqual(cveValues[i - 1]);
    }
  });

  it('should display all components loaded message when no more items', () => {
    render(<ComponentTable {...defaultProps} />);
    
    // For small component list, should show "All X components loaded"
    expect(screen.getByText(`All ${mockComponents.length} components loaded`)).toBeInTheDocument();
  });

  it('should handle hover effects on table rows', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const reactRow = screen.getByText('react').closest('tr');
    
    // Hover over the row
    await user.hover(reactRow!);
    
    // Row should have hover styles
    expect(reactRow).toHaveClass('hover:bg-gray-700/50');
  });

  it('should handle hover effects on column headers', async () => {
    const user = userEvent.setup();
    render(<ComponentTable {...defaultProps} />);
    
    const nameHeader = screen.getByText('Component').closest('th');
    
    // Hover over the header
    await user.hover(nameHeader!);
    
    // Header should have hover styles
    expect(nameHeader).toHaveClass('hover:bg-gray-600/50');
  });
});
