'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// API helper functions
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

// Tasks API
export function useTasks(status: 'active' | 'completed' = 'active') {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['tasks', status],
    queryFn: () => fetchApi(`/api/tasks?status=${status}`),
    enabled: !!session,
  })
}

export function useTask(id: string | null) {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchApi(`/api/tasks/${id}`),
    enabled: !!session && !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (name: string) => 
      fetchApi('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; status?: string } }) =>
      fetchApi(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/tasks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Sessions API
export function useActiveSession() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['session', 'active'],
    queryFn: () => fetchApi('/api/sessions?active=true'),
    enabled: !!session,
    refetchInterval: 1000, // Refetch every second to keep timer in sync
  })
}

export function useSessions() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetchApi('/api/sessions'),
    enabled: !!session,
  })
}

export function useSessionById(id: string | null) {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchApi(`/api/sessions/${id}`),
    enabled: !!session && !!id,
  })
}

export function useStartTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (taskId: string) =>
      fetchApi('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useStopSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () =>
      fetchApi('/api/sessions', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Pause task
export function usePauseTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () =>
      fetchApi('/api/logs', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Task logs
export function useTaskLogs(taskId: string | null) {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['logs', 'task', taskId],
    queryFn: () => fetchApi(`/api/logs?taskId=${taskId}`),
    enabled: !!session && !!taskId,
  })
}

// Settings API
export function useSettings() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchApi('/api/settings'),
    enabled: !!session,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name?: string
      pomodoroEnabled?: boolean
      pomodoroDuration?: number
      breakDuration?: number
      notificationsEnabled?: boolean
    }) =>
      fetchApi('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

// User API
export function useUser() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['user'],
    queryFn: () => fetchApi('/api/user'),
    enabled: !!session,
  })
}
