"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Save } from "lucide-react"

export function SettingsForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState(initialData.currency || "USD")
  const [theme, setTheme] = useState(initialData.theme || "system")
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData.id,
          currency,
          theme
        })
      })
      
      if (!res.ok) throw new Error("Failed to save settings")
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            These settings will be used as defaults for your new trips.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Input 
              id="currency" 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              placeholder="USD, EUR, JPY..."
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">App Theme (System/Light/Dark)</Label>
            <Input 
              id="theme" 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)} 
              placeholder="system"
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
              {message.text}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
