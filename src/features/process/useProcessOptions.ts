import {useMemo} from 'react';

import {useAsyncResource} from '../../hooks/useAsyncResource';
import {processApi, type ProcessDepartmentOption} from './processApi';

export function useProcessOptions(slug: string) {
  const resource = useAsyncResource(() => processApi.options(slug), [slug]);
  const departments = useMemo(() => {
    const items = resource.data?.departments ?? [];
    const byId = new Map<string, ProcessDepartmentOption>(
      items.map((item) => [item.id, item]),
    );
    const labelFor = (id: string): string => {
      const path: string[] = [];
      const visited = new Set<string>();
      let current = byId.get(id);
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        path.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return path.join(' → ');
    };
    return items.map((item) => ({...item, label: labelFor(item.id)}));
  }, [resource.data]);

  return {
    departments,
    positions: resource.data?.positions ?? [],
    isLoading: resource.isLoading,
    error: resource.error,
    reload: resource.reload,
  };
}
