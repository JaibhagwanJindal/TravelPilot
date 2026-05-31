import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params;
  
  await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    
  redirect("/dashboard/trips")
}
