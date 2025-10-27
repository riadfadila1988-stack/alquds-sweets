import { useState, useEffect, useCallback } from 'react';
import {
  clockIn as apiClockIn,
  clockOut as apiClockOut,
  getHistory,
} from '../services/employee-attendance';
import { useAuth } from './use-auth';

export interface WorkSession {
  _id: string;
  clockIn: string;
  clockOut?: string;
  duration?: number; // in minutes
  date: string; // YYYY-MM-DD format
  employeeId: string;
  clockInLocation?: { latitude: number; longitude: number; label?: string } | null;
  clockOutLocation?: { latitude: number; longitude: number; label?: string } | null;
}

export interface WorkingHoursState {
  currentSession: WorkSession | null;
  todaySessions: WorkSession[];
  isLoading: boolean;
  error: string | null;
}

export function useWorkingHours() {
  const { user } = useAuth();
  const [state, setState] = useState<WorkingHoursState>({
    currentSession: null,
    todaySessions: [],
    isLoading: true,
    error: null,
  });

  const loadWorkingHoursData = useCallback(async () => {
    if (!user) return;
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const data = await getHistory(); // Fetch all of today's sessions

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todaySessions = data.records.filter((session: WorkSession) => {
        const clockInDate = new Date(session.clockIn);
        return clockInDate >= todayStart && clockInDate < todayEnd;
      });
      const currentSession = todaySessions.find((session: WorkSession) => !session.clockOut) || null;

      setState({
        currentSession: currentSession,
        todaySessions: todaySessions,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Log the error for diagnostics and update state
      console.error('Failed to load working hours data', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load working hours data',
      }));
    }
  }, [user]);

  // Load data from API on mount
  useEffect(() => {
    if (user) {
      loadWorkingHoursData();
    }
  }, [user, loadWorkingHoursData]);

  const clockIn = useCallback(async (location?: { latitude: number; longitude: number; label?: string }) => {
    if (state.currentSession) {
      setState(prev => ({
        ...prev,
        error: 'Already clocked in',
      }));
      return false;
    }

    try {
      const data = await apiClockIn(location);
      setState(prev => ({
        ...prev,
        currentSession: data.attendance,
        todaySessions: [...prev.todaySessions, data.attendance],
        error: null,
      }));
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to clock in',
      }));
      return false;
    }
  }, [state.currentSession]);

  const clockOut = useCallback(async (location?: { latitude: number; longitude: number; label?: string }) => {
    if (!state.currentSession) {
      setState(prev => ({
        ...prev,
        error: 'Not clocked in',
      }));
      return false;
    }

    try {
      const data = await apiClockOut(location);
      const updatedSessions = state.todaySessions.map(session =>
        session._id === data.attendance._id ? data.attendance : session
      );

      setState(prev => ({
        ...prev,
        currentSession: null,
        todaySessions: updatedSessions,
        error: null,
      }));
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to clock out',
      }));
      return false;
    }
  }, [state.currentSession, state.todaySessions]);

  const getTodayTotalHours = useCallback(() => {
    return state.todaySessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);
  }, [state.todaySessions]);

  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  return {
    ...state,
    clockIn,
    clockOut,
    getTodayTotalHours,
    formatDuration,
    refresh: loadWorkingHoursData,
  };
}
