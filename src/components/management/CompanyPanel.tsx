import {useState, type FormEvent} from 'react';
import {Building2, CalendarDays, Save, ShieldAlert} from 'lucide-react';

import {managementApi} from '../../features/management/managementApi';
import type {PermissionCode} from '../../features/management/management.types';
import {useAsyncResource} from '../../hooks/useAsyncResource';
import {ManagementError, ManagementLoading} from './ManagementStates';

export function CompanyPanel({organizationId, slug, can, onUpdated}: {organizationId: string; slug: string; can: (code: PermissionCode) => boolean; onUpdated: (organizationId: string, name: string, slug: string) => void}) {
  const resource = useAsyncResource(() => managementApi.company(slug), [slug]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (resource.isLoading) return <ManagementLoading />;
  if (resource.error || !resource.data) return <ManagementError message={resource.error || 'Компания не найдена'} onRetry={resource.reload} />;
  const company = resource.data.company;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSaving(true); setError('');
    try {
      const result = await managementApi.updateCompany(slug, {name: String(data.get('name')), slug: String(data.get('slug'))});
      onUpdated(organizationId, result.company.name, result.company.slug);
      if (result.company.slug === slug) await resource.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить компанию');
    } finally { setIsSaving(false); }
  };

  const deactivate = async () => {
    const confirmation = prompt(`Введите «${company.name}», чтобы деактивировать компанию`);
    if (!confirmation) return;
    setError('');
    try {
      await managementApi.deactivateCompany(slug, confirmation);
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось деактивировать компанию'); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form className="b2b-card p-6" onSubmit={(event) => void save(event)}>
        <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Building2 className="h-5 w-5" /></div><div><h2 className="font-bold">Карточка компании</h2><p className="text-xs text-slate-400">Название и адрес рабочего пространства</p></div></div>
        <div className="space-y-5">
          <label className="block"><span className="b2b-label">Название</span><input className="b2b-input" name="name" defaultValue={company.name} disabled={!can('company.edit')} required maxLength={255} /></label>
          <label className="block"><span className="b2b-label">Slug организации</span><div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900"><input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" name="slug" defaultValue={company.slug} disabled={!can('company.edit')} required maxLength={63} pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?" /><span className="pr-3 text-xs text-slate-400">.ваш-домен.ru</span></div><span className="mt-1.5 block text-xs text-slate-400">Используется для выбора организации и будущего поддомена.</span></label>
        </div>
        {error ? <p role="alert" className="mt-4 text-xs font-medium text-red-600">{error}</p> : null}
        {can('company.edit') ? <div className="mt-6 flex justify-end"><button className="b2b-button-primary" disabled={isSaving}><Save className="h-4 w-4" />{isSaving ? 'Сохраняем…' : 'Сохранить изменения'}</button></div> : null}
      </form>

    </div>
  );
}
