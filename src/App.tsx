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
import type { DataMode } from './services/sbomOperations';
import { useBackendHealth } from './services/backendHealth';

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
  const [dataMode, setDataMode] = useState<DataMode>('auto');
  const backendHealth = useBackendHealth(5000);
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

  // Функции для разворачивания представлений
  const handleToggleComponentsView = () => {
    // При нажатии на иконку компонентов - разворачиваем их
    setIsComponentsExpanded(true);
  };

  const handleToggleTreeView = () => {
    // При нажатии на иконку дерева - разворачиваем его
    setIsTreeExpanded(true);
  };

  // Функции для сворачивания представлений
  const handleCollapseComponents = () => {
    // Можно свернуть только если дерево развернуто
    if (isTreeExpanded) {
      setIsComponentsExpanded(false);
    }
  };

  const handleCollapseTree = () => {
    // Можно свернуть только если компоненты развернуты
    if (isComponentsExpanded) {
      setIsTreeExpanded(false);
    }
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Mode</span>
              <select
                value={dataMode}
                onChange={(e) => setDataMode(e.target.value as DataMode)}
                className="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Data processing mode"
              >
                <option value="auto">Auto (API → fallback)</option>
                <option value="api">API only</option>
                <option value="local">Offline only</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Backend</span>
              <span
                className={`text-xs px-2 py-1 rounded border ${
                  backendHealth.status === 'online'
                    ? 'bg-green-900/30 text-green-300 border-green-700'
                    : backendHealth.status === 'offline'
                    ? 'bg-red-900/30 text-red-300 border-red-700'
                    : 'bg-gray-700 text-gray-300 border-gray-600'
                }`}
                title={backendHealth.lastError ? `Last error: ${backendHealth.lastError}` : 'Backend health'}
              >
                {backendHealth.status}
              </span>
              {dataMode === 'auto' && backendHealth.status === 'offline' && (
                <button
                  onClick={() => setDataMode('local')}
                  className="text-xs px-2 py-1 rounded bg-yellow-700/40 hover:bg-yellow-700/60 text-yellow-200 border border-yellow-700 transition-colors"
                  title="Switch to Offline mode (limited functionality; processing happens in the browser)"
                >
                  Switch to Offline
                </button>
              )}
              {dataMode === 'local' && (
                <span
                  className="text-xs px-2 py-1 rounded border bg-yellow-900/20 text-yellow-200 border-yellow-700"
                  title="Offline mode is active: SBOM parsing/generation runs locally and may be limited compared to the backend."
                >
                  offline
                </span>
              )}
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
              onToggleCollapse={handleCollapseComponents}
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
            onToggleCollapse={isTreeExpanded ? handleCollapseTree : handleToggleTreeView}
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
        dataMode={dataMode}
        onDataModeChange={setDataMode}
      />

      {/* Code Uploader Modal */}
      <CodeUploader
        onSBOMLoad={handleSBOMLoad}
        isOpen={showCodeUploader}
        onClose={() => setShowCodeUploader(false)}
        dataMode={dataMode}
        onDataModeChange={setDataMode}
      />
    </div>
  );
}

export default App;