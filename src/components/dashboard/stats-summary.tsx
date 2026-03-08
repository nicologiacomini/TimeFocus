'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTasks } from '@/hooks/use-api'
import { useActiveSession } from '@/hooks/use-api'
import { Timer, CheckCircle, Clock, TrendingUp } from 'lucide-react'

function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function StatsSummary() {
  const { data: activeTasks } = useTasks('active')
  const { data: completedTasks } = useTasks('completed')
  const { data: session } = useActiveSession()

  // Calculate total time from completed tasks
  const totalCompletedTime = completedTasks?.reduce(
    (sum: number, task: { totalTime: number }) => sum + task.totalTime,
    0
  ) || 0

  const activeTaskCount = activeTasks?.length || 0
  const completedTaskCount = completedTasks?.length || 0

  const stats = [
    {
      label: 'Active Tasks',
      value: activeTaskCount,
      icon: Timer,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Completed',
      value: completedTaskCount,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Time',
      value: formatTotalTime(totalCompletedTime),
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Session Status',
      value: session ? 'Active' : 'Idle',
      icon: TrendingUp,
      color: session ? 'text-orange-500' : 'text-gray-400',
      bgColor: session ? 'bg-orange-500/10' : 'bg-gray-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
