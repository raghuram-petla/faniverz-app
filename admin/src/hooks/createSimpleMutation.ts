import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * @contract Factory that creates a React hook wrapping useMutation with
 * standardized cache invalidation and error alerting.
 * @assumes All invalidateKeys are valid TanStack Query key arrays.
 * @assumes When both invalidateKeys and getInvalidateKeys are provided,
 *   both sets of keys are invalidated on success.
 */
interface SimpleMutationConfig<TPayload, TReturn = void> {
  /** The async mutation function */
  mutationFn: (payload: TPayload) => Promise<TReturn>;
  /** Static query key arrays to invalidate on success */
  invalidateKeys?: unknown[][];
  /**
   * @contract Dynamic invalidation — called with (data, variables) after success.
   * Use this when invalidation keys depend on the mutation result or input payload.
   */
  getInvalidateKeys?: (data: TReturn, variables: TPayload) => unknown[][];
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
      onSuccess: (data, variables) => {
        // @sideeffect Invalidates static keys first, then dynamic keys derived from result/variables
        for (const key of config.invalidateKeys ?? []) {
          qc.invalidateQueries({ queryKey: key });
        }
        if (config.getInvalidateKeys) {
          for (const key of config.getInvalidateKeys(data, variables)) {
            qc.invalidateQueries({ queryKey: key });
          }
        }
      },
      onError: (error: Error) => {
        window.alert(error.message || config.errorMessage || 'Operation failed');
      },
    });
  };
}
