import {useState} from 'react';
import {Building2, LoaderCircle, LogOut, Mail, UserRound} from 'lucide-react';

import type {CurrentUser, OrganizationMembership} from '../../features/auth/auth.types';
import {getUserInitials} from '../../features/auth/userPresentation';

interface SettingsPageProps {
  user: CurrentUser;
  organization: OrganizationMembership;
  onLogout: () => Promise<void>;
}

export function SettingsPage({user, organization, onLogout}: SettingsPageProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const logout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await onLogout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Не удалось выйти из системы');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-14">
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Настройки</h1>
        <p className="text-sm text-slate-500">Информация о текущей учётной записи.</p>
      </div>

      <section className="b2b-card overflow-hidden">
        <div className="flex items-center gap-5 border-b border-slate-100 p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
            {getUserInitials(user.fullName)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{user.fullName}</h2>
            <p className="truncate text-sm text-slate-500">{organization.position || 'Должность не указана'}</p>
          </div>
        </div>

        <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <AccountField icon={Mail} label="Email" value={user.email} />
          <AccountField icon={Building2} label="Организация" value={organization.name} />
          <AccountField icon={Building2} label="Подразделение" value={organization.department || 'Не указано'} />
          <AccountField icon={UserRound} label="Должность" value={organization.position || 'Не указана'} />
        </dl>

        <div className="flex justify-end border-t border-slate-100 p-6">
          <div className="flex flex-col items-end gap-2">
            {logoutError && <p role="alert" className="text-xs text-red-600">{logoutError}</p>}
            <button
              className="b2b-button-secondary text-red-600"
              disabled={isLoggingOut}
              onClick={() => void logout()}
            >
              {isLoggingOut ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Выйти из системы
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface AccountFieldProps {
  icon: typeof Mail;
  label: string;
  value: string;
}

function AccountField({icon: Icon, label, value}: AccountFieldProps) {
  return (
    <div className="flex items-start gap-3 bg-white p-6">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="text-sm font-medium text-slate-700">{value}</dd>
      </div>
    </div>
  );
}
