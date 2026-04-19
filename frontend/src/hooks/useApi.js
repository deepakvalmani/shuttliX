/**
 * hooks/useApi.js
 * Data-fetching hook with loading, error, and refetch support.
 * Replaces the scattered useEffect + useState + try/catch pattern
 * found throughout the app.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi('/student/routes');
 *   const { data, execute } = useApi('/admin/shuttles', { manual: true });
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api, { ApiError } from '../services/api';

const useApi = (url, options = {}) => {
  const {
    method      = 'GET',
    body        = null,
    manual      = false,   // if true, call execute() manually
    transform   = d => d,  // transform response.data before storing
    onSuccess   = null,
    onError     = null,
    deps        = [],      // additional dependencies to re-fetch on
  } = options;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!manual);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async (overrideBody = null) => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const config = {
        method,
        url,
        signal: controller.signal,
        ...(overrideBody || body ? { data: overrideBody || body } : {}),
      };
      const res = await api.request(config);
      const transformed = transform(res.data);
      setData(transformed);
      onSuccess?.(transformed);
      return transformed;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      const apiErr = err instanceof ApiError ? err : new ApiError(err.message, 0);
      setError(apiErr);
      onError?.(apiErr);
      throw apiErr;
    } finally {
      setLoading(false);
    }
  }, [url, method, JSON.stringify(body), ...deps]);

  useEffect(() => {
    if (!manual && url) execute();
    return () => abortRef.current?.abort();
  }, [manual, url, ...deps]);

  return { data, loading, error, refetch: execute, execute };
};

export default useApi;
