import {useMemo, useState, type FormEvent} from 'react';
import {KeyRound, Pencil, Plus, Search, Shield, Trash2} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {PermissionItem, RoleItem} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementDialog} from './ManagementDialog';
import {EmptyState, ManagementError, ManagementLoading} from './ManagementStates';

const DOMAIN_NAMES: Record<string, string> = {
  company: 'Компания', employee: 'Сотрудники', department: 'Отделы', position: 'Должности',
  responsibility: 'Обязанности', business_function: 'Бизнес-функции', role: 'Роли', permission: 'Разрешения', regulation: 'Регламенты',
};

function PermissionMatrix({permissions, selected, onChange, disabled}: {
  permissions: PermissionItem[]; selected: string[]; onChange: (ids: string[]) => void; disabled: boolean;
}) {
  const groups = useMemo(() => {
    const next = new Map<string, PermissionItem[]>();
    permissions.forEach((permission) => {
      const domain = permission.code.split('.')[0]!;
      next.set(domain, [...(next.get(domain) ?? []), permission]);
    });
    return [...next.entries()];
  }, [permissions]);
  const selection = new Set(selected);
  return <fieldset><legend className="b2b-label">Матрица разрешений</legend><div className="space-y-3">{groups.map(([domain, items]) => <div key={domain} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{DOMAIN_NAMES[domain] || domain}</p><span className="text-[10px] font-semibold text-slate-400">{items.filter((item) => selection.has(item.id)).length}/{items.length}</span></div><div className="grid gap-2 sm:grid-cols-2">{items.map((permission) => <label key={permission.id} className={`flex items-start gap-2.5 rounded-lg p-2 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}><input className="mt-0.5 h-4 w-4 accent-slate-900" type="checkbox" checked={selection.has(permission.id)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, permission.id] : selected.filter((id) => id !== permission.id))} /><span><span className="block text-xs font-bold text-slate-700">{permission.name}</span><span className="block font-mono text-[10px] text-slate-400">{permission.code}</span></span></label>)}</div></div>)}</div></fieldset>;
}

export function RolesPanel({slug, canManage, canViewRoles, canViewPermissions}: {slug: string; canManage: boolean; canViewRoles: boolean; canViewPermissions: boolean}) {
  const resource = useAsyncResource(async () => {
    const [roles, permissions] = await Promise.all([
      canViewRoles ? managementApi.roles(slug) : Promise.resolve({roles: [] as RoleItem[]}),
      canViewPermissions || canManage ? managementApi.permissions(slug) : Promise.resolve({permissions: [] as PermissionItem[]}),
    ]);
    return {roles: roles.roles, permissions: permissions.permissions};
  }, [slug, canViewRoles, canViewPermissions, canManage]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RoleItem | 'new' | null>(null);
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) return <ManagementError message={resource.error || 'Не удалось загрузить роли'} onRetry={resource.reload} />;
  const filtered = resource.data.roles.filter((role) => `${role.name} ${role.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const open = (role: RoleItem | 'new') => { setEditing(role); setPermissionIds(role === 'new' ? [] : role.permissionIds); setError(''); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setIsSaving(true); setError('');
    try { await managementApi.saveRole(slug, editing === 'new' ? null : editing?.id ?? null, {name: String(data.get('name')), description: String(data.get('description')) || null, permissionIds}); setEditing(null); await resource.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить роль'); }
    finally { setIsSaving(false); }
  };
  const remove = async (role: RoleItem) => {
    if (!confirm(`Удалить роль «${role.name}»? Она будет снята со всех сотрудников.`)) return;
    try { await managementApi.deleteRole(slug, role.id); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось удалить роль'); }
  };
  const current = editing === 'new' ? null : editing;
  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">Роли и разрешения</h2><p className="mt-1 text-xs text-slate-400">Роль объединяет атомарные права; владельцу роли не требуются</p></div>{canManage ? <button className="b2b-button-primary" onClick={() => open('new')}><Plus className="h-4 w-4" />Добавить роль</button> : null}</div>
    {canViewRoles ? <div className="b2b-card overflow-hidden"><div className="border-b border-slate-100 p-4"><label className="relative block max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти роль" /></label></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.length ? filtered.map((role) => <article key={role.id} className="group rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"><div className="flex items-start gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-700"><Shield className="h-4 w-4" /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-slate-800">{role.name}</h3><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-slate-400">{role.description || 'Без описания'}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><KeyRound className="h-3.5 w-3.5" />{role.permissionIds.length} разрешений</span>{canManage ? <div className="flex"><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => open(role)} aria-label="Изменить роль"><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(role)} aria-label="Удалить роль"><Trash2 className="h-4 w-4" /></button></div> : null}</div></article>) : <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="Роли не найдены" description={query ? 'Измените запрос.' : 'Создайте первую роль и назначьте ей разрешения.'} /></div>}</div></div> : null}
    {canViewPermissions ? <section className="mt-6"><div className="mb-3"><h3 className="text-sm font-bold text-slate-800">Каталог системных разрешений</h3><p className="mt-1 text-xs text-slate-400">Коды неизменяемы; владелец распределяет их между ролями</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{resource.data.permissions.map((permission) => <div key={permission.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-bold text-slate-700">{permission.name}</p><p className="mt-1 font-mono text-[10px] text-blue-700">{permission.code}</p></div>)}</div></section> : null}
    {editing ? <ManagementDialog title={current ? `Роль: ${current.name}` : 'Новая роль'} description="Выберите только те действия, которые действительно нужны этой роли." isSaving={isSaving} error={error} onClose={() => setEditing(null)} onSubmit={(event) => void save(event)}><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="b2b-label">Название</span><input autoFocus className="b2b-input" name="name" defaultValue={current?.name} required maxLength={255} /></label><label className="block"><span className="b2b-label">Описание</span><input className="b2b-input" name="description" defaultValue={current?.description ?? ''} maxLength={4000} /></label></div><PermissionMatrix permissions={resource.data.permissions} selected={permissionIds} onChange={setPermissionIds} disabled={!canManage} /></ManagementDialog> : null}
  </div>;
}
