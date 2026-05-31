import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, currency, theme } = body;
    
    const supabase = await createClient();
    
    if (id) {
      const { error } = await supabase
        .from('settings')
        .update({ currency, theme })
        .eq('id', id);
        
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ currency, theme });
        
      if (error) throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings error:", error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
