import { useCallback, useEffect, useState } from "react";
import type { PlaylistSummary } from "@signage/shared";
import { api } from "../lib/api";

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.playlists
      .list()
      .then((list) => {
        setPlaylists(list);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  return { playlists, loading, error, reload };
}
