'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Loader2 } from 'lucide-react'
import { TaskItem } from './task-item'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useStartTask, usePauseTask, useActiveSession } from '@/hooks/use-api'
import { useTimerStore } from '@/store/timer-store'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TaskListProps {
  onCompleteTask?: (task: { id: string; name: string }) => void
}

interface ApiTask {
  id: string
  name: string
  status: string
  totalTime: number
  createdAt: string
  completedAt: string | null
}

interface ApiTaskLog {
  id: string
  taskId: string
  endTime: string | null
  task?: { name: string }
}

interface ApiSession {
  id: string
  taskLogs?: ApiTaskLog[]
}

export function TaskList({ onCompleteTask }: TaskListProps) {
  const [newTaskName, setNewTaskName] = useState('')
  const activeTaskId     = useTimerStore((s) => s.activeTaskId)
  const setActiveTask    = useTimerStore((s) => s.setActiveTask)
  const setActiveSession = useTimerStore((s) => s.setActiveSession)
  const startTaskTick    = useTimerStore((s) => s.startTaskTick)
  const pauseTaskTick    = useTimerStore((s) => s.pauseTaskTick)
  const sessionElapsedSeconds = useTimerStore((s) => s.sessionElapsedSeconds)

  const { data: rawTasks, isLoading } = useTasks('active')
  const tasks = rawTasks as ApiTask[] | undefined
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const startTask = useStartTask()
  const pauseTask = usePauseTask()
  const { data: rawSession } = useActiveSession()
  const session = rawSession as ApiSession | null | undefined

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskName.trim()) {
      createTask.mutate(newTaskName.trim(), {
        onSuccess: () => setNewTaskName(''),
      })
    }
  }

  const handleStartTask = (taskId: string) => {
    startTask.mutate(taskId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (data: any) => {
        setActiveTask(taskId, data.taskLog ?? null)
        setActiveSession(data.session ?? null)
        startTaskTick(Date.now())
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

  const handleCompleteTask = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId)
    
    // First pause if running
    if (activeTaskId === taskId) {
      pauseTask.mutate(undefined, {
        onSuccess: () => {
          setActiveTask(null, null)
          updateTask.mutate({ id: taskId, data: { status: 'completed' } })
          if (task && onCompleteTask) {
            onCompleteTask(task)
          }
        },
      })
    } else {
      updateTask.mutate({ id: taskId, data: { status: 'completed' } })
      if (task && onCompleteTask) {
        onCompleteTask(task)
      }
    }
  }

  const handleDeleteTask = (taskId: string) => {
    if (activeTaskId === taskId) {
      pauseTask.mutate(undefined, {
        onSuccess: () => {
          setActiveTask(null, null)
          deleteTask.mutate(taskId)
        },
      })
    } else {
      deleteTask.mutate(taskId)
    }
  }

  // Sync active task from session
  const runningTaskId = session?.taskLogs?.find((log) => log.endTime === null)?.taskId

  return (
    <div className="flex flex-col gap-4">
      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          disabled={createTask.isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={!newTaskName.trim() || createTask.isPending}>
          {createTask.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks && tasks.length > 0 ? (
        <ScrollArea className="flex-1" style={{ maxHeight: '400px' }}>
          <div className="flex flex-col gap-2 pr-4">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isActive={runningTaskId === task.id || activeTaskId === task.id}
                isRunning={runningTaskId === task.id && !!(session?.taskLogs?.some((l) => l.endTime === null))}
                onStart={handleStartTask}
                onPause={handlePauseTask}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks yet. Add one above to get started!</p>
        </div>
      )}
    </div>
  )
}
