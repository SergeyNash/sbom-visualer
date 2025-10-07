import { TreeExporter } from '../treeExporter';
import { SBOMComponent } from '../../types/sbom';

describe('TreeExporter', () => {
  const mockComponents: SBOMComponent[] = [
    {
      id: 'app-1',
      name: 'Test Application',
      type: 'application',
      license: 'MIT',
      version: '1.0.0',
      riskLevel: 'low',
      cveCount: 0,
      dependencies: ['lib-1', 'lib-2'],
      description: 'Test application'
    },
    {
      id: 'lib-1',
      name: 'Test Library 1',
      type: 'library',
      license: 'Apache-2.0',
      version: '2.1.0',
      riskLevel: 'medium',
      cveCount: 2,
      dependencies: ['dep-1'],
      description: 'Test library 1'
    },
    {
      id: 'lib-2',
      name: 'Test Library 2',
      type: 'library',
      license: 'GPL-3.0',
      version: '1.5.0',
      riskLevel: 'high',
      cveCount: 5,
      dependencies: [],
      description: 'Test library 2'
    },
    {
      id: 'dep-1',
      name: 'Test Dependency',
      type: 'dependency',
      license: 'MIT',
      version: '3.0.0',
      riskLevel: 'low',
      cveCount: 0,
      dependencies: [],
      description: 'Test dependency'
    }
  ];

  const mockFilteredComponents = mockComponents;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and related methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    
    global.document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return {} as any;
    });
    
    global.document.body = {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      expect(exporter).toBeInstanceOf(TreeExporter);
    });
  });

  describe('exportToHTML', () => {
    it('should generate HTML with default options', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      const html = exporter.exportToHTML();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="ru">');
      expect(html).toContain('Dependency Tree Export');
      expect(html).toContain('<svg');
      expect(html).toContain('Test Application');
      expect(html).toContain('Test Library 1');
      expect(html).toContain('Test Library 2');
      expect(html).toContain('Test Dependency');
    });

    it('should generate HTML with custom options', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      const html = exporter.exportToHTML({
        title: 'Custom Title',
        description: 'Custom Description',
        includeMetadata: false,
        includeLegend: false,
        includeStatistics: false
      });
      
      expect(html).toContain('Custom Title');
      expect(html).toContain('Custom Description');
      expect(html).not.toContain('Экспортировано:');
      expect(html).not.toContain('Статистика компонентов');
      expect(html).not.toContain('Легенда');
    });

    it('should handle matrix mode', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, true);
      const html = exporter.exportToHTML({
        title: 'Matrix Export'
      });
      
      expect(html).toContain('Matrix Export');
      expect(html).toContain('<svg');
    });

    it('should handle empty components array', () => {
      const exporter = new TreeExporter([], [], false);
      const html = exporter.exportToHTML();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<svg');
    });
  });

  describe('downloadHTML', () => {
    it('should trigger download with default options', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      
      exporter.downloadHTML();
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should trigger download with custom options', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      
      exporter.downloadHTML({
        title: 'Custom Export',
        includeStatistics: false
      });
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('private methods', () => {
    it('should generate correct node colors', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      
      // Access private method through any type casting for testing
      const getNodeColor = (exporter as any).getNodeColor.bind(exporter);
      
      const applicationNode = { id: 'app-1', type: 'application' } as any;
      const libraryNode = { id: 'lib-1', type: 'library' } as any;
      const dependencyNode = { id: 'dep-1', type: 'dependency' } as any;
      
      expect(getNodeColor(applicationNode)).toContain('16, 185, 129');
      expect(getNodeColor(libraryNode)).toContain('59, 130, 246');
      expect(getNodeColor(dependencyNode)).toContain('249, 115, 22');
    });

    it('should generate correct risk colors', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      
      const getRiskColor = (exporter as any).getRiskColor.bind(exporter);
      
      expect(getRiskColor('high')).toBe('#EF4444');
      expect(getRiskColor('medium')).toBe('#F59E0B');
      expect(getRiskColor('low')).toBe('#10B981');
      expect(getRiskColor('unknown')).toBe('#10B981');
    });
  });

  describe('statistics generation', () => {
    it('should include correct statistics in HTML', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      const html = exporter.exportToHTML({ includeStatistics: true });
      
      expect(html).toContain('Статистика компонентов');
      expect(html).toContain('Всего компонентов: 4');
      expect(html).toContain('Приложения: 1');
      expect(html).toContain('Библиотеки: 2');
      expect(html).toContain('Зависимости: 1');
      expect(html).toContain('Высокий риск: 1');
      expect(html).toContain('Средний риск: 1');
      expect(html).toContain('Низкий риск: 2');
    });
  });

  describe('legend generation', () => {
    it('should include correct legend in HTML', () => {
      const exporter = new TreeExporter(mockComponents, mockFilteredComponents, false);
      const html = exporter.exportToHTML({ includeLegend: true });
      
      expect(html).toContain('Легенда');
      expect(html).toContain('Типы компонентов');
      expect(html).toContain('Приложение');
      expect(html).toContain('Библиотека');
      expect(html).toContain('Зависимость');
      expect(html).toContain('Уровни риска');
      expect(html).toContain('Видимость');
    });
  });
});

