import React, { useMemo, useState } from 'react';
import { SBOMComponent } from '../types/sbom';
import { ZoomIn, ZoomOut, RotateCcw, GitBranch, ChevronLeft, ChevronRight, Maximize2, Minimize2, Grid3X3 } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  type: SBOMComponent['type'];
  riskLevel: SBOMComponent['riskLevel'];
  x: number;
  y: number;
  level: number;
  children: TreeNode[];
  parent?: TreeNode;
}

interface TreeEdge {
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface TreeDiagramProps {
  components: SBOMComponent[];
  filteredComponents: SBOMComponent[];
  selectedComponent: string | null;
  onComponentSelect: (componentId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isMatrixMode?: boolean;
  onToggleMatrixMode?: () => void;
}

const TreeDiagram: React.FC<TreeDiagramProps> = ({
  components,
  filteredComponents,
  selectedComponent,
  onComponentSelect,
  isCollapsed,
  onToggleCollapse,
  isFullscreen = false,
  onToggleFullscreen,
  isMatrixMode = false,
  onToggleMatrixMode
}) => {
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [autoFocused, setAutoFocused] = useState(false);

  // Find root components separately
  const rootComponents = useMemo(() => {
    if (!components || components.length === 0) {
      return [];
    }

    // Find all root components (components that are not dependencies of others)
    const allDependencyIds = new Set();
    
    // Collect all dependency IDs
    components.forEach(component => {
      component.dependencies.forEach(depId => {
        allDependencyIds.add(depId);
      });
    });
    
    // Find root components (not dependencies of others)
    const rootComponents = components.filter(component => !allDependencyIds.has(component.id));
    
    // If no root components found, use applications or first component
    if (rootComponents.length === 0) {
      const applications = components.filter(c => c.type === 'application');
      return applications.length > 0 ? applications : [components[0]];
    }
    
    return rootComponents;
  }, [components]);

  const { nodes, edges, treeWidth, treeHeight, allTrees } = useMemo(() => {
    if (!components || components.length === 0) {
      return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0, allTrees: [] };
    }

    // Check if we should use matrix mode (no dependencies or matrix mode enabled)
    const hasDependencies = components.some(c => c.dependencies.length > 0);
    const shouldUseMatrixMode = isMatrixMode || (!hasDependencies && components.length > 0);

    if (shouldUseMatrixMode) {
      // Matrix mode: arrange all components in a grid
      const nodeWidth = 180;
      const nodeHeight = 80;
      const gapX = 20;
      const gapY = 20;
      const cols = Math.ceil(Math.sqrt(components.length));
      
      const matrixNodes: TreeNode[] = components.map((component, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        return {
          id: component.id,
          name: component.name,
          type: component.type,
          riskLevel: component.riskLevel,
          x: 100 + col * (nodeWidth + gapX),
          y: 100 + row * (nodeHeight + gapY),
          level: 0,
          children: []
        };
      });

      const maxX = Math.max(...matrixNodes.map(n => n.x)) + nodeWidth + 100;
      const maxY = Math.max(...matrixNodes.map(n => n.y)) + nodeHeight + 100;

      return {
        nodes: matrixNodes,
        edges: [], // No edges in matrix mode
        treeWidth: maxX,
        treeHeight: maxY,
        allTrees: [] // No trees in matrix mode
      };
    }

    // Tree mode: original logic
    if (rootComponents.length === 0) {
      return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0, allTrees: [] };
    }

    // Create component map for quick lookup (all components)
    const componentMap = new Map(components.map(c => [c.id, c]));
    
    // Build tree structure - show all dependencies but highlight filtered components
    const buildTree = (componentId: string, level: number = 0, visited = new Set<string>()): TreeNode | null => {
      if (visited.has(componentId)) return null; // Prevent cycles
      visited.add(componentId);
      
      const component = componentMap.get(componentId);
      if (!component) return null;

      const node: TreeNode = {
        id: component.id,
        name: component.name,
        type: component.type,
        riskLevel: component.riskLevel,
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        level,
        children: []
      };

      // Add children (dependencies) - show ALL dependencies, not just filtered ones
      component.dependencies.forEach(depId => {
        const childNode = buildTree(depId, level + 1, new Set(visited));
        if (childNode) {
          childNode.parent = node;
          node.children.push(childNode);
        }
      });

      return node;
    };

    // Build multiple trees if there are multiple root components
    const allTrees: TreeNode[] = [];
    
    // First, build all trees without positioning
    const unpositionedTrees: TreeNode[] = [];
    rootComponents.forEach((rootComponent) => {
      const rootNode = buildTree(rootComponent.id);
      if (rootNode) {
        unpositionedTrees.push(rootNode);
      }
    });
    
    // New layout: each tree positioned vertically below the previous one
    const levelGap = 250; // Horizontal gap between dependency levels
    const treeVerticalGap = 100; // Vertical gap between trees
    const nodeHeight = 80;
    const siblingGap = 20;
    
    let currentTreeY = 100; // Starting Y position for first tree
    
    unpositionedTrees.forEach((rootNode) => {
      // Calculate the maximum depth of this tree
      const calculateMaxDepth = (node: TreeNode): number => {
        if (node.children.length === 0) return 0;
        return 1 + Math.max(...node.children.map(calculateMaxDepth));
      };
      
      // Calculate max depth for this tree (not used in current implementation)
      // const maxDepth = calculateMaxDepth(rootNode);
      
      // Position nodes in this tree using level-based layout
      const positionTreeNodes = (node: TreeNode, level: number = 0, startY: number = 0): number => {
        // Set X position based on level
        node.x = 100 + level * levelGap;
        
        if (node.children.length === 0) {
          // Leaf node
          node.y = startY + nodeHeight / 2;
          return startY + nodeHeight + siblingGap;
        }
        
        // Position children first
        let currentY = startY;
        const childPositions: number[] = [];
        
        node.children.forEach(child => {
          const childStartY = currentY;
          currentY = positionTreeNodes(child, level + 1, currentY);
          childPositions.push(childStartY + nodeHeight / 2);
        });
        
        // Center parent node among its children
        const firstChildY = childPositions[0];
        const lastChildY = childPositions[childPositions.length - 1];
        node.y = (firstChildY + lastChildY) / 2;
        
        return currentY;
      };
      
      // Position this tree starting at currentTreeY
      const treeHeight = positionTreeNodes(rootNode, 0, currentTreeY);
      
      // Move to next tree position
      currentTreeY += treeHeight + treeVerticalGap;
      
      allTrees.push(rootNode);
    });
    
    if (allTrees.length === 0) return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0, allTrees: [] };

    // Collect all nodes from all trees
    const allNodes: TreeNode[] = [];
    const collectNodes = (node: TreeNode) => {
      allNodes.push(node);
      node.children.forEach(collectNodes);
    };
    allTrees.forEach(collectNodes);

    // Create edges for all trees
    const allEdges: TreeEdge[] = [];
    allNodes.forEach(node => {
      node.children.forEach(child => {
        allEdges.push({
          source: node.id,
          target: child.id,
          sourceX: node.x + nodeWidth,
          sourceY: node.y,
          targetX: child.x,
          targetY: child.y
        });
      });
    });

    // Calculate tree dimensions
    const nodeWidth = 180;
    const maxX = Math.max(...allNodes.map(n => n.x)) + nodeWidth + 100;
    const maxY = Math.max(...allNodes.map(n => n.y)) + nodeHeight + 100;

    return { 
      nodes: allNodes, 
      edges: allEdges, 
      treeWidth: maxX, 
      treeHeight: maxY,
      allTrees: allTrees
    };
  }, [components, filteredComponents, rootComponents, isMatrixMode]);

  // Auto-focus on selected component
  React.useEffect(() => {
    if (selectedComponent && nodes.length > 0 && !autoFocused) {
      const selectedNode = nodes.find(node => node.id === selectedComponent);
      if (selectedNode) {
        // Calculate center position for the selected node
        const centerX = selectedNode.x + 90; // Half of node width
        const centerY = selectedNode.y;
        
        // Calculate pan offset to center the node
        const newPanX = Math.max(0, 300 - centerX * zoom);
        const newPanY = Math.max(0, 300 - centerY * zoom);
        
        setPan({ x: newPanX, y: newPanY });
        setAutoFocused(true);
      }
    }
  }, [selectedComponent, nodes, zoom, autoFocused]);

  // Reset auto-focus when selectedComponent changes
  React.useEffect(() => {
    setAutoFocused(false);
  }, [selectedComponent]);

  const getNodeColor = (node: TreeNode) => {
    const isFiltered = filteredComponents.some(c => c.id === node.id);
    const opacity = isFiltered ? 1 : 0.6;
    
    if (node.type === 'application') return `rgba(16, 185, 129, ${opacity})`; // green
    if (node.type === 'library') return `rgba(59, 130, 246, ${opacity})`; // blue
    return `rgba(249, 115, 22, ${opacity})`; // orange for dependency
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
  const handleReset = () => {
    setZoom(0.8);
    setPan({ x: 50, y: 50 });
  };

  // Show empty state when no components are available
  if (!components || components.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden h-full">
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          title={isCollapsed ? "Expand Tree" : "Collapse Tree"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-gray-300" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-300" />
          )}
        </button>

        {isCollapsed ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <GitBranch className="w-6 h-6 text-blue-400 mb-2" />
            <div className="writing-mode-vertical text-sm text-gray-400 transform rotate-90">
              Tree
            </div>
          </div>
        ) : (
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-100">Dependency Tree</h2>
          </div>
        </div>
        )}

        <div className="relative w-full h-[600px] bg-gray-900 flex items-center justify-center">
          {!isCollapsed && (
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-2">No components to display</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters or check your data source</p>
          </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden h-full">
      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute top-1 right-1 z-10 p-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title={isCollapsed ? "Expand Tree" : "Collapse Tree"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-2.5 h-2.5 text-gray-300" />
        ) : (
          <ChevronRight className="w-2.5 h-2.5 text-gray-300" />
        )}
      </button>

      {isCollapsed ? (
        <div className="h-full flex flex-col items-center justify-center px-1">
          <div className="mb-3">
            <GitBranch className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-[9px] text-gray-400 transform rotate-90 whitespace-nowrap leading-none">
            Dependency Tree
          </div>
        </div>
      ) : (
        <>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-100">
            {isMatrixMode ? 'Component Matrix' : 'Dependency Tree'}
          </h2>
          <span className="text-sm text-gray-400">
            ({nodes.length} nodes{edges.length > 0 ? `, ${edges.length} edges` : ''}{!isMatrixMode && rootComponents.length > 0 ? `, ${rootComponents.length} root${rootComponents.length !== 1 ? 's' : ''}` : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-300" />
          </button>
          <span className="text-sm text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            title="Reset View & Positions"
          >
            <RotateCcw className="w-4 h-4 text-gray-300" />
          </button>
          {onToggleMatrixMode && (
            <button
              onClick={onToggleMatrixMode}
              className={`p-2 rounded-md transition-colors ${
                isMatrixMode 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isMatrixMode ? "Switch to Tree View" : "Switch to Matrix View"}
            >
              <Grid3X3 className="w-4 h-4 text-gray-300" />
            </button>
          )}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-300" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className={`relative w-full bg-gray-900 overflow-auto ${isFullscreen ? 'h-[calc(100vh-160px)]' : 'h-full'}`}>
        <svg 
          width={treeWidth * zoom}
          height={treeHeight * zoom}
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          <defs>
            {/* Arrow markers */}
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="9"
              refY="3"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#6B7280" />
            </marker>
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="9"
              refY="3"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#3B82F6" />
            </marker>
            <marker
              id="arrow-hover"
              viewBox="0 0 10 10"
              refX="9"
              refY="3"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
            </marker>

          </defs>

          <rect width="100%" height="100%" fill="#111827" />

          {/* Level indicators */}
          {allTrees && allTrees.length > 0 && (
            <g transform={`scale(${zoom})`}>
              {/* Calculate max depth across all trees */}
              {(() => {
                const calculateMaxDepth = (node: TreeNode): number => {
                  if (node.children.length === 0) return 0;
                  return 1 + Math.max(...node.children.map(calculateMaxDepth));
                };
                
                const maxDepth = allTrees.length > 0 ? Math.max(...allTrees.map(calculateMaxDepth)) : 0;
                const levelGap = 250;
                
                return Array.from({ length: maxDepth + 1 }, (_, level) => {
                  const x = 100 + level * levelGap;
                  const levelName = level === 0 ? 'Component level' : `Dependency level ${level}`;
                  
                  return (
                    <g key={`level-${level}`}>
                      {/* Level separator line */}
                      <line
                        x1={x - 50}
                        y1={50}
                        x2={x - 50}
                        y2={nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + 100 : 200}
                        stroke="#374151"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                        opacity={0.4}
                      />
                      {/* Level label */}
                      <rect
                        x={x - 100}
                        y={20}
                        width={200}
                        height={25}
                        rx={12}
                        fill="#1F2937"
                        stroke="#374151"
                        strokeWidth={1}
                        opacity={0.8}
                      />
                      <text
                        x={x}
                        y={37}
                        textAnchor="middle"
                        className="fill-gray-300 text-xs font-medium"
                        style={{ fontSize: '10px' }}
                      >
                        {levelName}
                      </text>
                    </g>
                  );
                });
              })()}
            </g>
          )}

          {/* Tree separation lines */}
          {allTrees && allTrees.length > 1 && (
            <g transform={`scale(${zoom})`}>
              {allTrees.slice(0, -1).map((_, index) => {
                // Helper function to calculate tree bounds
                const calculateTreeBounds = (node: TreeNode): { minX: number, maxX: number, minY: number, maxY: number } => {
                  let minX = node.x || 0;
                  let maxX = node.x || 0;
                  let minY = node.y || 0;
                  let maxY = node.y || 0;
                  
                  const traverse = (n: TreeNode) => {
                    minX = Math.min(minX, n.x || 0);
                    maxX = Math.max(maxX, n.x || 0);
                    minY = Math.min(minY, n.y || 0);
                    maxY = Math.max(maxY, n.y || 0);
                    n.children.forEach(traverse);
                  };
                  
                  traverse(node);
                  return { minX, maxX, minY, maxY };
                };
                
                // Calculate separation line position
                const treeBounds = allTrees.slice(0, index + 1).reduce((acc, tree) => {
                  const bounds = calculateTreeBounds(tree);
                  return {
                    maxX: Math.max(acc.maxX, bounds.maxX + 180),
                    maxY: Math.max(acc.maxY, bounds.maxY + 80)
                  };
                }, { maxX: 0, maxY: 0 });
                
                const lineX = treeBounds.maxX + 25; // Position between trees
                
                return (
                  <line
                    key={`separator-${index}`}
                    x1={lineX}
                    y1={50}
                    x2={lineX}
                    y2={treeBounds.maxY + 100}
                    stroke="#374151"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.6}
                  />
                );
              })}
            </g>
          )}

          {/* Tree labels */}
          {allTrees && allTrees.length > 1 && (
            <g transform={`scale(${zoom})`}>
              {allTrees.map((tree, index) => {
                const rootNode = tree;
                const labelX = 50; // Left side of the diagram
                const labelY = rootNode.y; // Same Y as root node
                
                return (
                  <g key={`tree-label-${index}`}>
                    {/* Background for label */}
                    <rect
                      x={labelX - 45}
                      y={labelY - 10}
                      width={90}
                      height={20}
                      rx={10}
                      fill="#1F2937"
                      stroke="#374151"
                      strokeWidth={1}
                      opacity={0.9}
                    />
                    {/* Label text */}
                    <text
                      x={labelX}
                      y={labelY + 3}
                      textAnchor="middle"
                      className="fill-gray-300 text-xs font-medium"
                      style={{ fontSize: '10px' }}
                    >
                      Tree {index + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Edges */}
          <g transform={`scale(${zoom})`}>
            {edges.map((edge, index) => {
              const isSelected = selectedComponent === edge.source || selectedComponent === edge.target;
              const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
              const strokeColor = isSelected ? '#3B82F6' : isHovered ? '#10B981' : '#6B7280';
              const markerEnd = isSelected ? 'url(#arrow-selected)' : isHovered ? 'url(#arrow-hover)' : 'url(#arrow-default)';
              
              // Use original edge coordinates
              const sourceX = edge.sourceX;
              const sourceY = edge.sourceY;
              const targetX = edge.targetX;
              const targetY = edge.targetY;
              
              // Create curved path for better tree visualization
              const midX = (sourceX + targetX) / 2;
              const pathData = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  stroke={strokeColor}
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  fill="none"
                  markerEnd={markerEnd}
                  opacity={isSelected || isHovered ? 0.8 : 0.5}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedComponent === node.id;
              const isHovered = hoveredNode === node.id;
              const isFiltered = filteredComponents.some(c => c.id === node.id);
              const nodeColor = getNodeColor(node);
              const riskColor = getRiskColor(node.riskLevel);
              const scale = isSelected ? 1.05 : isHovered ? 1.02 : 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y - 30}) scale(${scale})`}
                  className="cursor-pointer transition-all duration-300"
                  onClick={() => onComponentSelect(node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Node background */}
                  <rect
                    width="170"
                    height="60"
                    rx="8"
                    fill={nodeColor}
                    stroke={isSelected ? '#60A5FA' : riskColor}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isFiltered ? 0.9 : 0.5}
                    strokeDasharray={!isFiltered ? "5,5" : "none"}
                  />
                  
                  {/* Risk indicator */}
                  <circle
                    r="6"
                    cx="155"
                    cy="10"
                    fill={riskColor}
                    stroke="#1F2937"
                    strokeWidth={1}
                  />

                  {/* Node text */}
                  <text
                    x="85"
                    y="25"
                    textAnchor="middle"
                    className="fill-white text-sm font-semibold"
                    style={{ fontSize: '13px', opacity: isFiltered ? 1 : 0.7 }}
                  >
                    {node.name.length > 18 ? `${node.name.slice(0, 18)}...` : node.name}
                  </text>

                  {/* Node type */}
                  <text
                    x="85"
                    y="42"
                    textAnchor="middle"
                    className="fill-gray-200 text-xs"
                    style={{ fontSize: '10px', opacity: isFiltered ? 1 : 0.7 }}
                  >
                    {node.type}
                  </text>


                  {/* Selection highlight */}
                  {isSelected && (
                    <rect
                      width="180"
                      height="70"
                      x="-5"
                      y="-5"
                      rx="12"
                      fill="none"
                      stroke="#60A5FA"
                      strokeWidth={2}
                      opacity={0.6}
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">Component Types</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-xs text-gray-300">Application</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-xs text-gray-300">Library</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-xs text-gray-300">Dependency</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-600">
            <h4 className="text-xs font-medium text-gray-300 mb-2">Visibility</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-xs text-gray-300">Filtered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 opacity-50" style={{ border: '1px dashed #6B7280' }}></div>
                <span className="text-xs text-gray-400">Hidden by filter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Legend */}
        <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">Risk Level</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-300">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-300">High</span>
            </div>
          </div>
        </div>

        {/* Navigation hint */}
        <div className="absolute top-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-2">
          <p className="text-xs text-gray-400">Scroll to pan • Click nodes to select</p>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default TreeDiagram;