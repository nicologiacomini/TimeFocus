import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await db.settings.findUnique({
      where: { userId: user.id },
    })

    if (!settings) {
      settings = await db.settings.create({
        data: { userId: user.id },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, pomodoroEnabled, pomodoroDuration, breakDuration, notificationsEnabled } = body

    const updateData: {
      pomodoroEnabled?: boolean
      pomodoroDuration?: number
      breakDuration?: number
      notificationsEnabled?: boolean
    } = {}

    if (pomodoroEnabled !== undefined) updateData.pomodoroEnabled = pomodoroEnabled
    if (pomodoroDuration !== undefined) updateData.pomodoroDuration = pomodoroDuration
    if (breakDuration !== undefined) updateData.breakDuration = breakDuration
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled

    // Update user name if provided
    if (name !== undefined) {
      await db.user.update({
        where: { id: user.id },
        data: { name },
      })
    }

    const settings = await db.settings.update({
      where: { userId: user.id },
      data: updateData,
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
