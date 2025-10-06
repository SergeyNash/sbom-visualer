import React from 'react';
import { X, Package, Shield, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';

interface ComponentDetailsProps {
  component: SBOMComponent | null;
  isOpen: boolean;
  onClose: () => void;
}

const ComponentDetails: React.FC<ComponentDetailsProps> = ({ component, isOpen, onClose }) => {
  if (!isOpen || !component) return null;

  const getRiskIcon = (riskLevel: SBOMComponent['riskLevel']) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'high':
        return <XCircle className="w-5 h-5 text-red-400" />;
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

  const getTypeColor = (type: SBOMComponent['type']) => {
    switch (type) {
      case 'application':
        return 'bg-green-900/50 text-green-300 border-green-700';
      case 'library':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'dependency':
        return 'bg-orange-900/50 text-orange-300 border-orange-700';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-100">Component Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
          </div>

          {/* Component Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-100 mb-3">{component.name}</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {component.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Type
                  </label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(component.type)}`}>
                    {component.type}
                  </span>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Version
                  </label>
                  <span className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded font-mono">
                    {component.version}
                  </span>
                </div>
              </div>
            </div>

            {/* License */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                License
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 bg-gray-700 px-3 py-2 rounded font-mono">
                  {component.license}
                </span>
                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                  <ExternalLink className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Risk Assessment
              </label>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {getRiskIcon(component.riskLevel)}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeClass(component.riskLevel)}`}>
                    {component.riskLevel} Risk
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">CVE Count</span>
                    <span className={`text-sm font-medium ${
                      component.cveCount > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {component.cveCount}
                    </span>
                  </div>
                  
                  {component.cveCount > 0 && (
                    <button className="text-left text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      View CVE Details →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Dependencies ({component.dependencies.length})
              </label>
              
              {component.dependencies.length > 0 ? (
                <div className="space-y-2">
                  {component.dependencies.map((depId, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300 font-mono">{depId}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic p-3 bg-gray-700/50 rounded-lg">
                  No dependencies
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="border-t border-gray-700 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Component ID</span>
                  <span className="text-gray-300 font-mono">{component.id}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-gray-300">2 days ago</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Scan Status</span>
                  <span className="text-green-400">✓ Scanned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComponentDetails;