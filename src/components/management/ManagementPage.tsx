import {useMemo, useState} from 'react';
import {
  BriefcaseBusiness, Building2, FileText, GitBranch, ListChecks, ScrollText, ShieldCheck, UsersRound, Workflow,
} from 'lucide-react';

import type {OrganizationMembership} from '../../features/auth/auth.types';
import type {ManagementArea, PermissionCode} from '../../features/management/management.types';
import {CatalogPanel} from './CatalogPanel';
import {CompanyPanel} from './CompanyPanel';
import {DepartmentsPanel} from './DepartmentsPanel';
import {EmployeesPanel} from './EmployeesPanel';
import {RolesPanel} from './RolesPanel';
import {RegulationsPanel} from './RegulationsPanel';
import {AuditLogPanel} from './AuditLogPanel';

interface ManagementPageProps {
  organization: OrganizationMembership;
  isOwner: boolean;
  can: (code: PermissionCode) => boolean;
  onOrganizationUpdated: (organizationId: string, name: string, slug: string) => void;
}

const AREAS = [
  {id: 'company', label: 'Компания', hint: 'Основные настройки', icon: Building2, permission: 'company.view'},
  {id: 'employees', label: 'Сотрудники', hint: 'Доступ и назначения', icon: UsersRound, permission: 'employee.view'},
  {id: 'departments', label: 'Отделы', hint: 'Дерево структуры', icon: GitBranch, permission: 'department.view'},
  {id: 'positions', label: 'Должности', hint: 'Рабочие позиции', icon: BriefcaseBusiness, permission: 'position.view'},
  {id: 'responsibilities', label: 'Обязанности', hint: 'Зоны ответственности', icon: ListChecks, permission: 'responsibility.view'},
  {id: 'functions', label: 'Бизнес-функции', hint: 'Предметные области', icon: Workflow, permission: 'business_function.view'},
  {id: 'regulations', label: 'Регламенты', hint: 'Версии и согласование', icon: FileText, permission: 'regulation.view'},
  {id: 'roles', label: 'Роли и права', hint: 'Матрица доступа', icon: ShieldCheck, permission: 'role.view'},
  {id: 'logs', label: 'Журнал действий', hint: 'Кто, когда и что', icon: ScrollText, permission: 'log.view'},
] as const satisfies readonly {id: ManagementArea; label: string; hint: string; icon: typeof Building2; permission: PermissionCode}[];

export function ManagementPage({organization, isOwner, can, onOrganizationUpdated}: ManagementPageProps) {
  const visibleAreas = useMemo(
    () => AREAS.filter((area) => area.id === 'roles'
      ? can('role.view') || can('permission.view')
      : can(area.permission)),
    [can],
  );
  const [activeArea, setActiveArea] = useState<ManagementArea>(() => visibleAreas[0]?.id ?? 'company');
  const selectedArea = visibleAreas.find((area) => area.id === activeArea) ?? visibleAreas[0];

  if (!selectedArea) return <div className="mx-auto max-w-3xl px-8 py-16 text-center text-sm text-slate-500">Нет доступных разделов управления.</div>;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700"><span className="h-px w-7 bg-blue-600" />Контур организации</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Управление компанией</h1><p className="mt-2 text-sm text-slate-500">{organization.name} · структура, люди и правила доступа в одном месте</p></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-6" aria-label="Разделы управления">
          {visibleAreas.map(({id, label, hint, icon: Icon}) => <button key={id} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedArea.id === id ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setActiveArea(id)}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selectedArea.id === id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold">{label}</span><span className={`block truncate text-[10px] ${selectedArea.id === id ? 'text-slate-300' : 'text-slate-400'}`}>{hint}</span></span></button>)}
        </nav>

        <section className="min-w-0">
          {selectedArea.id === 'company' ? <CompanyPanel organizationId={organization.organizationId} slug={organization.slug} can={can} onUpdated={onOrganizationUpdated} /> : null}
          {selectedArea.id === 'employees' ? <EmployeesPanel slug={organization.slug} actorMembershipId={organization.membershipId} isOwner={isOwner} canCreate={can('employee.create')} canEdit={can('employee.edit')} canDelete={can('employee.delete')} canManageRoles={can('role.manage')} /> : null}
          {selectedArea.id === 'departments' ? <DepartmentsPanel slug={organization.slug} canManage={can('department.manage')} /> : null}
          {selectedArea.id === 'positions' ? <CatalogPanel slug={organization.slug} path="positions" canManage={can('position.manage')} /> : null}
          {selectedArea.id === 'responsibilities' ? <CatalogPanel slug={organization.slug} path="responsibilities" canManage={can('responsibility.manage')} /> : null}
          {selectedArea.id === 'functions' ? <CatalogPanel slug={organization.slug} path="functions" canManage={can('business_function.manage')} /> : null}
          {selectedArea.id === 'regulations' ? <RegulationsPanel slug={organization.slug} canCreate={can('regulation.create')} canEdit={can('regulation.edit')} canApprove={can('regulation.approve')} canArchive={can('regulation.archive')} canDelete={can('regulation.delete')} /> : null}
          {selectedArea.id === 'roles' ? <RolesPanel slug={organization.slug} canManage={can('role.manage')} canViewRoles={can('role.view')} canViewPermissions={can('permission.view')} /> : null}
          {selectedArea.id === 'logs' ? <AuditLogPanel slug={organization.slug} /> : null}
        </section>
      </div>
    </div>
  );
}
