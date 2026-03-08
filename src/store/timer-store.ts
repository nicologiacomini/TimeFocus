import { create } from 'zustand'

export interface Task {
  id: string
  name: string
  status: 'active' | 'completed'
  totalTime: number
  createdAt: string
  completedAt: string | null
}

export interface TaskLog {
  id: string
  taskId: string
  sessionId: string
  startTime: string
  endTime: string | null
  duration: number
  task: Task
}

export interface Session {
  id: string
  startTime: string
  endTime: string | null
  totalTime: number
  taskLogs: TaskLog[]
}

export interface Settings {
  id: string
  pomodoroEnabled: boolean
  pomodoroDuration: number
  breakDuration: number
  notificationsEnabled: boolean
}

interface TimerState {
  // Active state
  activeTaskId: string | null
  activeSession: Session | null
  activeTaskLog: TaskLog | null

  // Session elapsed: accumulated seconds while tasks were running (excludes paused gaps).
  // This is updated live by TimerDisplay's interval.
  sessionElapsedSeconds: number
  // Snapshot of sessionElapsedSeconds taken at the moment the last task was paused
  sessionElapsedAtPause: number
  // Wall-clock ms when the current task-log started ticking (for live delta)
  taskLogStartMs: number | null

  // Pomodoro state — countdown ticks only while a task is running
  pomodoroTimeRemaining: number | null
  // Snapshot of remaining when task paused, so we can resume from here
  pomodoroRemainingAtPause: number | null
  pomodoroSessionComplete: boolean

  // Break state
  breakTimeRemaining: number | null
  // Task to auto-resume when break ends
  autoResumeTaskId: string | null

  // Settings
  settings: Settings | null

  // Actions
  setActiveTask: (taskId: string | null, taskLog: TaskLog | null) => void
  setActiveSession: (session: Session | null) => void
  /** Record wall-clock start for the live tick */
  startTaskTick: (taskLogStartMs: number) => void
  /** Snapshot accumulated seconds and clear the tick start on pause */
  pauseTaskTick: (accumulatedSessionSeconds: number) => void
  setSessionElapsedSeconds: (seconds: number) => void
  setPomodoroTimeRemaining: (seconds: number | null) => void
  setPomodoroRemainingAtPause: (seconds: number | null) => void
  setPomodoroSessionComplete: (complete: boolean) => void
  setBreakTimeRemaining: (seconds: number | null) => void
  setAutoResumeTaskId: (taskId: string | null) => void
  setSettings: (settings: Settings) => void
  resetTimers: () => void
}

export const useTimerStore = create<TimerState>((set) => ({
  activeTaskId: null,
  activeSession: null,
  activeTaskLog: null,

  sessionElapsedSeconds: 0,
  sessionElapsedAtPause: 0,
  taskLogStartMs: null,

  pomodoroTimeRemaining: null,
  pomodoroRemainingAtPause: null,
  pomodoroSessionComplete: false,

  breakTimeRemaining: null,
  autoResumeTaskId: null,

  settings: null,

  setActiveTask: (taskId, taskLog) => set({ activeTaskId: taskId, activeTaskLog: taskLog }),

  setActiveSession: (session) => set({ activeSession: session }),

  startTaskTick: (taskLogStartMs) => set({ taskLogStartMs }),

  pauseTaskTick: (accumulatedSessionSeconds) =>
    set({ taskLogStartMs: null, sessionElapsedAtPause: accumulatedSessionSeconds }),

  setSessionElapsedSeconds: (seconds) => set({ sessionElapsedSeconds: seconds }),

  setPomodoroTimeRemaining: (seconds) => set({ pomodoroTimeRemaining: seconds }),

  setPomodoroRemainingAtPause: (seconds) => set({ pomodoroRemainingAtPause: seconds }),

  setPomodoroSessionComplete: (complete) => set({ pomodoroSessionComplete: complete }),

  setBreakTimeRemaining: (seconds) => set({ breakTimeRemaining: seconds }),

  setAutoResumeTaskId: (taskId) => set({ autoResumeTaskId: taskId }),

  setSettings: (settings) => set({ settings }),

  resetTimers: () =>
    set({
      activeTaskId: null,
      activeSession: null,
      activeTaskLog: null,
      sessionElapsedSeconds: 0,
      sessionElapsedAtPause: 0,
      taskLogStartMs: null,
      pomodoroTimeRemaining: null,
      pomodoroRemainingAtPause: null,
      pomodoroSessionComplete: false,
      breakTimeRemaining: null,
      autoResumeTaskId: null,
    }),
}))
