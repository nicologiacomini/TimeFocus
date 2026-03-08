import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// GET /api/sessions - Get all sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    if (active === 'true') {
      // Get the active session
      const activeSession = await db.session.findFirst({
        where: {
          userId: user.id,
          endTime: null,
        },
        include: {
          taskLogs: {
            where: {
              endTime: null,
            },
            include: {
              task: true,
            },
          },
        },
      })
      return NextResponse.json(activeSession)
    }

    const sessions = await db.session.findMany({
      where: {
        userId: user.id,
        endTime: { not: null },
      },
      orderBy: {
        startTime: 'desc',
      },
      include: {
        taskLogs: {
          include: {
            task: true,
          },
        },
      },
      take: 50,
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions - Start a new session (called when starting a task)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Check if task exists and belongs to user
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
        status: 'active',
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not active' }, { status: 404 })
    }

    // Check if there's already an active session
    const existingSession = await db.session.findFirst({
      where: {
        userId: user.id,
        endTime: null,
      },
    })

    if (existingSession) {
      // Check if there's an active task log in this session
      const activeLog = await db.taskLog.findFirst({
        where: {
          sessionId: existingSession.id,
          endTime: null,
        },
      })

      if (activeLog) {
        // Stop the active task log
        const now = new Date()
        const duration = Math.floor((now.getTime() - activeLog.startTime.getTime()) / 1000)
        await db.taskLog.update({
          where: { id: activeLog.id },
          data: {
            endTime: now,
            duration,
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
      }

      // Create a new task log in the existing session
      const taskLog = await db.taskLog.create({
        data: {
          taskId,
          sessionId: existingSession.id,
        },
        include: {
          task: true,
          session: true,
        },
      })

      return NextResponse.json({
        session: existingSession,
        taskLog,
        isNewSession: false,
      })
    }

    // Create a new session with the task log
    const session = await db.session.create({
      data: {
        userId: user.id,
        taskLogs: {
          create: {
            taskId,
          },
        },
      },
      include: {
        taskLogs: {
          include: {
            task: true,
          },
        },
      },
    })

    return NextResponse.json({
      session,
      taskLog: session.taskLogs[0],
      isNewSession: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sessions - Stop the active session
export async function DELETE(request: NextRequest) {
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

    // Stop any active task logs
    const activeLogs = await db.taskLog.findMany({
      where: {
        sessionId: activeSession.id,
        endTime: null,
      },
    })

    const now = new Date()

    for (const log of activeLogs) {
      const duration = Math.floor((now.getTime() - log.startTime.getTime()) / 1000)
      await db.taskLog.update({
        where: { id: log.id },
        data: {
          endTime: now,
          duration,
        },
      })

      // Update task total time
      await db.task.update({
        where: { id: log.taskId },
        data: {
          totalTime: {
            increment: duration,
          },
        },
      })
    }

    // Calculate total session time
    const allLogs = await db.taskLog.findMany({
      where: {
        sessionId: activeSession.id,
      },
    })
    const totalSessionTime = allLogs.reduce((sum, log) => sum + log.duration, 0)

    // End the session
    const session = await db.session.update({
      where: { id: activeSession.id },
      data: {
        endTime: now,
        totalTime: totalSessionTime,
      },
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error stopping session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
