import React from 'react';
import { Search, Filter } from 'lucide-react';
import { FilterState } from '../types/sbom';

interface ComponentFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isHorizontal?: boolean;
}

const ComponentFilter: React.FC<ComponentFilterProps> = ({ filters, onFiltersChange, isHorizontal = false }) => {
  const handleFilterChange = (category: keyof FilterState, value: string) => {
    if (category === 'searchTerm') {
      onFiltersChange({ ...filters, [category]: value });
      return;
    }

    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({ ...filters, [category]: newValues });
  };

  const isChecked = (category: keyof FilterState, value: string) => {
    if (category === 'searchTerm') return false;
    return (filters[category] as string[]).includes(value);
  };

  if (isHorizontal) {
    return (
      <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <div className="flex items-center gap-6">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <div className="relative">
              <input
                type="text"
                placeholder="Search components..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-64 pl-3 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Type:</span>
            <div className="flex gap-2">
              {['library', 'application', 'dependency'].map((type) => (
                <label key={type} className="flex items-center gap-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked('type', type)}
                    onChange={() => handleFilterChange('type', type)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-gray-100 capitalize transition-colors">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* License Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">License:</span>
            <div className="flex gap-2">
              {['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause'].map((license) => (
                <label key={license} className="flex items-center gap-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked('license', license)}
                    onChange={() => handleFilterChange('license', license)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-gray-100 transition-colors">
                    {license}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Risk:</span>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((risk) => (
                <label key={risk} className="flex items-center gap-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked('riskLevel', risk)}
                    onChange={() => handleFilterChange('riskLevel', risk)}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                  />
                  <span className={`text-xs group-hover:opacity-90 transition-opacity capitalize ${
                    risk === 'low' ? 'text-green-400' :
                    risk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {risk}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">Filters</h3>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search components..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">Type</h4>
        <div className="space-y-2">
          {['library', 'application', 'dependency'].map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isChecked('type', type)}
                onChange={() => handleFilterChange('type', type)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-300 group-hover:text-gray-100 capitalize transition-colors">
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* License Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">License</h4>
        <div className="space-y-2">
          {['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause'].map((license) => (
            <label key={license} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isChecked('license', license)}
                onChange={() => handleFilterChange('license', license)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
                {license}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Risk Level Filter */}
      <div>
        <h4 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">Risk Level</h4>
        <div className="space-y-2">
          {['low', 'medium', 'high'].map((risk) => (
            <label key={risk} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isChecked('riskLevel', risk)}
                onChange={() => handleFilterChange('riskLevel', risk)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className={`text-sm group-hover:opacity-90 transition-opacity capitalize ${
                risk === 'low' ? 'text-green-400' :
                risk === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {risk}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComponentFilter;