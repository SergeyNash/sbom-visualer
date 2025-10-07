import { SBOMComponent } from '../types/sbom';

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

export interface ExportOptions {
  includeMetadata?: boolean;
  includeLegend?: boolean;
  includeStatistics?: boolean;
  title?: string;
  description?: string;
}

export class TreeExporter {
  private components: SBOMComponent[];
  private filteredComponents: SBOMComponent[];
  private isMatrixMode: boolean;

  constructor(
    components: SBOMComponent[],
    filteredComponents: SBOMComponent[],
    isMatrixMode: boolean = false
  ) {
    this.components = components;
    this.filteredComponents = filteredComponents;
    this.isMatrixMode = isMatrixMode;
  }

  private getNodeColor(node: TreeNode): string {
    const isFiltered = this.filteredComponents.some(c => c.id === node.id);
    const opacity = isFiltered ? 1 : 0.6;
    
    if (node.type === 'application') return `rgba(16, 185, 129, ${opacity})`;
    if (node.type === 'library') return `rgba(59, 130, 246, ${opacity})`;
    return `rgba(249, 115, 22, ${opacity})`;
  }

  private getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  }

  private buildTreeStructure(): { nodes: TreeNode[], edges: TreeEdge[], treeWidth: number, treeHeight: number } {
    if (!this.components || this.components.length === 0) {
      return { nodes: [], edges: [], treeWidth: 0, treeHeight: 0 };
    }

    // Find root components
    const allDependencyIds = new Set();
    this.components.forEach(component => {
      component.dependencies.forEach(depId => {
        allDependencyIds.add(depId);
      });
    });
    
    const rootComponents = this.components.filter(component => !allDependencyIds.has(component.id));
    const actualRoots = rootComponents.length > 0 ? rootComponents : 
      (this.components.filter(c => c.type === 'application').length > 0 ? 
        this.components.filter(c => c.type === 'application') : [this.components[0]]);

    if (this.isMatrixMode || (!this.components.some(c => c.dependencies.length > 0) && this.components.length > 0)) {
      // Matrix mode
      const nodeWidth = 180;
      const nodeHeight = 80;
      const gapX = 20;
      const gapY = 20;
      const cols = Math.ceil(Math.sqrt(this.components.length));
      
      const matrixNodes: TreeNode[] = this.components.map((component, index) => {
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
        edges: [],
        treeWidth: maxX,
        treeHeight: maxY
      };
    }

    // Tree mode
    const componentMap = new Map(this.components.map(c => [c.id, c]));
    
    const buildTree = (componentId: string, level: number = 0, visited = new Set<string>()): TreeNode | null => {
      if (visited.has(componentId)) return null;
      visited.add(componentId);
      
      const component = componentMap.get(componentId);
      if (!component) return null;

      const node: TreeNode = {
        id: component.id,
        name: component.name,
        type: component.type,
        riskLevel: component.riskLevel,
        x: 0,
        y: 0,
        level,
        children: []
      };

      component.dependencies.forEach(depId => {
        const childNode = buildTree(depId, level + 1, new Set(visited));
        if (childNode) {
          childNode.parent = node;
          node.children.push(childNode);
        }
      });

      return node;
    };

    const unpositionedTrees: TreeNode[] = [];
    actualRoots.forEach((rootComponent) => {
      const rootNode = buildTree(rootComponent.id);
      if (rootNode) {
        unpositionedTrees.push(rootNode);
      }
    });

    // Position trees
    const levelGap = 250;
    const treeVerticalGap = 150;
    const nodeHeight = 80;
    const siblingGap = 20;
    
    let currentTreeY = 100;
    
    const positionTreeNodes = (node: TreeNode, level: number = 0, startY: number = 0): number => {
      node.x = 100 + level * levelGap;
      
      if (node.children.length === 0) {
        node.y = startY + nodeHeight / 2;
        return startY + nodeHeight + siblingGap;
      }
      
      let currentY = startY;
      const childPositions: number[] = [];
      
      node.children.forEach(child => {
        const childStartY = currentY;
        currentY = positionTreeNodes(child, level + 1, currentY);
        childPositions.push(childStartY + nodeHeight / 2);
      });
      
      const firstChildY = childPositions[0];
      const lastChildY = childPositions[childPositions.length - 1];
      node.y = (firstChildY + lastChildY) / 2;
      
      return currentY;
    };
    
    unpositionedTrees.forEach((rootNode) => {
      positionTreeNodes(rootNode, 0, currentTreeY);
      currentTreeY += 200; // Simplified height calculation
    });

    // Collect all nodes
    const allNodes: TreeNode[] = [];
    const collectNodes = (node: TreeNode) => {
      allNodes.push(node);
      node.children.forEach(collectNodes);
    };
    unpositionedTrees.forEach(collectNodes);

    // Create edges
    const allEdges: TreeEdge[] = [];
    allNodes.forEach(node => {
      node.children.forEach(child => {
        allEdges.push({
          source: node.id,
          target: child.id,
          sourceX: node.x + 180,
          sourceY: node.y,
          targetX: child.x,
          targetY: child.y
        });
      });
    });

    const nodeWidth = 180;
    const maxX = Math.max(...allNodes.map(n => n.x)) + nodeWidth + 100;
    const maxY = Math.max(...allNodes.map(n => n.y)) + nodeHeight + 100;

    return { 
      nodes: allNodes, 
      edges: allEdges, 
      treeWidth: maxX, 
      treeHeight: maxY
    };
  }

  private generateSVG(nodes: TreeNode[], edges: TreeEdge[], treeWidth: number, treeHeight: number): string {
    const svgContent = `
      <svg width="${treeWidth}" height="${treeHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
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
        </defs>
        
        <rect width="100%" height="100%" fill="#111827" />
        
        ${edges.map(edge => {
          const midX = (edge.sourceX + edge.targetX) / 2;
          const pathData = `M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
          return `<path d="${pathData}" stroke="#6B7280" stroke-width="1" fill="none" marker-end="url(#arrow-default)" opacity="0.5" />`;
        }).join('\n        ')}
        
        ${nodes.map(node => {
          const isFiltered = this.filteredComponents.some(c => c.id === node.id);
          const nodeColor = this.getNodeColor(node);
          const riskColor = this.getRiskColor(node.riskLevel);
          
          return `
          <g transform="translate(${node.x}, ${node.y - 30})">
            <rect
              width="170"
              height="60"
              rx="8"
              fill="${nodeColor}"
              stroke="${riskColor}"
              stroke-width="2"
              opacity="${isFiltered ? 0.9 : 0.5}"
              stroke-dasharray="${!isFiltered ? '5,5' : 'none'}"
            />
            <circle
              r="6"
              cx="155"
              cy="10"
              fill="${riskColor}"
              stroke="#1F2937"
              stroke-width="1"
            />
            <text
              x="85"
              y="25"
              text-anchor="middle"
              fill="white"
              font-size="13px"
              font-weight="bold"
              opacity="${isFiltered ? 1 : 0.7}"
            >
              ${node.name.length > 18 ? `${node.name.slice(0, 18)}...` : node.name}
            </text>
            <text
              x="85"
              y="42"
              text-anchor="middle"
              fill="#E5E7EB"
              font-size="10px"
              opacity="${isFiltered ? 1 : 0.7}"
            >
              ${node.type}
            </text>
          </g>`;
        }).join('\n        ')}
      </svg>
    `;
    
    return svgContent;
  }

  private generateStatistics(): string {
    const totalComponents = this.components.length;
    const filteredCount = this.filteredComponents.length;
    const applications = this.components.filter(c => c.type === 'application').length;
    const libraries = this.components.filter(c => c.type === 'library').length;
    const dependencies = this.components.filter(c => c.type === 'dependency').length;
    const highRisk = this.components.filter(c => c.riskLevel === 'high').length;
    const mediumRisk = this.components.filter(c => c.riskLevel === 'medium').length;
    const lowRisk = this.components.filter(c => c.riskLevel === 'low').length;

    return `
      <div class="statistics">
        <h3>Статистика компонентов</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Всего компонентов:</span>
            <span class="stat-value">${totalComponents}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Отфильтровано:</span>
            <span class="stat-value">${filteredCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Приложения:</span>
            <span class="stat-value">${applications}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Библиотеки:</span>
            <span class="stat-value">${libraries}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Зависимости:</span>
            <span class="stat-value">${dependencies}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Высокий риск:</span>
            <span class="stat-value high-risk">${highRisk}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Средний риск:</span>
            <span class="stat-value medium-risk">${mediumRisk}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Низкий риск:</span>
            <span class="stat-value low-risk">${lowRisk}</span>
          </div>
        </div>
      </div>
    `;
  }

  private generateLegend(): string {
    return `
      <div class="legend">
        <h3>Легенда</h3>
        <div class="legend-section">
          <h4>Типы компонентов</h4>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color" style="background-color: #10B981;"></div>
              <span>Приложение</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #3B82F6;"></div>
              <span>Библиотека</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #F97316;"></div>
              <span>Зависимость</span>
            </div>
          </div>
        </div>
        <div class="legend-section">
          <h4>Уровни риска</h4>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color" style="background-color: #10B981; border-radius: 50%;"></div>
              <span>Низкий</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #F59E0B; border-radius: 50%;"></div>
              <span>Средний</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #EF4444; border-radius: 50%;"></div>
              <span>Высокий</span>
            </div>
          </div>
        </div>
        <div class="legend-section">
          <h4>Видимость</h4>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color" style="background-color: #3B82F6;"></div>
              <span>Отфильтровано</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #3B82F6; opacity: 0.5; border: 1px dashed #6B7280;"></div>
              <span>Скрыто фильтром</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateCSS(): string {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #1F2937;
          color: #F9FAFB;
          line-height: 1.6;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #374151;
          border-radius: 8px;
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          color: #F9FAFB;
          font-size: 2rem;
        }
        
        .header p {
          margin: 0;
          color: #D1D5DB;
          font-size: 1.1rem;
        }
        
        .diagram-container {
          background-color: #111827;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          overflow: auto;
        }
        
        .diagram-container svg {
          display: block;
          margin: 0 auto;
        }
        
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .statistics, .legend {
          background-color: #374151;
          border-radius: 8px;
          padding: 20px;
        }
        
        .statistics h3, .legend h3 {
          margin: 0 0 20px 0;
          color: #F9FAFB;
          font-size: 1.25rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #4B5563;
          border-radius: 6px;
        }
        
        .stat-label {
          color: #D1D5DB;
          font-size: 0.9rem;
        }
        
        .stat-value {
          color: #F9FAFB;
          font-weight: bold;
          font-size: 1.1rem;
        }
        
        .stat-value.high-risk {
          color: #EF4444;
        }
        
        .stat-value.medium-risk {
          color: #F59E0B;
        }
        
        .stat-value.low-risk {
          color: #10B981;
        }
        
        .legend-section {
          margin-bottom: 20px;
        }
        
        .legend-section:last-child {
          margin-bottom: 0;
        }
        
        .legend-section h4 {
          margin: 0 0 15px 0;
          color: #E5E7EB;
          font-size: 1rem;
        }
        
        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #374151;
          border-radius: 8px;
          color: #9CA3AF;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }

  public exportToHTML(options: ExportOptions = {}): string {
    const {
      includeMetadata = true,
      includeLegend = true,
      includeStatistics = true,
      title = 'Dependency Tree Export',
      description = 'Экспорт дерева зависимостей SBOM'
    } = options;

    const { nodes, edges, treeWidth, treeHeight } = this.buildTreeStructure();
    const svgContent = this.generateSVG(nodes, edges, treeWidth, treeHeight);
    
    const currentDate = new Date().toLocaleString('ru-RU');
    
    let html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${this.generateCSS()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p>${description}</p>
            ${includeMetadata ? `<p>Экспортировано: ${currentDate}</p>` : ''}
        </div>
        
        <div class="diagram-container">
            ${svgContent}
        </div>
        
        ${includeStatistics || includeLegend ? `
        <div class="content-grid">
            ${includeStatistics ? this.generateStatistics() : ''}
            ${includeLegend ? this.generateLegend() : ''}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Сгенерировано SBOM Visualizer • ${currentDate}</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  public downloadHTML(options: ExportOptions = {}): void {
    const html = this.exportToHTML(options);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dependency-tree-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

