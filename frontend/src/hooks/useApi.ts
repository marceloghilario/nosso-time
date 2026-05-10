import { useCallback, useEffect, useState } from 'react';

type RequestStatus = 'loading' | 'success' | 'error';

interface RequestState<T> {
  status: RequestStatus;
  data: T | null;
  error: string | null;
}

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const initialState = <T>(): RequestState<T> => ({
  status: 'loading',
  data: null,
  error: null,
});

export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []): UseApiState<T> {
  const [state, setState] = useState<RequestState<T>>(initialState<T>);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((result) => {
        if (cancelled) return;
        setState({ status: 'success', data: result, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => {
    setState(initialState<T>());
    setTick((n) => n + 1);
  }, []);

  return {
    data: state.data,
    loading: state.status === 'loading',
    error: state.error,
    refetch,
  };
}
