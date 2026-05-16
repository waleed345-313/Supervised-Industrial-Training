import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

interface UseRealtimeDataOptions<T> {
  fetchFn: () => Promise<T>;
  socketEvent: string;
  updateTypes?: string[];
  initialData?: T;
  pollingInterval?: number;
}

export function useRealtimeData<T>({
  fetchFn,
  socketEvent,
  updateTypes = [],
  initialData,
  pollingInterval = 30000,
}: UseRealtimeDataOptions<T>) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Caller passes new inline `fetchFn` / `updateTypes` each render — holding them in refs
  // keeps `fetchData` stable so effects do not loop (was causing visible table "blinking").
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const updateTypesRef = useRef(updateTypes);
  updateTypesRef.current = updateTypes;

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.io real-time updates
  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;

    const socket: Socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;

    const onUpdate = (payload: { type?: string }) => {
      const types = updateTypesRef.current;
      if (types.length === 0 || types.includes(payload?.type || '')) {
        fetchData(false);
      }
    };

    socket.on(socketEvent, onUpdate);

    return () => {
      socket.off(socketEvent, onUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketEvent, fetchData]);

  // Polling fallback
  useEffect(() => {
    if (pollingInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      fetchData(false);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh };
}

export function useRealtimeStudents() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorStudents } = await import('@/lib/api');
      return getSupervisorStudents();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['students', 'applications'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimeSupervisorFinalGradingStudents() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorFinalGradingStudents } = await import('@/lib/api');
      return getSupervisorFinalGradingStudents();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['students', 'applications', 'evaluations', 'final-grades'],
    initialData: [],
    pollingInterval: 30000,
  });
}

// Dedicated hook for company assignment updates
export function useRealtimeSupervisorStudents() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { getSupervisorStudents } = await import('@/lib/api');
      const result = await getSupervisorStudents();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch supervisor students:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for both supervisor:update and company:assignment events
  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;

    const socket: Socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;

    const onSupervisorUpdate = (payload: { type?: string }) => {
      if (!payload?.type || ['students', 'applications', 'allocations'].includes(payload.type)) {
        fetchData(false);
      }
    };

    const onCompanyAssignment = () => {
      // Refresh when company assignment changes
      fetchData(false);
    };

    socket.on('supervisor:update', onSupervisorUpdate);
    socket.on('company:assignment', onCompanyAssignment);

    return () => {
      socket.off('supervisor:update', onSupervisorUpdate);
      socket.off('company:assignment', onCompanyAssignment);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchData]);

  // Polling fallback
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, lastUpdated, refresh };
}

export function useRealtimeEvaluations() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorEvaluations } = await import('@/lib/api');
      return getSupervisorEvaluations();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['evaluations'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimeProgressReports() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorProgressReports } = await import('@/lib/api');
      return getSupervisorProgressReports();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['progress-reports'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimeFinalGrades() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorFinalGrades } = await import('@/lib/api');
      return getSupervisorFinalGrades();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['final-grades'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimeFeedback() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getSupervisorFeedback } = await import('@/lib/api');
      return getSupervisorFeedback();
    },
    socketEvent: 'supervisor:update',
    updateTypes: ['feedback'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimePanelStudents() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getPanelStudents } = await import('@/lib/api');
      return getPanelStudents();
    },
    socketEvent: 'panel:update',
    updateTypes: ['students', 'applications', 'final-grades'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimePanelEvaluations() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getPanelEvaluations } = await import('@/lib/api');
      return getPanelEvaluations();
    },
    socketEvent: 'panel:update',
    updateTypes: ['evaluations'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimePanelFinalGrades() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getPanelFinalGrades } = await import('@/lib/api');
      return getPanelFinalGrades();
    },
    socketEvent: 'panel:update',
    updateTypes: ['final-grades'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimePanelProgressReports() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getPanelProgressReports } = await import('@/lib/api');
      return getPanelProgressReports();
    },
    socketEvent: 'panel:update',
    updateTypes: ['progress-reports'],
    initialData: [],
    pollingInterval: 30000,
  });
}

export function useRealtimeFocalFinalGrading() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getFocalFinalGrading } = await import('@/lib/api');
      return getFocalFinalGrading();
    },
    // Panel members submit final-grades and emit `panel:update` on change
    socketEvent: 'panel:update',
    updateTypes: ['final-grades'],
    initialData: { pending: [], completed: [] },
    pollingInterval: 30000,
  });
}

export function useRealtimeStudentNotifications() {
  return useRealtimeData({
    fetchFn: async () => {
      const { getStudentNotifications } = await import('@/lib/api');
      return getStudentNotifications();
    },
    socketEvent: 'student:update',
    updateTypes: ['notifications'],
    initialData: [],
    pollingInterval: 30000,
  });
}
