'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, Clock, Coffee } from 'lucide-react'
import { useTimerStore } from '@/store/timer-store'
import { useEffect, useRef } from 'react'

interface TimerDisplayProps {
  pomodoroEnabled?: boolean
  pomodoroDuration?: number
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function TimerDisplay({ pomodoroEnabled }: TimerDisplayProps) {
  const activeTaskId            = useTimerStore((s) => s.activeTaskId)
  const activeSession           = useTimerStore((s) => s.activeSession)
  const activeTaskLog           = useTimerStore((s) => s.activeTaskLog)
  const sessionElapsedSeconds   = useTimerStore((s) => s.sessionElapsedSeconds)
  const sessionElapsedAtPause   = useTimerStore((s) => s.sessionElapsedAtPause)
  const taskLogStartMs          = useTimerStore((s) => s.taskLogStartMs)
  const pomodoroTimeRemaining   = useTimerStore((s) => s.pomodoroTimeRemaining)
  const pomodoroSessionComplete = useTimerStore((s) => s.pomodoroSessionComplete)
  const breakTimeRemaining      = useTimerStore((s) => s.breakTimeRemaining)

  const setSessionElapsedSeconds = useTimerStore((s) => s.setSessionElapsedSeconds)
  const startTaskTick            = useTimerStore((s) => s.startTaskTick)

  // We keep a local render-ticker so the display refreshes every second while
  // running, without storing wall-clock values in global state on every tick.
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, forceRender] = useTickReducer()

  // When a task becomes active, record the start ms (if not already set)
  useEffect(() => {
    if (activeTaskId && activeTaskLog && !taskLogStartMs) {
      startTaskTick(Date.now())
    }
  }, [activeTaskId, activeTaskLog, taskLogStartMs, startTaskTick])

  // Tick: update session elapsed every second while task is running
  useEffect(() => {
    if (!activeTaskId || !taskLogStartMs) {
      if (rafRef.current) clearInterval(rafRef.current)
      return
    }

    rafRef.current = setInterval(() => {
      const delta = Math.floor((Date.now() - taskLogStartMs) / 1000)
      setSessionElapsedSeconds(sessionElapsedAtPause + delta)
      forceRender()
    }, 1000)

    return () => {
      if (rafRef.current) clearInterval(rafRef.current)
    }
  // Re-register when task starts/stops or the pause baseline changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId, taskLogStartMs, sessionElapsedAtPause])

  // ── Derived display values ──────────────────────────────────────────────
  const isRunning  = !!activeTaskId
  const isInSession = !!activeSession
  const isPaused   = isInSession && !isRunning

  // Task timer: accumulated task total time + current elapsed since log start
  const taskBaseSeconds = (activeTaskLog?.task?.totalTime ?? 0)
  const taskDeltaSeconds = taskLogStartMs
    ? Math.floor((Date.now() - taskLogStartMs) / 1000)
    : 0
  const taskDisplaySeconds = isRunning ? taskBaseSeconds + taskDeltaSeconds : 0

  // Session timer: accumulated while tasks ran (pauses when no task active)
  const sessionDisplaySeconds = isRunning
    ? sessionElapsedAtPause + (taskLogStartMs ? Math.floor((Date.now() - taskLogStartMs) / 1000) : 0)
    : sessionElapsedSeconds

  const pomodoroActive = pomodoroEnabled && pomodoroTimeRemaining !== null
  const breakActive    = pomodoroEnabled && breakTimeRemaining !== null && breakTimeRemaining > 0

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center">

          {/* Session Timer */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Session</span>
              {isPaused && <Badge variant="secondary" className="text-xs">Paused</Badge>}
            </div>
            <div className={`text-4xl md:text-5xl font-mono font-bold tracking-wider ${
              isRunning ? 'text-primary' : isPaused ? 'text-yellow-500' : 'text-muted-foreground'
            }`}>
              {formatTime(sessionDisplaySeconds)}
            </div>
          </div>

          <div className="hidden md:block h-16 w-px bg-border" />
          <div className="md:hidden h-px w-16 bg-border" />

          {/* Task Timer */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="h-5 w-5" />
              <span className="text-sm font-medium">Current Task</span>
              {isRunning && (
                <Badge variant="default" className="text-xs animate-pulse">Running</Badge>
              )}
            </div>
            <div className={`text-4xl md:text-5xl font-mono font-bold tracking-wider ${
              isRunning ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {formatTime(taskDisplaySeconds)}
            </div>
          </div>

          {/* Pomodoro Work Timer */}
          {pomodoroActive && !breakActive && (
            <>
              <div className="hidden md:block h-16 w-px bg-border" />
              <div className="md:hidden h-px w-16 bg-border" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coffee className="h-5 w-5" />
                  <span className="text-sm font-medium">Pomodoro</span>
                  {pomodoroSessionComplete && (
                    <Badge variant="destructive" className="text-xs">Time&apos;s Up!</Badge>
                  )}
                  {!pomodoroSessionComplete && !isRunning && (
                    <Badge variant="secondary" className="text-xs">Paused</Badge>
                  )}
                </div>
                <div className={`text-4xl md:text-5xl font-mono font-bold tracking-wider ${
                  pomodoroSessionComplete ? 'text-red-500' : isRunning ? 'text-orange-500' : 'text-yellow-500'
                }`}>
                  {formatTime(pomodoroTimeRemaining || 0)}
                </div>
              </div>
            </>
          )}

          {/* Break Timer */}
          {breakActive && (
            <>
              <div className="hidden md:block h-16 w-px bg-border" />
              <div className="md:hidden h-px w-16 bg-border" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coffee className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Break</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                    Rest time
                  </Badge>
                </div>
                <div className="text-4xl md:text-5xl font-mono font-bold tracking-wider text-green-500">
                  {formatTime(breakTimeRemaining!)}
                </div>
              </div>
            </>
          )}

        </div>
      </CardContent>
    </Card>
  )
}

/** Minimal force-render hook using a reducer */
function useTickReducer(): [number, () => void] {
  const [tick, setTick] = useReducerShim()
  return [tick, () => setTick((n: number) => n + 1)]
}

// Small shim so we don't need to import useReducer separately
import { useState } from 'react'
function useReducerShim(): [number, React.Dispatch<React.SetStateAction<number>>] {
  return useState(0)
}
