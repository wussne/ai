import {
  HelpCircle,
  History,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Building2,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import type { CurrentUser, OrganizationMembership } from "../../features/auth/auth.types";
import { getUserInitials } from "../../features/auth/userPresentation";
import { Section } from "../../types";

interface SidebarProps {
  activeSection: Section;
  user: CurrentUser;
  organization: OrganizationMembership;
  organizations: OrganizationMembership[];
  onSectionChange: (section: Section) => void;
  onOrganizationChange: (slug: string) => void;
  onOpenSettings: () => void;
  showManagement: boolean;
}

const NAVIGATION = [
  { id: Section.Home, icon: LayoutDashboard, label: "Панель управления" },
  { id: Section.Create, icon: PlusCircle, label: "Новый аудит" },
  { id: Section.History, icon: History, label: "Библиотека" },
  { id: Section.Help, icon: HelpCircle, label: "Методология" },
] as const;

export function Sidebar({
  activeSection,
  user,
  organization,
  organizations,
  onSectionChange,
  onOrganizationChange,
  onOpenSettings,
  showManagement,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-none">Бизнес-ИИ</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise</span>
          </div>
        </div>

        <label className="mb-7 block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Организация
          </span>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label="Текущая организация"
              className="w-full appearance-none truncate rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-slate-400"
              value={organization.slug}
              onChange={(event) => onOrganizationChange(event.target.value)}
            >
              {organizations.map((item) => (
                <option key={item.organizationId} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <nav className="space-y-1.5">
          {NAVIGATION.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeSection === id
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          {showManagement ? (
            <button
              onClick={() => onSectionChange(Section.Management)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeSection === Section.Management
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Управление
            </button>
          ) : null}
        </nav>
      </div>

      <div className="mt-auto p-8">
        <button
          type="button"
          onClick={onOpenSettings}
          className={`w-full rounded-xl border p-3 text-left transition-all ${
            activeSection === Section.Settings
              ? "border-slate-300 bg-slate-100"
              : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              {getUserInitials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-800">{user.fullName}</div>
              <div className="mt-0.5 truncate text-[10px] text-slate-400">
                {organization.position || user.email}
              </div>
            </div>
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </button>
      </div>
    </aside>
  );
}
