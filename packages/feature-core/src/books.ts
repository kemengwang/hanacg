import { useEffect, useState } from 'react';
import type { Book, BookKind } from '@hanacg/domain';
import type { BookRepository } from '@hanacg/api-client';

export function useBooks(
  repository: BookRepository,
  kind: BookKind,
  keyword: string,
  refresh: number,
) {
  const [state, setState] = useState<{ items: readonly Book[]; loading: boolean; error: boolean }>({
    items: [],
    loading: true,
    error: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ items: [], loading: true, error: false });
    const timer = setTimeout(
      () => {
        repository
          .list(kind, keyword, controller.signal)
          .then((items) => {
            if (!controller.signal.aborted) setState({ items, loading: false, error: false });
          })
          .catch(() => {
            if (!controller.signal.aborted) setState({ items: [], loading: false, error: true });
          });
      },
      keyword.trim() ? 350 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [repository, kind, keyword, refresh]);
  return state;
}
