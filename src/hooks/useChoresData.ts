import { useState, useEffect, useCallback } from "react";
import type { ChoresData } from "@/lib/chores-types";
import { EMPTY_CHORES_DATA } from "@/lib/chores-types";
import { choresApi } from "@/lib/chores-api";

export function useChoresData(pollInterval = 5000) {
  const [data, setData] = useState<ChoresData>(EMPTY_CHORES_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await choresApi.getData();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  return { data, loading, error, refresh };
}
