import {useState, type FormEvent} from 'react';
import {BriefcaseBusiness, Pencil, Plus, Search, Trash2} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {DirectoryItem, PositionItem, ResponsibilityItem} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementDialog} from './ManagementDialog';
import {ManagementError, ManagementLoading, EmptyState} from './ManagementStates';
import {MultiSelect} from './MultiSelect';

interface CatalogConfig {
  path: 'positions' | 'responsibilities' | 'functions';
  title: string;
  description: string;
  itemName: string;
  relationLabel?: string;
}

const CONFIG: Record<CatalogConfig['path'], CatalogConfig> = {
  positions: {path: 'positions', title: 'Должности', description: 'Рабочие позиции и закреплённые за ними обязанности', itemName: 'должность', relationLabel: 'Обязанности должности'},
  responsibilities: {path: 'responsibilities', title: 'Обязанности', description: 'Зоны ответственности и связанные бизнес-функции', itemName: 'обязанность', relationLabel: 'Бизнес-функции'},
  functions: {path: 'functions', title: 'Бизнес-функции', description: 'Предметные области, связывающие обязанности и регламенты', itemName: 'бизнес-функцию'},
};

const getRelations = (item: DirectoryItem): string[] => 'responsibilityIds' in item ? (item as PositionItem).responsibilityIds : 'functionIds' in item ? (item as ResponsibilityItem).functionIds : [];

export function CatalogPanel({slug, path, canManage}: {slug: string; path: CatalogConfig['path']; canManage: boolean}) {
  const config = CONFIG[path];
  const resource = useAsyncResource(async () => {
    if (path === 'positions') {
      const [items, relations] = await Promise.all([managementApi.positions(slug), managementApi.responsibilities(slug)]);
      return {items: items.items as DirectoryItem[], relations: relations.items as DirectoryItem[]};
    }
    if (path === 'responsibilities') {
      const [items, relations] = await Promise.all([managementApi.responsibilities(slug), managementApi.functions(slug)]);
      return {items: items.items as DirectoryItem[], relations: relations.items};
    }
    const items = await managementApi.functions(slug); return {items: items.items, relations: []};
  }, [slug, path]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DirectoryItem | 'new' | null>(null);
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) return <ManagementError message={resource.error || 'Не удалось загрузить справочник'} onRetry={resource.reload} />;
  const filtered = resource.data.items.filter((item) => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const open = (item: DirectoryItem | 'new') => { setEditing(item); setRelationIds(item === 'new' ? [] : getRelations(item)); setError(''); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setIsSaving(true); setError('');
    try {
      const body: Record<string, unknown> = {name: String(data.get('name')), description: String(data.get('description')) || null};
      if (path === 'positions') body.responsibilityIds = relationIds;
      if (path === 'responsibilities') body.functionIds = relationIds;
      await managementApi.saveDirectory(slug, path, editing === 'new' ? null : editing?.id ?? null, body);
      setEditing(null); await resource.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Не удалось сохранить ${config.itemName}`); }
    finally { setIsSaving(false); }
  };
  const remove = async (item: DirectoryItem) => {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    try { await managementApi.deleteDirectory(slug, path, item.id); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось удалить запись'); }
  };
  const current = editing === 'new' ? null : editing;

  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">{config.title}</h2><p className="mt-1 text-xs text-slate-400">{config.description}</p></div>{canManage ? <button className="b2b-button-primary" onClick={() => open('new')}><Plus className="h-4 w-4" />Добавить</button> : null}</div>
    <div className="b2b-card overflow-hidden"><div className="border-b border-slate-100 p-4"><label className="relative block max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по справочнику" /></label></div>
      <div className="divide-y divide-slate-100">{filtered.length ? filtered.map((item) => <div key={item.id} className="group flex items-center gap-4 px-5 py-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><BriefcaseBusiness className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{item.name}</p><p className="mt-0.5 truncate text-xs text-slate-400">{item.description || 'Без описания'}{getRelations(item).length ? ` · Связей: ${getRelations(item).length}` : ''}</p></div>{canManage ? <div className="flex"><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => open(item)} aria-label="Изменить"><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(item)} aria-label="Удалить"><Trash2 className="h-4 w-4" /></button></div> : null}</div>) : <div className="p-5"><EmptyState title="Ничего не найдено" description={query ? 'Измените поисковый запрос.' : `Добавьте первую запись в справочник «${config.title}».`} /></div>}</div>
    </div>
    {editing ? <ManagementDialog title={current ? `Редактировать: ${current.name}` : `Добавить ${config.itemName}`} isSaving={isSaving} error={error} onClose={() => setEditing(null)} onSubmit={(event) => void save(event)}><label className="block"><span className="b2b-label">Название</span><input autoFocus className="b2b-input" name="name" defaultValue={current?.name} required maxLength={255} /></label><label className="block"><span className="b2b-label">Описание</span><textarea className="b2b-input min-h-24 resize-y" name="description" defaultValue={current?.description ?? ''} maxLength={4000} /></label>{config.relationLabel ? <MultiSelect label={config.relationLabel} items={resource.data.relations} value={relationIds} onChange={setRelationIds} /> : null}</ManagementDialog> : null}
  </div>;
}
