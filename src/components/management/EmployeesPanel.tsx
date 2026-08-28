import {useMemo, useState, type FormEvent} from 'react';
import {Crown, KeyRound, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {EmployeeInput, EmployeeItem} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementDialog} from './ManagementDialog';
import {EmptyState, ManagementError, ManagementLoading} from './ManagementStates';
import {MultiSelect} from './MultiSelect';

interface EmployeesPanelProps {
  slug: string;
  actorMembershipId: string;
  isOwner: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageRoles: boolean;
}

const createPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
};

export function EmployeesPanel(props: EmployeesPanelProps) {
  const {slug, actorMembershipId, isOwner, canCreate, canEdit, canDelete, canManageRoles} = props;
  const resource = useAsyncResource(async () => {
    const [employees, context] = await Promise.all([managementApi.employees(slug), managementApi.employeeContext(slug)]);
    return {employees: employees.employees, context};
  }, [slug]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EmployeeItem | 'new' | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [responsibilityIds, setResponsibilityIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [employeeIsOwner, setEmployeeIsOwner] = useState(false);
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const maps = useMemo(() => {
    const context = resource.data?.context;
    return {
      departments: new Map(context?.departments.map((item) => [item.id, item.name])),
      positions: new Map(context?.positions.map((item) => [item.id, item.name])),
      roles: new Map(context?.roles.map((item) => [item.id, item.name])),
    };
  }, [resource.data]);

  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) return <ManagementError message={resource.error || 'Не удалось загрузить сотрудников'} onRetry={resource.reload} />;
  const filtered = resource.data.employees.filter((employee) => `${employee.fullName} ${employee.email}`.toLowerCase().includes(query.toLowerCase()));

  const open = (employee: EmployeeItem | 'new') => {
    setEditing(employee); setRoleIds(employee === 'new' ? [] : employee.roleIds); setResponsibilityIds(employee === 'new' ? [] : employee.responsibilityIds);
    setIsActive(employee === 'new' ? true : employee.isActive); setEmployeeIsOwner(employee === 'new' ? false : employee.isOwner); setPassword(''); setError('');
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setIsSaving(true); setError('');
    const input: EmployeeInput = {
      fullName: String(data.get('fullName')), email: String(data.get('email')), password: password || undefined,
      departmentId: String(data.get('departmentId')) || null, positionId: String(data.get('positionId')) || null,
      roleIds, responsibilityIds, isActive, isOwner: employeeIsOwner,
    };
    try {
      if (editing === 'new') await managementApi.createEmployee(slug, input);
      else if (editing) await managementApi.updateEmployee(slug, editing.membershipId, input);
      setEditing(null); await resource.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить сотрудника'); }
    finally { setIsSaving(false); }
  };
  const remove = async (employee: EmployeeItem) => {
    if (!confirm(`Отозвать доступ сотруднику «${employee.fullName}»? Учётная запись и история останутся в базе.`)) return;
    try { await managementApi.deleteEmployee(slug, employee.membershipId); await resource.reload(); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'Не удалось удалить сотрудника'); }
  };
  const current = editing === 'new' ? null : editing;
  const context = resource.data.context;

  return <div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">Сотрудники</h2><p className="mt-1 text-xs text-slate-400">Учётные записи, рабочее место, роли и персональные обязанности</p></div>{canCreate ? <button className="b2b-button-primary" onClick={() => open('new')}><Plus className="h-4 w-4" />Добавить сотрудника</button> : null}</div>
    <div className="b2b-card overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4"><label className="relative block w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9" placeholder="Имя или email" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="whitespace-nowrap text-xs font-semibold text-slate-400">{filtered.length} сотрудников</span></div>
      <div className="divide-y divide-slate-100">{filtered.length ? filtered.map((employee) => {
        const roleNames = employee.roleIds.map((id) => maps.roles.get(id)).filter(Boolean).join(', ');
        return <div key={employee.membershipId} className={`group flex items-center gap-4 px-5 py-4 ${employee.isActive ? '' : 'bg-slate-50 opacity-65'}`}><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">{employee.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-slate-800">{employee.fullName}</p>{employee.isOwner ? <span title="Владелец"><Crown className="h-3.5 w-3.5 text-amber-500" /></span> : null}{!employee.isActive ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Доступ закрыт</span> : null}</div><p className="mt-0.5 truncate text-xs text-slate-400">{maps.positions.get(employee.positionId ?? '') || 'Без должности'} · {maps.departments.get(employee.departmentId ?? '') || 'Без отдела'}</p></div><div className="hidden max-w-52 text-right lg:block"><p className="truncate text-xs font-semibold text-slate-600">{roleNames || 'Без роли'}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{employee.email}</p></div>{canEdit || canDelete ? <div className="flex">{canEdit ? <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => open(employee)} aria-label="Изменить сотрудника"><Pencil className="h-4 w-4" /></button> : null}{canDelete && employee.membershipId !== actorMembershipId ? <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(employee)} aria-label="Удалить доступ"><Trash2 className="h-4 w-4" /></button> : null}</div> : null}</div>;
      }) : <div className="p-5"><EmptyState title="Сотрудники не найдены" description={query ? 'Измените запрос.' : 'Добавьте первого сотрудника компании.'} /></div>}</div>
    </div>
    {editing ? <ManagementDialog title={current ? `Сотрудник: ${current.fullName}` : 'Новый сотрудник'} description={current ? 'Изменения доступа применяются сразу после сохранения.' : 'Создаётся новая учётная запись с доступом к этой компании.'} isSaving={isSaving} error={error} onClose={() => setEditing(null)} onSubmit={(event) => void save(event)}>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="b2b-label">Имя и фамилия</span><div className="relative"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className="b2b-input pl-9" name="fullName" defaultValue={current?.fullName} required maxLength={255} /></div></label><label className="block"><span className="b2b-label">Email</span><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9" name="email" type="email" defaultValue={current?.email} required maxLength={254} /></div></label></div>
      <label className="block"><span className="b2b-label">{current ? 'Новый пароль — необязательно' : 'Временный пароль'}</span><div className="flex gap-2"><div className="relative flex-1"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="b2b-input pl-9 font-mono" value={password} onChange={(event) => setPassword(event.target.value)} required={!current} minLength={12} maxLength={256} autoComplete="new-password" /></div><button type="button" className="b2b-button-secondary whitespace-nowrap" onClick={() => setPassword(createPassword())}>Создать пароль</button></div><span className="mt-1 block text-xs text-slate-400">Минимум 12 символов. Передайте пароль сотруднику безопасным каналом.</span></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="b2b-label">Отдел</span><select className="b2b-input" name="departmentId" defaultValue={current?.departmentId ?? ''}><option value="">Не назначен</option>{context.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block"><span className="b2b-label">Должность</span><select className="b2b-input" name="positionId" defaultValue={current?.positionId ?? ''}><option value="">Не назначена</option>{context.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="grid gap-4 md:grid-cols-2"><MultiSelect label="Роли доступа" items={context.roles} value={roleIds} onChange={setRoleIds} disabled={!canManageRoles} /><MultiSelect label="Персональные обязанности" items={context.responsibilities} value={responsibilityIds} onChange={setResponsibilityIds} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" className="h-4 w-4 accent-slate-900" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={current?.membershipId === actorMembershipId} /><span><span className="block text-sm font-bold text-slate-700">Активный доступ</span><span className="block text-xs text-slate-400">Можно входить в компанию</span></span></label><label className={`flex items-center gap-3 rounded-xl border border-slate-200 p-4 ${isOwner ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}><input type="checkbox" className="h-4 w-4 accent-amber-500" checked={employeeIsOwner} onChange={(event) => setEmployeeIsOwner(event.target.checked)} disabled={!isOwner} /><span><span className="flex items-center gap-1.5 text-sm font-bold text-slate-700"><ShieldCheck className="h-4 w-4 text-amber-500" />Владелец</span><span className="block text-xs text-slate-400">Полный доступ вне ролей</span></span></label></div>
    </ManagementDialog> : null}
  </div>;
}
