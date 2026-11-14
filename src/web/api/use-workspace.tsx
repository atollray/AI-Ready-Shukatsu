import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { type WorkspaceSnapshot, fetchWorkspace } from "./client";

export const WORKSPACE_QUERY_KEY = ["workspace"];

export type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

interface WorkspaceContextType {
  data: WorkspaceSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  lastSyncTime: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

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
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
