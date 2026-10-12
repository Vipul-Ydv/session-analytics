"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = { data: T | null; error: string | null; loading: boolean };

const message = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

/**
 * Loads data from the API. `key` identifies what is being loaded: when it changes, the data reloads.
 * reload() powers the Refresh and Try again buttons.
 */
export function useApi<T>(load: () => Promise<T>, key: string) {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadRef.current().then(
      (data) => {
        if (active) setState({ data, error: null, loading: false });
      },
      (err: unknown) => {
        if (active) setState({ data: null, error: message(err), loading: false });
      },
    );
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
