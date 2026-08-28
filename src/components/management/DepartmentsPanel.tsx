import {useMemo, useState, type FormEvent} from 'react';
import {ChevronRight, GitBranch, Pencil, Plus, Trash2} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {DepartmentItem} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementDialog} from './ManagementDialog';
import {EmptyState, ManagementError, ManagementLoading} from './ManagementStates';

interface DepartmentNode extends DepartmentItem {children: DepartmentNode[]}

const buildTree = (items: DepartmentItem[]): DepartmentNode[] => {
  const nodes = new Map(items.map((item) => [item.id, {...item, children: [] as DepartmentNode[]} ]));
  const roots: DepartmentNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node); else roots.push(node);
  }
  const sort = (entries: DepartmentNode[]) => { entries.sort((a, b) => a.name.localeCompare(b.name, 'ru')); entries.forEach((entry) => sort(entry.children)); };
  sort(roots);
  return roots;
};

function DepartmentTreeNode({node, depth, canManage, onEdit, onDelete}: {
  key?: string; node: DepartmentNode; depth: number; canManage: boolean; onEdit: (item: DepartmentItem) => void; onDelete: (item: DepartmentItem) => void;
}) {
  return (
    <div>
      <div className="group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-white" style={{marginLeft: `${depth * 26}px`}}>
        {depth > 0 ? <span className="absolute -left-4 top-1/2 h-px w-4 bg-slate-200" /> : null}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${depth === 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><GitBranch className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{node.name}</p><p className="truncate text-xs text-slate-400">{node.description || (node.children.length ? `${node.children.length} дочерних подразделений` : 'Без описания')}</p></div>
        {node.children.length ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{node.children.length}</span> : null}
        {canManage ? <div className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => onEdit(node)} aria-label={`Изменить ${node.name}`}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(node)} aria-label={`Удалить ${node.name}`}><Trash2 className="h-4 w-4" /></button></div> : null}
      </div>
      {node.children.length ? <div className="relative ml-[17px] border-l border-slate-200">{node.children.map((child) => <DepartmentTreeNode key={child.id} node={child} depth={depth + 1} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />)}</div> : null}
    </div>
  );
}

export function DepartmentsPanel({slug, canManage}: {slug: string; canManage: boolean}) {
  const resource = useAsyncResource(() => managementApi.departments(slug), [slug]);
  const [editing, setEditing] = useState<DepartmentItem | 'new' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const items = resource.data?.departments ?? [];
  const tree = useMemo(() => buildTree(items), [items]);

  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error) return <ManagementError message={resource.error} onRetry={resource.reload} />;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setIsSaving(true); setError('');
    try {
      await managementApi.saveDepartment(slug, editing === 'new' ? null : editing?.id ?? null, {name: String(data.get('name')), description: String(data.get('description')) || null, parentId: String(data.get('parentId')) || null});
      setEditing(null); await resource.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить отдел'); }
    finally { setIsSaving(false); }
  };
  const remove = async (item: DepartmentItem) => {
    if (!confirm(`Удалить отдел «${item.name}»?`)) return;
    try { await managementApi.deleteDepartment(slug, item.id); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось удалить отдел'); }
  };
  const current = editing === 'new' ? null : editing;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Структура подразделений</h2><p className="mt-1 text-xs text-slate-400">Родительские связи показывают реальную иерархию компании</p></div>{canManage ? <button className="b2b-button-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Добавить отдел</button> : null}</div>
      <div className="b2b-card bg-slate-50/50 p-4">{tree.length ? tree.map((node) => <DepartmentTreeNode key={node.id} node={node} depth={0} canManage={canManage} onEdit={setEditing} onDelete={(item) => void remove(item)} />) : <EmptyState title="Отделов пока нет" description="Добавьте первый отдел, чтобы построить структуру компании." />}</div>
      {editing ? <ManagementDialog title={current ? 'Редактирование отдела' : 'Новый отдел'} description="Отдел можно перемещать внутри дерева без потери сотрудников." isSaving={isSaving} error={error} onClose={() => setEditing(null)} onSubmit={(event) => void save(event)}>
        <label className="block"><span className="b2b-label">Название</span><input autoFocus className="b2b-input" name="name" defaultValue={current?.name} required maxLength={255} /></label>
        <label className="block"><span className="b2b-label">Родительский отдел</span><select className="b2b-input" name="parentId" defaultValue={current?.parentId ?? ''}><option value="">Верхний уровень</option>{items.filter((item) => item.id !== current?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block"><span className="b2b-label">Описание</span><textarea className="b2b-input min-h-24 resize-y" name="description" defaultValue={current?.description ?? ''} maxLength={4000} /></label>
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800"><ChevronRight className="h-4 w-4" />Циклические связи дополнительно блокируются базой и API.</div>
      </ManagementDialog> : null}
    </div>
  );
}
