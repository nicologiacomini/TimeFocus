import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// POST /api/logs/pause - Pause the active task
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the active session
    const activeSession = await db.session.findFirst({
      where: {
        userId: user.id,
        endTime: null,
      },
    })

    if (!activeSession) {
      return NextResponse.json({ error: 'No active session' }, { status: 404 })
    }

    // Find the active task log
    const activeLog = await db.taskLog.findFirst({
      where: {
        sessionId: activeSession.id,
        endTime: null,
      },
      include: {
        task: true,
      },
    })

    if (!activeLog) {
      return NextResponse.json({ error: 'No active task to pause' }, { status: 404 })
    }

    const now = new Date()
    const duration = Math.floor((now.getTime() - activeLog.startTime.getTime()) / 1000)

    // Update the task log
    const updatedLog = await db.taskLog.update({
      where: { id: activeLog.id },
      data: {
        endTime: now,
        duration,
      },
      include: {
        task: true,
      },
    })

    // Update task total time
    await db.task.update({
      where: { id: activeLog.taskId },
      data: {
        totalTime: {
          increment: duration,
        },
      },
    })

    return NextResponse.json(updatedLog)
  } catch (error) {
    console.error('Error pausing task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/logs - Get task logs for a specific task or session
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const sessionId = searchParams.get('sessionId')

    if (taskId) {
      // Get all logs for a specific task, grouped by session
      const logs = await db.taskLog.findMany({
        where: {
          taskId,
          task: {
            userId: user.id,
          },
        },
        include: {
          session: true,
          task: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      })

      // Group by session
      const groupedLogs = logs.reduce((acc, log) => {
        const sessionId = log.sessionId
        if (!acc[sessionId]) {
          acc[sessionId] = {
            session: log.session,
            logs: [],
            totalTime: 0,
          }
        }
        acc[sessionId].logs.push(log)
        acc[sessionId].totalTime += log.duration
        return acc
      }, {} as Record<string, { session: typeof logs[0]['session']; logs: typeof logs; totalTime: number }>)

      return NextResponse.json(Object.values(groupedLogs))
    }

    if (sessionId) {
      // Get all logs for a specific session
      const logs = await db.taskLog.findMany({
        where: {
          sessionId,
          session: {
            userId: user.id,
          },
        },
        include: {
          task: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      })

      return NextResponse.json(logs)
    }

    return NextResponse.json({ error: 'taskId or sessionId is required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
