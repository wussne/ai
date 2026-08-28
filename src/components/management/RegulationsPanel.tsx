import {useState, type FormEvent} from 'react';
import {Archive, BadgeCheck, BookOpenCheck, FilePlus2, Pencil, Search, Trash2} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {
  RegulationAccessLevel, RegulationFunctionLink, RegulationInput, RegulationItem,
} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementDialog} from './ManagementDialog';
import {EmptyState, ManagementError, ManagementLoading} from './ManagementStates';

const STATUS = {
  draft: {label: 'Черновик', className: 'bg-slate-100 text-slate-600'},
  review: {label: 'На согласовании', className: 'bg-amber-50 text-amber-700'},
  approved: {label: 'Утверждён', className: 'bg-emerald-50 text-emerald-700'},
  archived: {label: 'Архив', className: 'bg-slate-200 text-slate-500'},
} as const;

const ACCESS_LEVELS: {value: RegulationAccessLevel; label: string}[] = [
  {value: 'view', label: 'Просмотр'}, {value: 'edit', label: 'Редактирование'},
  {value: 'approve', label: 'Согласование'}, {value: 'manage', label: 'Полное управление'},
];

interface RegulationsPanelProps {
  slug: string; canCreate: boolean; canEdit: boolean; canApprove: boolean; canArchive: boolean; canDelete: boolean;
}

