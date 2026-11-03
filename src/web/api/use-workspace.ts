import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type WorkspaceSnapshot, fetchWorkspace } from "./client";

export const WORKSPACE_QUERY_KEY = ["workspace"];

export type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

export function useWorkspace() {
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
    staleTime: 1000 * 30, // 30s
  });

  // Listen to SSE /api/events
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource("/api/events");

      eventSource.addEventListener("store-change", () => {
        // Disk changed by external AI agent or another tab
        queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
        setSaveStatus("saved");
        setLastSyncTime(new Date().toLocaleTimeString("ja-JP"));
      });

      eventSource.onerror = () => {
        // browser will auto-reconnect
      };
    } catch {
      // ignore in environments without EventSource
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  return {
    ...query,
    saveStatus,
    setSaveStatus,
    lastSyncTime,
  };
}
