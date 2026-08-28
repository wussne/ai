/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Building2, LoaderCircle, LogOut, Zap} from 'lucide-react';

import {LoginPage} from './components/auth/LoginPage';
import {AuthenticatedWorkspace} from './components/layout/AuthenticatedWorkspace';
import {useAuth} from './features/auth/useAuth';

export default function App() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-200">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Проверяем сессию…</span>
        </div>
      </div>
    );
  }

  if (auth.status === 'anonymous') {
    return <LoginPage onLogin={auth.login} />;
  }

  if (!auth.activeOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="b2b-card max-w-md p-8 text-center">
          <Building2 className="mx-auto mb-5 h-8 w-8 text-slate-400" />
          <h1 className="mb-2 text-xl font-bold">Нет доступных организаций</h1>
          <p className="mb-6 text-sm text-slate-500">
            Обратитесь к администратору, чтобы получить доступ к рабочему пространству.
          </p>
          <button className="b2b-button-secondary mx-auto" onClick={() => void auth.logout()}>
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedWorkspace
      key={auth.activeOrganization.organizationId}
      user={auth.user}
      organization={auth.activeOrganization}
      organizations={auth.organizations}
      onOrganizationChange={auth.selectOrganization}
      onLogout={auth.logout}
      onOrganizationUpdated={auth.updateOrganization}
    />
  );
}
