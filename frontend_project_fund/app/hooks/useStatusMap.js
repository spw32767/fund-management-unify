"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildStatusMaps, statusService } from '@/app/lib/status_service';

const INITIAL_STATE = {
  statuses: null,
  byId: {},
  byName: {},
  isLoading: true,
  error: null,
};

export function useStatusMap() {
  const [state, setState] = useState(() => {
    const cached = statusService.getCached();
    if (cached) {
      const maps = buildStatusMaps(cached);
      return {
        statuses: cached,
        ...maps,
        isLoading: false,
        error: null,
      };
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = statusService.subscribe((statuses) => {
      if (!isMounted) return;
      const maps = buildStatusMaps(statuses);
      setState({
        statuses,
        ...maps,
        isLoading: false,
        error: null,
      });
    });

    if (!state.statuses) {
      statusService
        .fetchAll()
        .then((statuses) => {
          if (!isMounted) return;
          const maps = buildStatusMaps(statuses);
          setState({
            statuses,
            ...maps,
            isLoading: false,
            error: null,
          });
        })
        .catch((error) => {
          if (!isMounted) return;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error,
          }));
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    try {
      const statuses = await statusService.fetchAll({ force: true });
      const maps = buildStatusMaps(statuses);
      setState({
        statuses,
        ...maps,
        isLoading: false,
        error: null,
      });
      return statuses;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error,
      }));
      throw error;
    }
  }, []);

  const helpers = useMemo(
    () => ({
      getLabelById: (statusId) => {
        if (statusId == null) return undefined;
        const normalizedId = Number(statusId);
        return state.byId[normalizedId]?.status_name;
      },
      getCodeById: (statusId) => {
        if (statusId == null) return undefined;
        const normalizedId = Number(statusId);
        return state.byId[normalizedId]?.status_code;
      },
      getByName: (name) => {
        if (!name) return undefined;
        return state.byName[name];
      },
    }),
    [state.byId, state.byName]
  );

  return {
    ...state,
    ...helpers,
    refetch,
  };
}