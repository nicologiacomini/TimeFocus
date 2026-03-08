'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Timer, Calendar, Clock, Loader2 } from 'lucide-react'
import { useTasks, useTaskLogs } from '@/hooks/use-api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'

function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

interface ArchivedTaskListProps {
  onSelectTask?: (taskId: string) => void
}

export function ArchivedTaskList({ onSelectTask }: ArchivedTaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const { data: tasks, isLoading } = useTasks('completed')
  const { data: taskLogs, isLoading: logsLoading } = useTaskLogs(expandedTaskId)

  const handleToggle = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Archived Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Archived Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No completed tasks yet. Complete a task to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Archived Tasks
          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {tasks.map((task: { id: string; name: string; totalTime: number; completedAt: string }) => (
              <Collapsible
                key={task.id}
                open={expandedTaskId === task.id}
                onOpenChange={() => handleToggle(task.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedTaskId === task.id ? 'rotate-180' : ''}`} />
                        <span className="font-medium">{task.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatTotalTime(task.totalTime)}
                        </div>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 pr-2 py-2 space-y-2">
                    {logsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : taskLogs && taskLogs.length > 0 ? (
                      taskLogs.map((sessionGroup: { session: { id: string; startTime: string; endTime: string | null }; totalTime: number; logs: { id: string; startTime: string; endTime: string; duration: number }[] }) => (
                        <div
                          key={sessionGroup.session.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {format(new Date(sessionGroup.session.startTime), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {formatTotalTime(sessionGroup.totalTime)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No session data available
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
