export type AttachmentLifecycle = "draft" | "committed";

export interface AttachmentRecordDescriptor {
  id: string;
  lifecycle?: AttachmentLifecycle;
}

export interface AttachmentGarbageCollectionReport {
  scanned: number;
  deleted: number;
  retainedDrafts: number;
  retainedCommitted: number;
  repairedRecords: number;
}

export interface GarbageCollectionReferences {
  draftIds: Iterable<string>;
  committedIds: Iterable<string>;
}

export type GarbageCollectionAction<T extends AttachmentRecordDescriptor> =
  | { type: "keep" }
  | { type: "delete"; id: string }
  | { type: "repair"; record: T; lifecycle: AttachmentLifecycle };

export function buildAttachmentGarbageCollectionPlan<
  T extends AttachmentRecordDescriptor,
>(
  records: T[],
  { draftIds, committedIds }: GarbageCollectionReferences,
): {
  actions: GarbageCollectionAction<T>[];
  report: AttachmentGarbageCollectionReport;
} {
  const draftIdSet = new Set(draftIds);
  const committedIdSet = new Set(committedIds);
  const report: AttachmentGarbageCollectionReport = {
    scanned: records.length,
    deleted: 0,
    retainedDrafts: 0,
    retainedCommitted: 0,
    repairedRecords: 0,
  };

  const actions = records.map((record): GarbageCollectionAction<T> => {
    if (committedIdSet.has(record.id)) {
      report.retainedCommitted += 1;
      if (record.lifecycle !== "committed") {
        report.repairedRecords += 1;
        return { type: "repair", record, lifecycle: "committed" };
      }
      return { type: "keep" };
    }

    if (draftIdSet.has(record.id)) {
      report.retainedDrafts += 1;
      if (record.lifecycle !== "draft") {
        report.repairedRecords += 1;
        return { type: "repair", record, lifecycle: "draft" };
      }
      return { type: "keep" };
    }

    report.deleted += 1;
    return { type: "delete", id: record.id };
  });

  return { actions, report };
}
