import {lazy, Suspense, useMemo, useRef, useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';

import type {
  CurrentUser,
  OrganizationMembership,
} from '../../features/auth/auth.types';
import {EMPTY_PROCESS_DRAFT} from '../../constants/ui';
import {useProcessAttachments} from '../../hooks/useProcessAttachments';
import {useProcessChat} from '../../hooks/useProcessChat';
import {useProcessDraft} from '../../hooks/useProcessDraft';
import {useProcessGeneration} from '../../hooks/useProcessGeneration';
import {useProcessLibrary} from '../../hooks/useProcessLibrary';
import {useVoiceInput} from '../../hooks/useVoiceInput';
import {deleteAttachments as deleteStoredAttachments} from '../../services/attachmentStorage';
import {Section, type BusinessProcess} from '../../types';
import {CreatePage} from '../pages/CreatePage';
import {HelpPage} from '../pages/HelpPage';
import {HistoryPage} from '../pages/HistoryPage';
import {HomePage} from '../pages/HomePage';
import {SettingsPage} from '../pages/SettingsPage';
import {Sidebar} from './Sidebar';
import {useOrganizationAccess} from '../../features/management/useOrganizationAccess';
import {useProcessOptions} from '../../features/process/useProcessOptions';
import {processApi} from '../../features/process/processApi';

const ManagementPage = lazy(() =>
  import('../management/ManagementPage').then((module) => ({default: module.ManagementPage})),
);

interface AuthenticatedWorkspaceProps {
  key?: string;
  user: CurrentUser;
  organization: OrganizationMembership;
  organizations: OrganizationMembership[];
  onOrganizationChange: (slug: string) => void;
  onLogout: () => Promise<void>;
  onOrganizationUpdated: (organizationId: string, name: string, slug: string) => void;
}

export function AuthenticatedWorkspace({
  user,
  organization,
  organizations,
  onOrganizationChange,
  onLogout,
  onOrganizationUpdated,
}: AuthenticatedWorkspaceProps) {
  const organizationAccess = useOrganizationAccess(organization.slug);
  const processOptions = useProcessOptions(organization.slug);
  const {draft, setDraft, hasPersistedDraft} = useProcessDraft(
    organization.organizationId,
  );
  const [activeSection, setActiveSection] = useState(
    hasPersistedDraft ? Section.Create : Section.Home,
  );
  const [viewingProcess, setViewingProcess] = useState<BusinessProcess | null>(null);
  const [activeResultTab, setActiveResultTab] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const {processes, addProcess, removeProcess} = useProcessLibrary(
    organization.organizationId,
  );
  const processAttachments = useProcessAttachments(
    organization.organizationId,
    processes.flatMap((process) => process.attachments ?? []),
  );
  const chat = useProcessChat(
    viewingProcess,
    organization.organizationId,
    organization.slug,
  );
  const resolvedDraft = useMemo(() => {
    const department = processOptions.departments.find((item) => item.id === draft.departmentId);
    const position = processOptions.positions.find((item) => item.id === draft.positionId);
    return {
      ...draft,
      departmentId: department?.id ?? '',
      department: department?.name ?? '',
      positionId: position?.id ?? '',
      position: position?.name ?? '',
    };
  }, [draft, processOptions.departments, processOptions.positions]);

  const {isGenerating, generate} = useProcessGeneration(
    organization.slug,
    resolvedDraft,
    processAttachments.attachments,
    processAttachments.processAttachments,
    async (process) => {
      await processApi.recordEvent(organization.slug, {
        event: 'created',
        entityId: process.id,
        name: process.name,
        departmentId: process.departmentId,
        positionId: process.positionId,
      });
      addProcess(process);
      setViewingProcess(process);
      setActiveResultTab(0);
      chat.clearMessages();
      await processAttachments.commitAttachments();
    },
  );

  const {isRecording, startVoiceInput} = useVoiceInput((transcript) => {
    setDraft((current) => ({
      ...current,
      description: [current.description, transcript].filter(Boolean).join(' '),
    }));
  });

  const openProcess = (process: BusinessProcess) => {
    setViewingProcess(process);
    setActiveSection(Section.Create);
    setActiveResultTab(0);
  };

  const deleteProcess = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот процесс?')) return;

    const process = processes.find((item) => item.id === id);
    if (!process) return;
    try {
      await processApi.recordEvent(organization.slug, {
        event: 'deleted',
        entityId: process.id,
        name: process.name,
        departmentId: process.departmentId,
        positionId: process.positionId,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось записать действие в журнал');
      return;
    }
    if (process?.attachments) {
      deleteStoredAttachments(organization.organizationId, process.attachments).catch((error) => {
        console.error('Failed to delete process attachments', error);
      });
    }
    removeProcess(id);
    if (viewingProcess?.id === id) setViewingProcess(null);
  };

  const exportToPdf = async () => {
    if (!resultRef.current) return;
    const {exportElementToPdf} = await import('../../services/pdfService');
    await exportElementToPdf(resultRef.current, viewingProcess?.name || 'процесса');
  };

  const selectExample = (name: string) => {
    setDraft((current) => ({...current, name}));
    setActiveSection(Section.Create);
  };

  const resetDraft = async () => {
    try {
      await processApi.recordEvent(organization.slug, {
        event: 'draft_reset',
        entityId: 'draft',
        name: draft.name || 'Новый аудит',
        departmentId: draft.departmentId,
        positionId: draft.positionId,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось записать действие в журнал');
      return;
    }
    setDraft({...EMPTY_PROCESS_DRAFT});
    void processAttachments.discardAttachments();
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeSection={activeSection}
        user={user}
        organization={organization}
        organizations={organizations}
        onSectionChange={setActiveSection}
        onOrganizationChange={onOrganizationChange}
        onOpenSettings={() => setActiveSection(Section.Settings)}
        showManagement={organizationAccess.canAny([
          'company.view', 'employee.view', 'department.view', 'position.view',
          'responsibility.view', 'business_function.view', 'role.view',
          'permission.view',
          'regulation.view',
          'log.view',
        ])}
      />

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{opacity: 0, x: 10}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -10}}
            transition={{duration: 0.2}}
          >
            {activeSection === Section.Home && (
              <HomePage
                onStart={() => setActiveSection(Section.Create)}
                onOpenHelp={() => setActiveSection(Section.Help)}
              />
            )}
            {activeSection === Section.Create && (
              <CreatePage
                draft={draft}
                attachments={processAttachments.attachments}
                attachmentError={processAttachments.error}
                viewingProcess={viewingProcess}
                activeResultTab={activeResultTab}
                isGenerating={isGenerating}
                isRecording={isRecording}
                isAddingAttachments={processAttachments.isAdding}
                departments={processOptions.departments}
                positions={processOptions.positions}
                areOptionsLoading={processOptions.isLoading}
                optionsError={processOptions.error}
                onReloadOptions={processOptions.reload}
                resultRef={resultRef}
                chat={{
                  messages: chat.messages,
                  input: chat.input,
                  isLoading: chat.isLoading,
                  endRef: chat.endRef,
                  onInputChange: chat.setInput,
                  onSend: chat.sendMessage,
                }}
                onDraftChange={setDraft}
                onFilesSelected={processAttachments.addFiles}
                onRemoveAttachment={processAttachments.removeAttachment}
                onGenerate={generate}
                onReset={resetDraft}
                onStartVoiceInput={startVoiceInput}
                onResultTabChange={setActiveResultTab}
                onExport={exportToPdf}
              />
            )}
            {activeSection === Section.History && (
              <HistoryPage
                processes={processes}
                onCreate={() => setActiveSection(Section.Create)}
                onOpen={openProcess}
                onDelete={deleteProcess}
              />
            )}
            {activeSection === Section.Help && (
              <HelpPage onSelectExample={selectExample} />
            )}
            {activeSection === Section.Settings && (
              <SettingsPage
                user={user}
                organization={organization}
                onLogout={onLogout}
              />
            )}
            {activeSection === Section.Management && organizationAccess.access && (
              <Suspense fallback={<div className="flex min-h-96 items-center justify-center gap-3 text-sm font-medium text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Открываем управление…</div>}>
                <ManagementPage
                  organization={organization}
                  isOwner={organizationAccess.access.isOwner}
                  can={organizationAccess.can}
                  onOrganizationUpdated={onOrganizationUpdated}
                />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
