'use client'

import { useSessions } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Loader2, CalendarDays, ChevronDown, ChevronRight, Timer, Clock } from 'lucide-react'
import { useState } from 'react'

interface TaskLog {
  id: string
  taskId: string
  startTime: string
  endTime: string | null
  duration: number
  task: { id: string; name: string }
}

interface Session {
  id: string
  startTime: string
  endTime: string | null
  totalTime: number
  taskLogs: TaskLog[]
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  if (secs > 0 && mins < 10) return `${mins}m ${secs}s`
  return `${mins}m`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Group task logs by taskId and sum their durations */
function groupByTask(taskLogs: TaskLog[]): { taskId: string; name: string; totalSeconds: number; count: number }[] {
  const map = new Map<string, { name: string; totalSeconds: number; count: number }>()
  for (const log of taskLogs) {
    const key = log.taskId
    const existing = map.get(key)
    if (existing) {
      existing.totalSeconds += log.duration
      existing.count += 1
    } else {
      map.set(key, {
        name: log.task?.name ?? 'Unknown task',
        totalSeconds: log.duration,
        count: 1,
      })
    }
  }
  return Array.from(map.entries()).map(([taskId, v]) => ({ taskId, ...v }))
}

function SessionRow({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const taskGroups = groupByTask(session.taskLogs ?? [])
  const endTime = session.endTime ? formatTimeOnly(session.endTime) : 'ongoing'

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors p-4 select-none">
            <div className="flex flex-col items-start gap-1 w-full">
            {/* Title and icons on the first line */}
            <div className="flex items-center gap-3 min-w-0 w-full">
                {open
                ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <CardTitle className="text-sm font-medium truncate">
                {formatDateTime(session.startTime)}
                <span className="text-muted-foreground font-normal ml-1">
                    → {endTime}
                </span>
                </CardTitle>
            </div>
            
            {/* Badges on the second line, aligned left */}
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {formatDuration(session.totalTime)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                {taskGroups.length} task{taskGroups.length !== 1 ? 's' : ''}
                </Badge>
            </div>
            </div>
        </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-3 flex flex-col gap-2">
              {taskGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No task logs recorded.</p>
              ) : (
                taskGroups.map((group) => (
                  <div key={group.taskId} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Timer className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                      {group.count > 1 && (
                        <span className="text-xs">({group.count} logs)</span>
                      )}
                      <Badge variant="secondary" className="text-xs font-mono">
                        {formatDuration(group.totalSeconds)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function SessionHistory() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions, isLoading } = useSessions() as { data: Session[] | undefined; isLoading: boolean }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <CalendarDays className="h-10 w-10 opacity-30" />
        <p className="text-sm">No completed sessions yet.</p>
        <p className="text-xs">Finish a session to see it here.</p>
      </div>
    )
  }

  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </div>
  )
}
