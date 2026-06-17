'use client'

import { useState, useEffect } from 'react'
import { saveServarrConfigAction } from '@/actions/servarr'
import { useServarrConfig, refreshServarrConfig } from '@/lib/hooks/useAppData'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings2, Loader2, Save } from 'lucide-react'

export default function ServarrSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cached + prefetched on page load; opening the dialog is instant
  const { data: config, isLoading: fetching } = useServarrConfig()

  const [radarrUrl, setRadarrUrl] = useState('')
  const [radarrApiKey, setRadarrApiKey] = useState('')
  const [radarrRootFolder, setRadarrRootFolder] = useState('/movies')
  const [radarrQualityProfileId, setRadarrQualityProfileId] = useState('1')

  const [sonarrUrl, setSonarrUrl] = useState('')
  const [sonarrApiKey, setSonarrApiKey] = useState('')
  const [sonarrRootFolder, setSonarrRootFolder] = useState('/tv')
  const [sonarrQualityProfileId, setSonarrQualityProfileId] = useState('1')

  // Seed the form from the cached config when it loads or the dialog (re)opens,
  // so reopening discards any unsaved edits and reflects the saved values.
  useEffect(() => {
    if (config) {
      setRadarrUrl(config.radarrUrl || '')
      setRadarrApiKey(config.radarrApiKey || '')
      setRadarrRootFolder(config.radarrRootFolder || '/movies')
      setRadarrQualityProfileId(config.radarrQualityProfileId?.toString() || '1')
      setSonarrUrl(config.sonarrUrl || '')
      setSonarrApiKey(config.sonarrApiKey || '')
      setSonarrRootFolder(config.sonarrRootFolder || '/tv')
      setSonarrQualityProfileId(config.sonarrQualityProfileId?.toString() || '1')
    }
  }, [config, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await saveServarrConfigAction({
        radarrUrl,
        radarrApiKey,
        radarrRootFolder,
        radarrQualityProfileId: parseInt(radarrQualityProfileId),
        sonarrUrl,
        sonarrApiKey,
        sonarrRootFolder,
        sonarrQualityProfileId: parseInt(sonarrQualityProfileId),
      })
      refreshServarrConfig()
      setOpen(false)
    } catch (error) {
      alert('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Server Settings">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Media Server Settings</DialogTitle>
            <DialogDescription>
              Configure your Radarr and Sonarr instances. These settings are private to your account.
            </DialogDescription>
          </DialogHeader>

          {fetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-mono">Loading your config...</p>
            </div>
          ) : (
            <div className="py-6 space-y-8">
              {/* Radarr Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Radarr (Movies)</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="radarrUrl">API URL</Label>
                    <Input
                      id="radarrUrl"
                      placeholder="https://radarr.yourdomain.com"
                      value={radarrUrl}
                      onChange={(e) => setRadarrUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="radarrApiKey">API Key</Label>
                    <Input
                      id="radarrApiKey"
                      type="password"
                      placeholder="Your Radarr API Key"
                      value={radarrApiKey}
                      onChange={(e) => setRadarrApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="radarrRoot">Root Folder</Label>
                    <Input
                      id="radarrRoot"
                      placeholder="/movies"
                      value={radarrRootFolder}
                      onChange={(e) => setRadarrRootFolder(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="radarrProfile">Profile ID</Label>
                    <Input
                      id="radarrProfile"
                      type="number"
                      value={radarrQualityProfileId}
                      onChange={(e) => setRadarrQualityProfileId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sonarr Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sonarr (TV Shows)</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sonarrUrl">API URL</Label>
                    <Input
                      id="sonarrUrl"
                      placeholder="https://sonarr.yourdomain.com"
                      value={sonarrUrl}
                      onChange={(e) => setSonarrUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sonarrApiKey">API Key</Label>
                    <Input
                      id="sonarrApiKey"
                      type="password"
                      placeholder="Your Sonarr API Key"
                      value={sonarrApiKey}
                      onChange={(e) => setSonarrApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sonarrRoot">Root Folder</Label>
                    <Input
                      id="sonarrRoot"
                      placeholder="/tv"
                      value={sonarrRootFolder}
                      onChange={(e) => setSonarrRootFolder(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sonarrProfile">Profile ID</Label>
                    <Input
                      id="sonarrProfile"
                      type="number"
                      value={sonarrQualityProfileId}
                      onChange={(e) => setSonarrQualityProfileId(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || fetching} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
