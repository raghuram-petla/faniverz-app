import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * @contract Factory that creates a React hook wrapping useMutation with
 * standardized cache invalidation and error alerting.
 * @assumes All invalidateKeys are valid TanStack Query key arrays.
 */
export interface SimpleMutationConfig<TPayload, TReturn = void> {
  /** The async mutation function */
  mutationFn: (payload: TPayload) => Promise<TReturn>;
  /** Query key arrays to invalidate on success */
  invalidateKeys: unknown[][];
  /** Fallback error message shown in window.alert (default: 'Operation failed') */
  errorMessage?: string;
}

export function createSimpleMutation<TPayload, TReturn = void>(
  config: SimpleMutationConfig<TPayload, TReturn>,
) {
  return function useGeneratedMutation() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: config.mutationFn,
      onSuccess: () => {
        for (const key of config.invalidateKeys) {
          qc.invalidateQueries({ queryKey: key });
        }
      },
      onError: (error: Error) => {
        window.alert(error.message || config.errorMessage || 'Operation failed');
      },
    });
  };
}
