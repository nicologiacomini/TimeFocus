'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { User, Coffee, Bell, Loader2 } from 'lucide-react'
import { useSettings, useUpdateSettings, useUser } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'

export function SettingsPanel() {
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const { data: user } = useUser()
  const updateSettings = useUpdateSettings()
  const { toast } = useToast()

  const [nameInput, setNameInput] = useState('')
  const [pomodoroDurationInput, setPomodoroDurationInput] = useState(25)
  const [breakDurationInput, setBreakDurationInput] = useState(5)

  const currentName = nameInput || user?.name || ''
  const currentPomodoroDuration = pomodoroDurationInput || settings?.pomodoroDuration || 25
  const currentBreakDuration = breakDurationInput || settings?.breakDuration || 5

  const handleSaveProfile = () => {
    updateSettings.mutate({ name: currentName }, {
      onSuccess: () => {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        })
      },
    })
  }

  const handleSavePomodoro = () => {
    updateSettings.mutate({
      pomodoroEnabled: settings?.pomodoroEnabled ?? false,
      pomodoroDuration: currentPomodoroDuration,
      breakDuration: currentBreakDuration,
    }, {
      onSuccess: () => {
        toast({
          title: 'Pomodoro settings updated',
          description: 'Your Pomodoro settings have been saved.',
        })
      },
    })
  }

  const handleTogglePomodoro = (enabled: boolean) => {
    updateSettings.mutate({ pomodoroEnabled: enabled })
  }

  const handleToggleNotifications = (enabled: boolean) => {
    updateSettings.mutate({ notificationsEnabled: enabled })
  }

  if (settingsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={currentName}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
              />
              <Button onClick={handleSaveProfile} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Pomodoro Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Pomodoro</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your work session ends
              </p>
            </div>
            <Switch
              checked={settings?.pomodoroEnabled ?? false}
              onCheckedChange={handleTogglePomodoro}
            />
          </div>

          {settings?.pomodoroEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pomodoroDuration">Session Duration (minutes)</Label>
                <Input
                  id="pomodoroDuration"
                  type="number"
                  min={1}
                  max={120}
                  value={currentPomodoroDuration}
                  onChange={(e) => setPomodoroDurationInput(parseInt(e.target.value) || 25)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                <Input
                  id="breakDuration"
                  type="number"
                  min={1}
                  max={60}
                  value={currentBreakDuration}
                  onChange={(e) => setBreakDurationInput(parseInt(e.target.value) || 5)}
                />
              </div>

              <Button 
                onClick={handleSavePomodoro} 
                disabled={updateSettings.isPending}
                className="w-full"
              >
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Pomodoro Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when Pomodoro session ends
              </p>
            </div>
            <Switch
              checked={settings?.notificationsEnabled ?? true}
              onCheckedChange={handleToggleNotifications}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
