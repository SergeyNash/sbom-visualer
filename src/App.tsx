import React, { useState, useMemo } from 'react';
import { Upload } from 'lucide-react';
import { FilterState, SBOMComponent } from './types/sbom';
import { mockSBOMData } from './data/mockSBOM';
import ComponentFilter from './components/ComponentFilter';
import ComponentTable from './components/ComponentTable';
import TreeDiagram from './components/TreeDiagram';
import ComponentDetails from './components/ComponentDetails';
import SBOMUploader from './components/SBOMUploader';

function App() {
  const [sbomData, setSbomData] = useState<SBOMComponent[]>(mockSBOMData);
  const [filters, setFilters] = useState<FilterState>({
    type: [],
    license: [],
    riskLevel: [],
    searchTerm: ''
  });
  
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

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
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  const handleSBOMLoad = (components: SBOMComponent[]) => {
    setSbomData(components);
    setSelectedComponent(null);
    setShowDetails(false);
    // Reset filters when loading new SBOM
    setFilters({
      type: [],
      license: [],
      riskLevel: [],
      searchTerm: ''
    });
  };

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
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload SBOM
            </button>
            <div className="text-sm text-gray-400">
              {filteredComponents.length} of {sbomData.length} components shown
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Filters */}
        <aside className="w-64 p-4 border-r border-gray-700 bg-gray-900 overflow-y-auto">
          <ComponentFilter
            filters={filters}
            onFiltersChange={setFilters}
          />
        </aside>

        {/* Center - Component Table */}
        <section className="flex-1 p-4 overflow-hidden">
          <ComponentTable
            components={filteredComponents}
            selectedComponent={selectedComponent}
            onComponentSelect={handleComponentSelect}
          />
        </section>

        {/* Right - Tree Diagram */}
        <section className={`transition-all duration-300 overflow-hidden ${
          isTreeCollapsed ? 'w-12' : 'w-1/2'
        }`}>
          <TreeDiagram
            components={filteredComponents}
            selectedComponent={selectedComponent}
            onComponentSelect={handleComponentSelect}
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={() => setIsTreeCollapsed(!isTreeCollapsed)}
          />
        </section>
      </main>

      {/* Component Details Sidebar */}
      <ComponentDetails
        component={selectedComponentData}
        isOpen={showDetails}
        onClose={handleCloseDetails}
      />

      {/* SBOM Uploader Modal */}
      <SBOMUploader
        onSBOMLoad={handleSBOMLoad}
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
      />
    </div>
  );
}

export default App;