import React, { useMemo, useState } from 'react';
import { SBOMComponent } from '../types/sbom';
import { ZoomIn, ZoomOut, RotateCcw, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';

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
  selectedComponent: string | null;
  onComponentSelect: (componentId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const TreeDiagram: React.FC<TreeDiagramProps> = ({
  components,
  selectedComponent,
  onComponentSelect,
  isCollapsed,
  onToggleCollapse
}) => {
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges, treeWidth, treeHeight } = useMemo(() => {
    if (!components || components.length === 0) {
      return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0 };
    }

    // Find root component (application type or first component)
    const rootComponent = components.find(c => c.type === 'application') || components[0];
    
    // Create component map for quick lookup
    const componentMap = new Map(components.map(c => [c.id, c]));
    
    // Build tree structure
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

      // Add children (dependencies)
      component.dependencies.forEach(depId => {
        const childNode = buildTree(depId, level + 1, new Set(visited));
        if (childNode) {
          childNode.parent = node;
          node.children.push(childNode);
        }
      });

      return node;
    };

    const rootNode = buildTree(rootComponent.id);
    if (!rootNode) return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0 };

    // Calculate positions using tree layout algorithm
    const nodeWidth = 180;
    const nodeHeight = 80;
    const levelGap = 220;
    const siblingGap = 20;

    // First pass: calculate subtree sizes
    const calculateSubtreeSize = (node: TreeNode): number => {
      if (node.children.length === 0) return 1;
      
      let totalSize = 0;
      node.children.forEach(child => {
        totalSize += calculateSubtreeSize(child);
      });
      return Math.max(1, totalSize);
    };

    // Second pass: position nodes
    const positionNodes = (node: TreeNode, startY: number = 0): number => {
      node.x = 100 + node.level * levelGap;
      
      if (node.children.length === 0) {
        node.y = startY + nodeHeight / 2;
        return startY + nodeHeight + siblingGap;
      }

      let currentY = startY;
      const childPositions: number[] = [];
      
      node.children.forEach(child => {
        const childStartY = currentY;
        currentY = positionNodes(child, currentY);
        childPositions.push(childStartY + nodeHeight / 2);
      });

      // Center parent node among its children
      const firstChildY = childPositions[0];
      const lastChildY = childPositions[childPositions.length - 1];
      node.y = (firstChildY + lastChildY) / 2;

      return currentY;
    };

    const totalHeight = positionNodes(rootNode);

    // Collect all nodes
    const allNodes: TreeNode[] = [];
    const collectNodes = (node: TreeNode) => {
      allNodes.push(node);
      node.children.forEach(collectNodes);
    };
    collectNodes(rootNode);

    // Create edges
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
    const maxX = Math.max(...allNodes.map(n => n.x)) + nodeWidth + 100;
    const maxY = Math.max(...allNodes.map(n => n.y)) + nodeHeight + 100;

    return { 
      nodes: allNodes, 
      edges: allEdges, 
      treeWidth: maxX, 
      treeHeight: Math.max(maxY, totalHeight + 100) 
    };
  }, [components]);

  const getNodeColor = (node: TreeNode) => {
    if (node.type === 'application') return '#10B981'; // green
    if (node.type === 'library') return '#3B82F6'; // blue
    return '#F97316'; // orange for dependency
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
        className="absolute top-2 right-2 z-10 p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title={isCollapsed ? "Expand Tree" : "Collapse Tree"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3 h-3 text-gray-300" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-300" />
        )}
      </button>

      {isCollapsed ? (
        <div className="p-2 h-full flex flex-col items-center justify-center">
          <GitBranch className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-xs text-gray-400 transform rotate-90 whitespace-nowrap">
            Dependency Tree
          </div>
        </div>
      ) : (
        <>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-100">Dependency Tree</h2>
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
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[600px] bg-gray-900 overflow-auto">
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

            {/* Grid pattern */}
            <pattern id="tree-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.2"/>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#tree-grid)" />

          {/* Edges */}
          <g transform={`scale(${zoom})`}>
            {edges.map((edge, index) => {
              const isSelected = selectedComponent === edge.source || selectedComponent === edge.target;
              const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
              const strokeColor = isSelected ? '#3B82F6' : isHovered ? '#10B981' : '#6B7280';
              const markerEnd = isSelected ? 'url(#arrow-selected)' : isHovered ? 'url(#arrow-hover)' : 'url(#arrow-default)';
              
              // Create curved path for better tree visualization
              const midX = (edge.sourceX + edge.targetX) / 2;
              const pathData = `M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
              
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
                    opacity={0.9}
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
                    style={{ fontSize: '13px' }}
                  >
                    {node.name.length > 18 ? `${node.name.slice(0, 18)}...` : node.name}
                  </text>

                  {/* Node type */}
                  <text
                    x="85"
                    y="42"
                    textAnchor="middle"
                    className="fill-gray-200 text-xs"
                    style={{ fontSize: '10px' }}
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
          <p className="text-xs text-gray-400">Scroll to pan • Use zoom controls</p>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default TreeDiagram;