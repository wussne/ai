import type { DraftAttachment, ProcessAttachment } from "../types";
import {
  buildAttachmentGarbageCollectionPlan,
  type AttachmentGarbageCollectionReport,
  type AttachmentLifecycle,
  type GarbageCollectionReferences,
} from "./attachmentGarbageCollector";

const DATABASE_NAME = "business-process-assistant";
const DATABASE_VERSION = 2;
const STORE_NAME = "attachments";

interface AttachmentRecord {
  id: string;
  organizationId?: string;
  blob: Blob;
  name: string;
  mimeType: string;
  lastModified: number;
  lifecycle?: AttachmentLifecycle;
  createdAt?: number;
  updatedAt?: number;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };
  });

  return databasePromise;
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadAllAttachmentRecords(): Promise<AttachmentRecord[]> {
  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  return requestResult(
    transaction.objectStore(STORE_NAME).getAll() as IDBRequest<AttachmentRecord[]>,
  );
}

export async function saveAttachment(
  organizationId: string,
  attachment: DraftAttachment,
): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const now = Date.now();
  const record: AttachmentRecord = {
    id: attachment.id,
    organizationId,
    blob: attachment.file,
    name: attachment.name,
    mimeType: attachment.mimeType,
    lastModified: attachment.file.lastModified,
    lifecycle: "draft",
    createdAt: now,
    updatedAt: now,
  };

  transaction.objectStore(STORE_NAME).put(record);
  await completeTransaction(transaction);
}

export async function loadAttachmentFile(
  organizationId: string,
  attachment: ProcessAttachment,
): Promise<File | null> {
  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestResult(
    transaction.objectStore(STORE_NAME).get(attachment.id) as IDBRequest<
      AttachmentRecord | undefined
    >,
  );

  if (!record || (record.organizationId && record.organizationId !== organizationId)) {
    return null;
  }

  return new File([record.blob], record.name, {
    type: record.mimeType,
    lastModified: record.lastModified,
  });
}

export async function loadAttachmentFiles(
  organizationId: string,
  attachments: ProcessAttachment[] = [],
): Promise<File[]> {
  const files = await Promise.all(
    attachments.map((attachment) => loadAttachmentFile(organizationId, attachment)),
  );
  return files.filter((file): file is File => file !== null);
}

export async function deleteAttachment(
  organizationId: string,
  id: string,
): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const record = await requestResult(
    store.get(id) as IDBRequest<AttachmentRecord | undefined>,
  );
  if (!record || !record.organizationId || record.organizationId === organizationId) {
    store.delete(id);
  }
  await completeTransaction(transaction);
}

export async function deleteAttachments(
  organizationId: string,
  attachments: ProcessAttachment[] = [],
): Promise<void> {
  await Promise.all(
    attachments.map((attachment) => deleteAttachment(organizationId, attachment.id)),
  );
}

export async function markAttachmentsCommitted(
  organizationId: string,
  attachments: ProcessAttachment[],
): Promise<void> {
  if (attachments.length === 0) return;

  const records = await Promise.all(
    attachments.map(async (attachment) => ({
      attachment,
      file: await loadAttachmentFile(organizationId, attachment),
    })),
  );
  const availableRecords = records.filter(
    (record): record is { attachment: ProcessAttachment; file: File } =>
      record.file !== null,
  );
  if (availableRecords.length === 0) return;

  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const now = Date.now();

  availableRecords.forEach(({ attachment, file }) => {
    store.put({
      id: attachment.id,
      organizationId,
      blob: file,
      name: attachment.name,
      mimeType: attachment.mimeType,
      lastModified: file.lastModified,
      lifecycle: "committed",
      createdAt: now,
      updatedAt: now,
    } satisfies AttachmentRecord);
  });

  await completeTransaction(transaction);
}

export async function garbageCollectAttachments({
  organizationId,
  draftIds,
  committedIds,
}: GarbageCollectionReferences & {organizationId: string}): Promise<AttachmentGarbageCollectionReport> {
  const records = (await loadAllAttachmentRecords()).filter(
    (record) => !record.organizationId || record.organizationId === organizationId,
  );
  const { actions, report } = buildAttachmentGarbageCollectionPlan(records, {
    draftIds,
    committedIds,
  });

  const mutations = actions.filter((action) => action.type !== "keep");
  if (mutations.length === 0) return report;

  const database = await getDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const now = Date.now();

  mutations.forEach((action) => {
    if (action.type === "delete") {
      store.delete(action.id);
      return;
    }

    store.put({
      ...action.record,
      organizationId,
      lifecycle: action.lifecycle,
      createdAt: action.record.createdAt ?? now,
      updatedAt: now,
    } satisfies AttachmentRecord);
  });

  await completeTransaction(transaction);
  return report;
}