export function RegulationsPanel({slug, canCreate, canEdit, canApprove, canArchive, canDelete}: RegulationsPanelProps) {
  const resource = useAsyncResource(() => managementApi.regulations(slug), [slug]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RegulationItem | 'new' | null>(null);
  const [links, setLinks] = useState<RegulationFunctionLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) return <ManagementError message={resource.error || 'Не удалось загрузить регламенты'} onRetry={resource.reload} />;
  const filtered = resource.data.regulations.filter((item) => `${item.title} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const open = (item: RegulationItem | 'new') => { setEditing(item); setLinks(item === 'new' ? [] : item.functionLinks); setError(''); };
  const toggleFunction = (functionId: string, checked: boolean) => setLinks((current) => checked ? [...current, {functionId, accessLevel: 'view'}] : current.filter((link) => link.functionId !== functionId));
  const updateAccess = (functionId: string, accessLevel: RegulationAccessLevel) => setLinks((current) => current.map((link) => link.functionId === functionId ? {...link, accessLevel} : link));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setIsSaving(true); setError('');
    const input: RegulationInput = {
      title: String(data.get('title')), description: String(data.get('description')) || null,
      content: String(data.get('content')), changeDescription: String(data.get('changeDescription')) || null,
      status: data.get('status') === 'review' ? 'review' : 'draft', functionLinks: links,
      expectedVersion: editing !== 'new' && editing ? editing.versionNumber : undefined,
    };
    try {
      if (editing === 'new') await managementApi.createRegulation(slug, input);
      else if (editing) await managementApi.updateRegulation(slug, editing.id, input);
      setEditing(null); await resource.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить регламент'); }
    finally { setIsSaving(false); }
  };
  const workflow = async (item: RegulationItem, action: 'approve' | 'archive') => {
    const verb = action === 'approve' ? 'утвердить' : 'перенести в архив';
    if (!confirm(`${verb[0]!.toUpperCase()}${verb.slice(1)} регламент «${item.title}»?`)) return;
    try { if (action === 'approve') await managementApi.approveRegulation(slug, item.id); else await managementApi.archiveRegulation(slug, item.id); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось изменить статус'); }
  };
  const remove = async (item: RegulationItem) => {
    if (!confirm(`Удалить регламент «${item.title}» вместе со всеми версиями?`)) return;
    try { await managementApi.deleteRegulation(slug, item.id); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось удалить регламент'); }
  };
  const current = editing === 'new' ? null : editing;

  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">Регламенты</h2><p className="mt-1 text-xs text-slate-400">Версии, согласование и доступ по бизнес-функциям</p></div>{canCreate ? <button className="b2b-button-primary" onClick={() => open('new')}><FilePlus2 className="h-4 w-4" />Новый регламент</button> : null}</div>
    <div className="b2b-card overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4"><label className="relative block w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти регламент" /></label><span className="text-xs font-semibold text-slate-400">{filtered.length} документов</span></div><div className="divide-y divide-slate-100">{filtered.length ? filtered.map((item) => <article key={item.id} className="group flex items-center gap-4 px-5 py-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpenCheck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-slate-800">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[item.status].className}`}>{STATUS[item.status].label}</span></div><p className="mt-1 truncate text-xs text-slate-400">Версия {item.versionNumber} · {item.functionLinks.length ? `Бизнес-функций: ${item.functionLinks.length}` : 'Без привязки к функциям'} · обновлён {new Intl.DateTimeFormat('ru-RU').format(new Date(item.updatedAt))}</p></div><div className="flex">{canEdit && (item.status === 'draft' || item.status === 'review') ? <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => open(item)} title="Редактировать"><Pencil className="h-4 w-4" /></button> : null}{canApprove && item.status === 'review' ? <button className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => void workflow(item, 'approve')} title="Утвердить"><BadgeCheck className="h-4 w-4" /></button> : null}{canArchive && item.status !== 'archived' ? <button className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700" onClick={() => void workflow(item, 'archive')} title="В архив"><Archive className="h-4 w-4" /></button> : null}{canDelete ? <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(item)} title="Удалить"><Trash2 className="h-4 w-4" /></button> : null}</div></article>) : <div className="p-5"><EmptyState title="Регламентов пока нет" description={query ? 'Измените поисковый запрос.' : 'Создайте первый документ и отправьте его на согласование.'} /></div>}</div></div>
    {editing ? <ManagementDialog title={current ? `Регламент · версия ${current.versionNumber}` : 'Новый регламент'} description="Изменение текста создаёт новую версию; карточка и связи обновляются без лишней версии." isSaving={isSaving} error={error} onClose={() => setEditing(null)} onSubmit={(event) => void save(event)}><div className="grid gap-4 sm:grid-cols-[1fr_180px]"><label className="block"><span className="b2b-label">Название</span><input autoFocus className="b2b-input" name="title" defaultValue={current?.title} required maxLength={255} /></label><label className="block"><span className="b2b-label">Статус</span><select className="b2b-input" name="status" defaultValue={current?.status === 'review' ? 'review' : 'draft'}><option value="draft">Черновик</option><option value="review">На согласовании</option></select></label></div><label className="block"><span className="b2b-label">Краткое описание</span><input className="b2b-input" name="description" defaultValue={current?.description ?? ''} maxLength={4000} /></label><label className="block"><span className="b2b-label">Текст регламента</span><textarea className="b2b-input min-h-56 resize-y font-mono leading-relaxed" name="content" defaultValue={current?.content ?? ''} required maxLength={200000} /></label><label className="block"><span className="b2b-label">Что изменилось</span><input className="b2b-input" name="changeDescription" defaultValue="" placeholder={current ? 'Например: уточнены сроки согласования' : 'Например: первоначальная версия'} maxLength={4000} /></label><fieldset><legend className="b2b-label">Доступ по бизнес-функциям</legend><div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">{resource.data.functions.length ? resource.data.functions.map((item) => {const link = links.find((candidate) => candidate.functionId === item.id); return <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-slate-900" checked={Boolean(link)} onChange={(event) => toggleFunction(item.id, event.target.checked)} /><span className="truncate text-sm font-semibold text-slate-700">{item.name}</span></label>{link ? <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none" value={link.accessLevel} onChange={(event) => updateAccess(item.id, event.target.value as RegulationAccessLevel)}>{ACCESS_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select> : null}</div>;}) : <p className="px-3 py-5 text-center text-xs text-slate-400">Сначала добавьте бизнес-функции</p>}</div></fieldset></ManagementDialog> : null}
  </div>;
}
