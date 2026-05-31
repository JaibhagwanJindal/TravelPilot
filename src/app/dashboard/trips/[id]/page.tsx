import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TripItinerary } from "@/features/trips/components/trip-itinerary"

export const dynamic = 'force-dynamic';

export default async function TripDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  
  let trip = null;
  try {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();
    trip = data;
  } catch (e) {
    console.error("Trip details fetch error:", e);
  }

  if (!trip) {
    notFound();
  }

  return (
    <div className="container max-w-5xl py-6 mx-auto">
      <TripItinerary trip={trip.itinerary} />
    </div>
  );
}
