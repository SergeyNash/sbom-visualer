import { SBOMComponent } from '../types/sbom';

export const mergeSBOMs = (sboms: SBOMComponent[][]): SBOMComponent[] => {
  const mergedComponents = new Map<string, SBOMComponent>();
  const seenIds = new Set<string>();

  sboms.forEach((sbomComponents, sbomIndex) => {
    sbomComponents.forEach(component => {
      const uniqueKey = `${component.name}@${component.version}`;

      if (!mergedComponents.has(uniqueKey)) {
        const newId = seenIds.has(component.id)
          ? `${component.id}-${sbomIndex}`
          : component.id;

        seenIds.add(newId);

        mergedComponents.set(uniqueKey, {
          ...component,
          id: newId,
          dependencies: [...component.dependencies]
        });
      } else {
        const existing = mergedComponents.get(uniqueKey)!;

        const newDependencies = new Set([
          ...existing.dependencies,
          ...component.dependencies
        ]);

        existing.dependencies = Array.from(newDependencies);

        existing.cveCount = Math.max(existing.cveCount, component.cveCount);

        if (component.riskLevel === 'high' ||
            (component.riskLevel === 'medium' && existing.riskLevel === 'low')) {
          existing.riskLevel = component.riskLevel;
        }

        if (existing.description === `${existing.type} component` &&
            component.description &&
            component.description !== `${component.type} component`) {
          existing.description = component.description;
        }
      }
    });
  });

  return Array.from(mergedComponents.values());
};

export const deduplicateComponents = (components: SBOMComponent[]): SBOMComponent[] => {
  const seen = new Map<string, SBOMComponent>();

  components.forEach(component => {
    const key = `${component.name}@${component.version}`;

    if (!seen.has(key)) {
      seen.set(key, component);
    } else {
      const existing = seen.get(key)!;
      const merged = mergeSBOMs([[existing], [component]])[0];
      seen.set(key, merged);
    }
  });

  return Array.from(seen.values());
};
