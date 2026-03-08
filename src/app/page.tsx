'use client'

import { useSession } from 'next-auth/react'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { TimerDisplay } from '@/components/dashboard/timer-display'
import { TaskList } from '@/components/dashboard/task-list'
import { SessionControls } from '@/components/dashboard/session-controls'
import { ArchivedTaskList } from '@/components/dashboard/archived-tasks'
import { SessionHistory } from '@/components/dashboard/session-history'
import { SettingsPanel } from '@/components/dashboard/settings-panel'
import { LoginForm } from '@/components/auth/login-form'
import { StatsSummary } from '@/components/dashboard/stats-summary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Timer, Archive, Settings, Clock, History } from 'lucide-react'
import { useSettings, useActiveSession, usePauseTask, useStartTask } from '@/hooks/use-api'
import { useTimerStore } from '@/store/timer-store'
import { useEffect, useRef, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ---------------------------------------------------------------------------
// PomodoroHandler — renders nothing, manages pomodoro + break countdowns.
// The countdown only advances while a task is actively running (activeTaskId).
// ---------------------------------------------------------------------------
function PomodoroHandler() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settingsRaw } = useSettings()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = settingsRaw as any

  const activeTaskId       = useTimerStore((s) => s.activeTaskId)
  const activeSession      = useTimerStore((s) => s.activeSession)
  const pomodoroRemainingAtPause = useTimerStore((s) => s.pomodoroRemainingAtPause)
  const autoResumeTaskId   = useTimerStore((s) => s.autoResumeTaskId)
  const breakTimeRemaining = useTimerStore((s) => s.breakTimeRemaining)

  const setPomodoroTimeRemaining  = useTimerStore((s) => s.setPomodoroTimeRemaining)
  const setPomodoroRemainingAtPause = useTimerStore((s) => s.setPomodoroRemainingAtPause)
  const setPomodoroSessionComplete  = useTimerStore((s) => s.setPomodoroSessionComplete)
  const setBreakTimeRemaining       = useTimerStore((s) => s.setBreakTimeRemaining)
  const setAutoResumeTaskId         = useTimerStore((s) => s.setAutoResumeTaskId)
  const setActiveTask               = useTimerStore((s) => s.setActiveTask)
  const setActiveSession            = useTimerStore((s) => s.setActiveSession)
  const startTaskTick               = useTimerStore((s) => s.startTaskTick)

  const pauseTask = usePauseTask()
  const startTask = useStartTask()

  // Ref so intervals can read the latest values without being deps
  const pomodoroRemainingRef   = useRef<number | null>(null)
  const breakRemainingRef      = useRef<number | null>(null)
  const isBreakRef             = useRef(false)
  // Tracks which "work cycle start" timestamp we are counting from
  const workCycleStartMsRef    = useRef<number | null>(null)
  // Snapshot of remaining at pause, set when task pauses
  const remainingAtPauseRef    = useRef<number | null>(null)

  // Keep refs in sync with store
  useEffect(() => { remainingAtPauseRef.current = pomodoroRemainingAtPause }, [pomodoroRemainingAtPause])
  useEffect(() => { breakRemainingRef.current = breakTimeRemaining }, [breakTimeRemaining])

  const notify = useCallback((title: string, body: string, enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo.svg' })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(title, { body, icon: '/logo.svg' })
        })
      }
    }
  }, [])

  // ── Work-phase interval ──────────────────────────────────────────────────
  useEffect(() => {
    if (!settings?.pomodoroEnabled) {
      setPomodoroTimeRemaining(null)
      setPomodoroSessionComplete(false)
      setPomodoroRemainingAtPause(null)
      isBreakRef.current = false
      workCycleStartMsRef.current = null
      return
    }

    // Not running → nothing to tick
    if (!activeTaskId) return

    // Break is active → don't run work countdown
    if (isBreakRef.current) return

    const totalSeconds = settings.pomodoroDuration * 60

    // On first start (or after a new cycle), set workCycleStartMs so we know
    // how far we are into this cycle.
    if (workCycleStartMsRef.current === null) {
      const alreadyElapsed = totalSeconds - (remainingAtPauseRef.current ?? totalSeconds)
      workCycleStartMsRef.current = Date.now() - alreadyElapsed * 1000
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - workCycleStartMsRef.current!) / 1000)
      const remaining = Math.max(0, totalSeconds - elapsed)
      pomodoroRemainingRef.current = remaining
      setPomodoroTimeRemaining(remaining)

      if (remaining === 0) {
        // ── Pomodoro complete ──
        setPomodoroSessionComplete(true)
        clearInterval(intervalId)
        workCycleStartMsRef.current = null

        const interruptedTaskId = activeTaskId  // capture before pause clears it
        setAutoResumeTaskId(interruptedTaskId)

        notify('Pomodoro Complete!',
          `Time for a ${settings.breakDuration} minute break.`,
          settings.notificationsEnabled)
        toast({ title: 'Pomodoro Complete!', description: `Take a ${settings.breakDuration} min break.` })

        // Pause the running task via API
        pauseTask.mutate(undefined, {
          onSuccess: () => {
            setActiveTask(null, null)
          },
        })

        // Start break
        isBreakRef.current = true
        const breakSeconds = settings.breakDuration * 60
        setBreakTimeRemaining(breakSeconds)
        breakRemainingRef.current = breakSeconds
      }
    }

    tick()
    const intervalId = setInterval(tick, 1000)
    return () => {
      clearInterval(intervalId)
      // Snapshot remaining so we can resume from here
      if (pomodoroRemainingRef.current !== null) {
        setPomodoroRemainingAtPause(pomodoroRemainingRef.current)
        remainingAtPauseRef.current = pomodoroRemainingRef.current
        workCycleStartMsRef.current = null
      }
    }
  // Re-run when task starts/stops or settings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId, settings?.pomodoroEnabled, settings?.pomodoroDuration])

  // ── Break-phase interval ─────────────────────────────────────────────────
  useEffect(() => {
    if (!settings?.pomodoroEnabled) return
    if (!isBreakRef.current) return
    if (breakTimeRemaining === null || breakTimeRemaining <= 0) return

    const breakSeconds = settings.breakDuration * 60
    const startedAt = Date.now() - (breakSeconds - breakTimeRemaining) * 1000

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, breakSeconds - elapsed)
      breakRemainingRef.current = remaining
      setBreakTimeRemaining(remaining)

      if (remaining === 0) {
        clearInterval(intervalId)
        isBreakRef.current = false
        setBreakTimeRemaining(null)
        setPomodoroSessionComplete(false)
        setPomodoroTimeRemaining(settings.pomodoroDuration * 60)
        setPomodoroRemainingAtPause(null)
        remainingAtPauseRef.current = null

        notify('Break over!', 'Ready for your next pomodoro.', settings.notificationsEnabled)
        toast({ title: 'Break over!', description: 'Starting next pomodoro.' })

        // Auto-resume the interrupted task if it still exists and is active
        const tid = autoResumeTaskId
        if (tid) {
          setAutoResumeTaskId(null)
          startTask.mutate(tid, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSuccess: (data: any) => {
              setActiveTask(tid, data.taskLog ?? null)
              setActiveSession(data.session ?? null)
              startTaskTick(Date.now())
              workCycleStartMsRef.current = Date.now()
            },
          })
        }
      }
    }

    tick()
    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBreakRef.current, settings?.pomodoroEnabled, settings?.breakDuration])

  // ── If user presses Play during break → cancel break, start new cycle ───
  useEffect(() => {
    if (!settings?.pomodoroEnabled) return
    if (!activeTaskId) return
    if (!isBreakRef.current) return

    // Task became active during break → cancel break, new cycle
    isBreakRef.current = false
    setBreakTimeRemaining(null)
    setAutoResumeTaskId(null)
    setPomodoroSessionComplete(false)
    setPomodoroRemainingAtPause(null)
    remainingAtPauseRef.current = null
    workCycleStartMsRef.current = Date.now()
    setPomodoroTimeRemaining(settings.pomodoroDuration * 60)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId])

  return null
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export default function Home() {
  const { data: session, status } = useSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settingsRaw } = useSettings()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = settingsRaw as any

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PomodoroHandler />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">TimeFocus</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                  <AvatarFallback>
                    {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Stats Summary */}
          <StatsSummary />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column — Timer & Tasks */}
            <div className="lg:col-span-2 space-y-6">
              <TimerDisplay
                pomodoroEnabled={settings?.pomodoroEnabled}
                pomodoroDuration={settings?.pomodoroDuration}
              />
              <SessionControls />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Active Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList />
                </CardContent>
              </Card>
            </div>

            {/* Right Column — Tabs */}
            <div className="space-y-6">
              <Tabs defaultValue="sessions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sessions" className="gap-1">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Sessions</span>
                  </TabsTrigger>
                  <TabsTrigger value="archive" className="gap-1">
                    <Archive className="h-4 w-4" />
                    <span className="hidden sm:inline">Archive</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sessions" className="mt-4">
                  <SessionHistory />
                </TabsContent>

                <TabsContent value="archive" className="mt-4">
                  <ArchivedTaskList />
                </TabsContent>

                <TabsContent value="settings" className="mt-4">
                  <SettingsPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          TimeFocus — Track your time, boost your productivity
        </div>
      </footer>
    </div>
  )
}
