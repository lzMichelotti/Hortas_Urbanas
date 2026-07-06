import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { ApiError } from "@/lib/api/errors"

const DIA_MS = 1000 * 60 * 60 * 24

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attempt) =>
        Math.min(1000 * 2 ** attempt, 30_000) + Math.round(Math.random() * 1000),
      staleTime: 5 * 60_000,
      gcTime: DIA_MS,
      refetchOnWindowFocus: false,
    },
  },
})

export const PERSIST_BUSTER = "1"

export const persister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: "hu_query_cache",
  throttleTime: 1000,
})

export const persistOptions = {
  persister,
  maxAge: DIA_MS,
  buster: PERSIST_BUSTER,
}
