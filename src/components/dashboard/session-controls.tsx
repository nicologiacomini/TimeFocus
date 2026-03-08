'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Square, Loader2, Circle } from 'lucide-react'
import { useActiveSession, useStopSession, usePauseTask } from '@/hooks/use-api'
import { useTimerStore } from '@/store/timer-store'

export function SessionControls() {
  const { data: session, isLoading } = useActiveSession()
  const stopSession = useStopSession()
  const pauseTask = usePauseTask()
  const setActiveTask    = useTimerStore((s) => s.setActiveTask)
  const resetTimers      = useTimerStore((s) => s.resetTimers)
  const pauseTaskTick    = useTimerStore((s) => s.pauseTaskTick)
  const sessionElapsedSeconds = useTimerStore((s) => s.sessionElapsedSeconds)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runningTask = (session as any)?.taskLogs?.find((log: { endTime: string | null }) => log.endTime === null)

  const handleStopSession = () => {
    stopSession.mutate(undefined, {
      onSuccess: () => {
        resetTimers()
      },
    })
  }

  const handlePauseTask = () => {
    pauseTask.mutate(undefined, {
      onSuccess: () => {
        pauseTaskTick(sessionElapsedSeconds)
        setActiveTask(null, null)
      },
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // No session at all → show idle placeholder
  if (!session) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Circle className="h-4 w-4" />
            <span className="text-sm">No active session. Start a task to begin.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant={runningTask ? 'default' : 'secondary'} className="gap-1">
              <Circle className={`h-2 w-2 ${runningTask ? 'fill-current animate-pulse' : ''}`} />
              {runningTask ? 'Session Active' : 'Session Paused'}
            </Badge>
            {runningTask && (
              <span className="text-sm text-muted-foreground">
                Working on: <span className="font-medium text-foreground">{runningTask.task?.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {runningTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseTask}
                disabled={pauseTask.isPending}
              >
                {pauseTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Pause Task'
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopSession}
              disabled={stopSession.isPending}
              className="gap-1"
            >
              {stopSession.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  End Session
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
