import React from 'react';
import { Package, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SBOMComponent } from '../types/sbom';

interface ComponentTableProps {
  components: SBOMComponent[];
  selectedComponent: string | null;
  onComponentSelect: (componentId: string) => void;
}

const ComponentTable: React.FC<ComponentTableProps> = ({
  components,
  selectedComponent,
  onComponentSelect
}) => {
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

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-100">Components</h2>
          <span className="text-sm text-gray-400">({components.length})</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                Component
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                License
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                Risk
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wide">
                CVEs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {components.map((component) => (
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
      </div>
    </div>
  );
};

export default ComponentTable;