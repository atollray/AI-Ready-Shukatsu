import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type ToastItem, type ToastVariant, ToastViewport } from "../components/Toast";
import { type WorkspaceSnapshot, fetchWorkspace } from "./client";

export const WORKSPACE_QUERY_KEY = ["workspace"];

export type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

export interface ShowToastOptions {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  durationMs?: number;
}

interface WorkspaceContextType {
  data: WorkspaceSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  lastSyncTime: string;
  showToast: (options: ShowToastOptions) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = "info", actionLabel, onAction, durationMs }: ShowToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const timeoutMs = durationMs ?? (onAction ? 7000 : 4000);
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, actionLabel, onAction }]);
      const timer = setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeoutMs);
      toastTimersRef.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  // Prevent accidental tab close while debounced save is still in progress
  useEffect(() => {
    if (saveStatus !== "saving") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  const query = useQuery<WorkspaceSnapshot>({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchWorkspace();
      setLastSyncTime(new Date().toLocaleTimeString("ja-JP"));
      return data;
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events");

      eventSource.addEventListener("store-change", () => {
        queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
        setSaveStatus("saved");
        setLastSyncTime(new Date().toLocaleTimeString("ja-JP"));
      });
    } catch {
      // ignore
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [queryClient]);

  const value: WorkspaceContextType = {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    saveStatus,
    setSaveStatus,
    lastSyncTime,
    showToast,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
