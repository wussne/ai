import {ChevronDown, Clock3, Database, Globe2} from 'lucide-react';

import type {AuditLogItem} from '../../features/audit/audit.types';
import {
  describeAuditLog,
  displayAuditValue,
  ENTITY_LABELS,
} from '../../features/audit/auditPresentation';

const PRIMARY_ENTITIES = [
  'authentication', 'process_audits', 'organizations', 'users',
  'organization_memberships', 'departments', 'positions', 'responsibilities',
  'business_functions', 'roles', 'regulations', 'regulation_versions',
];

const getPrimaryItem = (items: AuditLogItem[]): AuditLogItem => {
  for (const entity of PRIMARY_ENTITIES) {
    const item = items.find((candidate) => candidate.entityType === entity);
    if (item) return item;
  }
  return items[0]!;
};

function ChangeValue({value}: {value: unknown}) {
  if (typeof value === 'object' && value !== null && ('before' in value || 'after' in value)) {
    return (
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Было</span>
          <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-slate-600">
            {displayAuditValue((value as {before?: unknown}).before)}
          </pre>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Стало</span>
          <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-slate-800">
            {displayAuditValue((value as {after?: unknown}).after)}
          </pre>
        </div>
      </div>
    );
  }
  return <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">{displayAuditValue(value)}</pre>;
}

function ChangeBlock({item}: {key?: string; item: AuditLogItem}) {
  const entries = Object.entries(item.changes);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-700">{describeAuditLog(item)}</p>
        {item.entityId ? <span className="font-mono text-[10px] text-slate-400">#{item.entityId}</span> : null}
      </div>
      <div className="space-y-2">
        {entries.length ? entries.map(([key, value]) => (
          <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="mb-1 font-mono text-[10px] font-bold text-slate-500">{key}</p>
            <ChangeValue value={value} />
          </div>
        )) : <p className="text-xs text-slate-400">Дополнительных данных нет</p>}
      </div>
    </section>
  );
}

export function AuditLogEntry({items}: {key?: string; items: AuditLogItem[]}) {
  const primary = getPrimaryItem(items);
  const accent = primary.action === 'delete'
    ? 'bg-red-50 text-red-600'
    : primary.action === 'update'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-blue-50 text-blue-700';

  return (
    <article className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Database className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">{describeAuditLog(primary)}</h3>
            {items.length > 1 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {items.length} связанных изменений
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{primary.actorName}</span>
            {primary.actorEmail ? <span>{primary.actorEmail}</span> : null}
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {new Intl.DateTimeFormat('ru-RU', {dateStyle: 'medium', timeStyle: 'medium'}).format(new Date(primary.createdAt))}
            </span>
            <span className="flex items-center gap-1">
              <Globe2 className="h-3.5 w-3.5" />
              {String(primary.metadata.method ?? 'DB')}
            </span>
          </div>

          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-blue-700">
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              Показать полную детализацию
            </summary>
            <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                {items.map((item) => <ChangeBlock key={item.id} item={item} />)}
              </div>
              <dl className="space-y-3 text-xs">
                <div><dt className="font-bold text-slate-400">Запрос</dt><dd className="mt-0.5 break-all font-mono text-slate-600">{String(primary.metadata.method ?? '—')} {String(primary.metadata.path ?? '')}</dd></div>
                <div><dt className="font-bold text-slate-400">IP-адрес</dt><dd className="mt-0.5 text-slate-600">{String(primary.metadata.ip ?? '—')}</dd></div>
                <div><dt className="font-bold text-slate-400">Источник</dt><dd className="mt-0.5 text-slate-600">{String(primary.metadata.source ?? 'database')}</dd></div>
                <div><dt className="font-bold text-slate-400">Клиент</dt><dd className="mt-0.5 break-words text-[10px] text-slate-500">{String(primary.metadata.userAgent ?? '—')}</dd></div>
                {primary.requestId ? <div><dt className="font-bold text-slate-400">Request ID</dt><dd className="mt-0.5 break-all font-mono text-[10px] text-slate-500">{primary.requestId}</dd></div> : null}
              </dl>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
