import {useMemo, useState} from 'react';
import {Filter, LoaderCircle, Search, ShieldCheck} from 'lucide-react';

import {getAuditLogs} from '../../features/audit/auditApi';
import type {AuditLogItem} from '../../features/audit/audit.types';
import {describeAuditLog, ENTITY_LABELS} from '../../features/audit/auditPresentation';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {AuditLogEntry} from './AuditLogEntry';
import {EmptyState, ManagementError, ManagementLoading} from './ManagementStates';

interface AuditLogGroup {
  id: string;
  items: AuditLogItem[];
}

const groupAuditLogs = (items: AuditLogItem[]): AuditLogGroup[] => {
  const groups = new Map<string, AuditLogGroup>();
  for (const item of items) {
    const id = item.requestId ?? `log:${item.id}`;
    const group = groups.get(id);
    if (group) group.items.push(item);
    else groups.set(id, {id, items: [item]});
  }
  return [...groups.values()];
};

export function AuditLogPanel({slug}: {slug: string}) {
  const resource = useAsyncResource(() => getAuditLogs(slug), [slug]);
  const [additional, setAdditional] = useState<AuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('all');

  const baseItems = resource.data?.items ?? [];
  const cursor = nextCursor === undefined ? resource.data?.nextCursor ?? null : nextCursor;
  const items = useMemo(() => [...baseItems, ...additional], [baseItems, additional]);
  const entities = useMemo(
    () => [...new Set(items.map((item) => item.entityType))].sort(),
    [items],
  );
  const groups = useMemo(() => groupAuditLogs(items), [items]);
  const filtered = groups.filter((group) => {
    const matchesEntity = entity === 'all' || group.items.some((item) => item.entityType === entity);
    const haystack = group.items.map((item) => (
      `${item.actorName} ${item.actorEmail ?? ''} ${describeAuditLog(item)} ${item.entityId ?? ''}`
    )).join(' ').toLowerCase();
    return matchesEntity && haystack.includes(query.toLowerCase());
  });

  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) {
    return <ManagementError message={resource.error || 'Не удалось загрузить журнал'} onRetry={resource.reload} />;
  }

  const loadMore = async () => {
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      const page = await getAuditLogs(slug, cursor);
      setAdditional((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-700" />
          <h2 className="font-bold">Журнал действий</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">Неизменяемая история действий владельцев, сотрудников и системных операций</p>
      </div>
      <div className="b2b-card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="b2b-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пользователь, действие или ID" />
          </label>
          <label className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select className="b2b-input appearance-none pl-9" value={entity} onChange={(event) => setEntity(event.target.value)}>
              <option value="all">Все типы данных</option>
              {entities.map((type) => <option key={type} value={type}>{ENTITY_LABELS[type] ?? type}</option>)}
            </select>
          </label>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length ? filtered.map((group) => (
            <AuditLogEntry key={group.id} items={group.items} />
          )) : (
            <div className="p-5">
              <EmptyState title="Записей не найдено" description={query || entity !== 'all' ? 'Измените фильтры.' : 'Действия появятся после первого изменения.'} />
            </div>
          )}
        </div>
        {cursor ? (
          <div className="flex justify-center border-t border-slate-100 p-4">
            <button className="b2b-button-secondary" disabled={isLoadingMore} onClick={() => void loadMore()}>
              {isLoadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Загрузить ещё
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
