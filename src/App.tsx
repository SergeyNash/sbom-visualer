import React, { useState, useMemo } from 'react';
import { Code, FileText } from 'lucide-react';
import { FilterState, SBOMComponent } from './types/sbom';
import { mockSBOMData } from './data/mockSBOM';
import ComponentFilter from './components/ComponentFilter';
import ComponentTable from './components/ComponentTable';
import TreeDiagram from './components/TreeDiagram';
import ComponentDetails from './components/ComponentDetails';
import SBOMUploader from './components/SBOMUploader';
import CodeUploader from './components/CodeUploader';

function App() {
  const [sbomData, setSbomData] = useState<SBOMComponent[]>(mockSBOMData);
  const [filters, setFilters] = useState<FilterState>({
    type: [],
    license: [],
    riskLevel: [],
    searchTerm: ''
  });
  
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showCodeUploader, setShowCodeUploader] = useState(false);
  // Состояние для управления сворачиванием представлений
  // true - развернуто, false - свернуто
  const [isComponentsExpanded, setIsComponentsExpanded] = useState(true);
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);
  const [isTreeFullscreen, setIsTreeFullscreen] = useState(false);
  const [isTreeMatrixMode, setIsTreeMatrixMode] = useState(false);

  const filteredComponents = useMemo(() => {
    return sbomData.filter(component => {
      // Search term filter
      if (filters.searchTerm && !component.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(component.type)) {
        return false;
      }

      // License filter
      if (filters.license.length > 0 && !filters.license.includes(component.license)) {
        return false;
      }

      // Risk level filter
      if (filters.riskLevel.length > 0 && !filters.riskLevel.includes(component.riskLevel)) {
        return false;
      }

      return true;
    });
  }, [sbomData, filters]);

  const selectedComponentData = useMemo(() => {
    return sbomData.find(c => c.id === selectedComponent) || null;
  }, [sbomData, selectedComponent]);

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponent(componentId);
  };

  const handleCloseDetails = () => {
    setSelectedComponent(null);
  };

  // Функции для переключения представлений с предотвращением одновременного сворачивания
  const handleToggleComponentsView = () => {
    // Если пытаемся свернуть компоненты, но дерево уже свернуто - не позволяем
    if (isComponentsExpanded && !isTreeExpanded) {
      return; // Не сворачиваем компоненты, если дерево уже свернуто
    }
    setIsComponentsExpanded(prev => !prev);
  };

  const handleToggleTreeView = () => {
    // Если пытаемся свернуть дерево, но компоненты уже свернуты - не позволяем
    if (isTreeExpanded && !isComponentsExpanded) {
      return; // Не сворачиваем дерево, если компоненты уже свернуты
    }
    setIsTreeExpanded(prev => !prev);
  };

  const handleSBOMLoad = (components: SBOMComponent[]) => {
    setSbomData(components);
    setSelectedComponent(null);
    // Reset filters when loading new SBOM
    setFilters({
      type: [],
      license: [],
      riskLevel: [],
      searchTerm: ''
    });
    
    // Auto-enable matrix mode if no dependencies exist
    const hasDependencies = components.some(c => c.dependencies.length > 0);
    setIsTreeMatrixMode(!hasDependencies);
  };

  // Handle Escape key to exit fullscreen
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTreeFullscreen) {
        setIsTreeFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTreeFullscreen]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">SBOM Analyzer</h1>
            <p className="text-gray-400 text-sm mt-1">
              Interactive Software Bill of Materials visualization
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                <FileText className="w-4 h-4" />
                Upload SBOM
              </button>
              <button
                onClick={() => setShowCodeUploader(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
              >
                <Code className="w-4 h-4" />
                Generate from Code
              </button>
            </div>
            <div className="text-sm text-gray-400">
              {filteredComponents.length} of {sbomData.length} components shown
            </div>
          </div>
        </div>
      </header>

      {/* Horizontal Filters */}
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
        <ComponentFilter
          filters={filters}
          onFiltersChange={setFilters}
          isHorizontal={true}
        />
      </div>

      {/* Main Content */}
      <main className={`flex h-[calc(100vh-140px)] ${isTreeFullscreen ? 'fixed inset-0 top-32 z-50' : ''}`}>
        {/* Center - Component Table */}
        {!isTreeFullscreen && (
          <section className={`transition-all duration-300 overflow-hidden ${
            isComponentsExpanded ? 'flex-1' : 'w-12'
          }`}>
            {isComponentsExpanded && <div className="p-4 h-full"><ComponentTable
              components={filteredComponents}
              selectedComponent={selectedComponent}
              onComponentSelect={handleComponentSelect}
              isCollapsed={false}
              onToggleCollapse={handleToggleComponentsView}
            /></div>}
            {!isComponentsExpanded && <ComponentTable
              components={filteredComponents}
              selectedComponent={selectedComponent}
              onComponentSelect={handleComponentSelect}
              isCollapsed={true}
              onToggleCollapse={handleToggleComponentsView}
            />}
          </section>
        )}

        {/* Right - Tree Diagram */}
        <section className={`transition-all duration-300 overflow-hidden ${
          isTreeFullscreen ? 'w-full' : 
          isTreeExpanded ? 'flex-1' : 'w-12'
        }`}>
          <TreeDiagram
            components={sbomData}
            filteredComponents={filteredComponents}
            selectedComponent={selectedComponent}
            onComponentSelect={handleComponentSelect}
            isCollapsed={!isTreeExpanded}
            onToggleCollapse={handleToggleTreeView}
            isFullscreen={isTreeFullscreen}
            onToggleFullscreen={() => setIsTreeFullscreen(!isTreeFullscreen)}
            isMatrixMode={isTreeMatrixMode}
            onToggleMatrixMode={() => setIsTreeMatrixMode(!isTreeMatrixMode)}
          />
        </section>

        {/* Component Details Sidebar */}
        {!isTreeFullscreen && (
          <ComponentDetails
            component={selectedComponentData}
            isOpen={true}
            onClose={handleCloseDetails}
            isFullWidth={!isComponentsExpanded && !isTreeExpanded}
            onComponentSelect={handleComponentSelect}
            allComponents={sbomData}
          />
        )}
      </main>

      {/* SBOM Uploader Modal */}
      <SBOMUploader
        onSBOMLoad={handleSBOMLoad}
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
      />

      {/* Code Uploader Modal */}
      <CodeUploader
        onSBOMLoad={handleSBOMLoad}
        isOpen={showCodeUploader}
        onClose={() => setShowCodeUploader(false)}
      />
    </div>
  );
}

export default App;