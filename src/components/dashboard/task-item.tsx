'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, CheckCircle, Trash2, Timer } from 'lucide-react'
import { useTimerStore } from '@/store/timer-store'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  name: string
  status: string
  totalTime: number
  createdAt: string
  completedAt: string | null
}

interface TaskItemProps {
  task: Task
  isActive: boolean
  isRunning: boolean
  onStart: (taskId: string) => void
  onPause: () => void
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onEdit?: (taskId: string, newName: string) => void
}

function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function TaskItem({
  task,
  isActive,
  isRunning,
  onStart,
  onPause,
  onComplete,
  onDelete,
}: TaskItemProps) {
  const taskLogStartMs = useTimerStore((s) => s.taskLogStartMs)

  // Live task elapsed: base accumulated time + seconds since this log started
  const liveDelta = isActive && isRunning && taskLogStartMs
    ? Math.floor((Date.now() - taskLogStartMs) / 1000)
    : 0
  const displayTime = task.totalTime + liveDelta

  return (
    <Card className={cn(
      "transition-all duration-200",
      isActive && isRunning && "ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20",
      isActive && !isRunning && "ring-2 ring-primary",
      task.status === 'completed' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-medium truncate",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.name}
              </h3>
              {isActive && isRunning && (
                <Badge variant="default" className="animate-pulse shrink-0">
                  Running
                </Badge>
              )}
              {isActive && !isRunning && (
                <Badge variant="secondary" className="shrink-0">
                  Paused
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>{formatTotalTime(displayTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.status === 'active' && (
              <>
                {isActive && isRunning ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPause()}
                    className="gap-1"
                  >
                    <Pause className="h-4 w-4" />
                    <span className="hidden sm:inline">Pause</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onStart(task.id)}
                    className="gap-1"
                  >
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">Start</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(task.id)}
                  disabled={isRunning}
                  title={isRunning ? 'Pause task before marking as done' : undefined}
                  className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-40"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Done</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(task.id)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
