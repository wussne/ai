import { useState } from "react";
import type { BusinessProcess } from "../types";
import { migrateLegacyStorageValue } from "../utils/organizationStorage";

const STORAGE_KEY = "business_processes";

export function useProcessLibrary(organizationId: string) {
  const [storageKey] = useState(() =>
    migrateLegacyStorageValue(STORAGE_KEY, organizationId),
  );
  const [processes, setProcesses] = useState<BusinessProcess[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Failed to parse saved processes", error);
      return [];
    }
  });

  const addProcess = (process: BusinessProcess) => {
    setProcesses((current) => {
      const next = [process, ...current];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const removeProcess = (id: string) => {
    setProcesses((current) => {
      const next = current.filter((process) => process.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return { processes, addProcess, removeProcess };
}
