import { SBOMComponent, SBOMFile } from '../types/sbom';

export const parseSBOMFile = (sbomData: SBOMFile): SBOMComponent[] => {
  const components: SBOMComponent[] = [];
  
  if (!sbomData.components) {
    throw new Error('Invalid SBOM file: missing components');
  }

  // Create a map of dependencies
  const dependencyMap = new Map<string, string[]>();
  if (sbomData.dependencies) {
    sbomData.dependencies.forEach(dep => {
      dependencyMap.set(dep.ref, dep.dependsOn || []);
    });
  }

  sbomData.components.forEach(component => {
    const license = component.licenses?.[0]?.license?.id || 
                   component.licenses?.[0]?.license?.name || 
                   'Unknown';
    
    // Determine component type
    let type: SBOMComponent['type'] = 'library';
    if (component.type === 'application') {
      type = 'application';
    } else if (component.type === 'library') {
      type = 'library';
    } else {
      type = 'dependency';
    }

    // Simple risk assessment based on license and type
    let riskLevel: SBOMComponent['riskLevel'] = 'low';
    if (license.includes('GPL') || license === 'Unknown') {
      riskLevel = 'medium';
    }
    if (component.name.toLowerCase().includes('deprecated') || 
        component.version.includes('alpha') || 
        component.version.includes('beta')) {
      riskLevel = 'high';
    }

    // Mock CVE count (in real implementation, this would come from vulnerability database)
    const cveCount = Math.floor(Math.random() * 3);

    components.push({
      id: component['bom-ref'] || component.name,
      name: component.name,
      type,
      license,
      version: component.version,
      riskLevel,
      cveCount,
      dependencies: dependencyMap.get(component['bom-ref'] || component.name) || [],
      description: component.description || `${type} component`
    });
  });

  return components;
};

export const validateSBOMFile = (data: any): boolean => {
  try {
    return (
      data &&
      typeof data === 'object' &&
      data.bomFormat &&
      data.components &&
      Array.isArray(data.components)
    );
  } catch {
    return false;
  }
};