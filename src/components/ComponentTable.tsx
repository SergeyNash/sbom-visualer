import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Shield, AlertTriangle, CheckCircle, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';

type SortField = 'name' | 'type' | 'license' | 'version' | 'riskLevel' | 'cveCount';
type SortDirection = 'asc' | 'desc';

interface ComponentTableProps {
  components: SBOMComponent[];
  selectedComponent: string | null;
  onComponentSelect: (componentId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ComponentTable: React.FC<ComponentTableProps> = ({
  components,
  selectedComponent,
  onComponentSelect,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [visibleItems, setVisibleItems] = useState<SBOMComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // Сортировка компонентов
  const sortedComponents = useMemo(() => {
    return [...components].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Специальная обработка для числовых полей
      if (sortField === 'cveCount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      // Специальная обработка для riskLevel
      if (sortField === 'riskLevel') {
        const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        aValue = riskOrder[aValue as keyof typeof riskOrder];
        bValue = riskOrder[bValue as keyof typeof riskOrder];
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [components, sortField, sortDirection]);

  // Обработчик сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Загрузка следующих элементов
  const loadMoreItems = () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setTimeout(() => {
      const currentLength = visibleItems.length;
      const nextItems = sortedComponents.slice(currentLength, currentLength + ITEMS_PER_PAGE);
      
      setVisibleItems(prev => [...prev, ...nextItems]);
      setHasMore(currentLength + nextItems.length < sortedComponents.length);
      setIsLoading(false);
    }, 300); // Имитация загрузки
  };

  // Сброс видимых элементов при изменении сортировки или фильтрации
  useEffect(() => {
    setVisibleItems(sortedComponents.slice(0, ITEMS_PER_PAGE));
    setHasMore(sortedComponents.length > ITEMS_PER_PAGE);
  }, [sortedComponents]);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, sortedComponents]);

  const getTypeIcon = (type: SBOMComponent['type']) => {
    switch (type) {
      case 'application':
        return <Package className="w-4 h-4 text-green-400" />;
      case 'library':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'dependency':
        return <Package className="w-4 h-4 text-orange-400" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRiskIcon = (riskLevel: SBOMComponent['riskLevel']) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'high':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getRiskBadgeClass = (riskLevel: SBOMComponent['riskLevel']) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-900/50 text-green-300 border-green-700';
      case 'medium':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'high':
        return 'bg-red-900/50 text-red-300 border-red-700';
    }
  };

  // Показать свернутое состояние
  if (isCollapsed) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden h-full">
        <button
          onClick={onToggleCollapse}
          className="absolute top-2 right-2 z-10 p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Expand Components Table"
        >
          <ChevronLeft className="w-3 h-3 text-gray-300" />
        </button>
        
        <div className="p-2 h-full flex flex-col items-center justify-center">
          <Shield className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-xs text-gray-400 transform rotate-90 whitespace-nowrap">
            Components
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-100">Components</h2>
            <span className="text-sm text-gray-400">({components.length})</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            title="Collapse Components Table"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={containerRef}>
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-700/90 backdrop-blur-sm z-10">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Component
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-2">
                  Type
                  {sortField === 'type' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('license')}
              >
                <div className="flex items-center gap-2">
                  License
                  {sortField === 'license' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('version')}
              >
                <div className="flex items-center gap-2">
                  Version
                  {sortField === 'version' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('riskLevel')}
              >
                <div className="flex items-center gap-2">
                  Risk
                  {sortField === 'riskLevel' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide cursor-pointer hover:bg-gray-600/50 transition-colors"
                onClick={() => handleSort('cveCount')}
              >
                <div className="flex items-center gap-2">
                  CVEs
                  {sortField === 'cveCount' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {visibleItems.map((component) => (
              <tr
                key={component.id}
                onClick={() => onComponentSelect(component.id)}
                className={`cursor-pointer transition-all duration-200 hover:bg-gray-700/50 ${
                  selectedComponent === component.id
                    ? 'bg-blue-900/30 border-l-4 border-blue-400'
                    : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(component.type)}
                    <div>
                      <div className="text-sm font-medium text-gray-100">
                        {component.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-48">
                        {component.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    component.type === 'application'
                      ? 'bg-green-900/50 text-green-300 border-green-700'
                      : component.type === 'library'
                      ? 'bg-blue-900/50 text-blue-300 border-blue-700'
                      : 'bg-orange-900/50 text-orange-300 border-orange-700'
                  }`}>
                    {component.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded font-mono">
                    {component.license}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-300 font-mono">
                    {component.version}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getRiskIcon(component.riskLevel)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeClass(component.riskLevel)}`}>
                      {component.riskLevel}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${
                    component.cveCount > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {component.cveCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Индикатор загрузки */}
        {hasMore && (
          <div ref={loadingRef} className="p-4 text-center">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-sm">Loading more components...</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Showing {visibleItems.length} of {components.length} components
              </div>
            )}
          </div>
        )}
        
        {/* Сообщение о том, что все элементы загружены */}
        {!hasMore && visibleItems.length > 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            All {components.length} components loaded
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentTable;