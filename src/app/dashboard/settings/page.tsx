import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "./settings-form"

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient()
  
  // For a hackathon without strict Auth, we'll just fetch the first settings row
  // or create a generic default one.
  let settings = null;
  try {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()
    settings = data;
  } catch (e) {
    console.error("Settings fetch error:", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your default preferences for AI trip generation.
        </p>
      </div>
      
      <SettingsForm initialData={settings || {}} />
    </div>
  )
}
