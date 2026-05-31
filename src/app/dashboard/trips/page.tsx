import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Map, Trash, Eye, PlusCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export const dynamic = 'force-dynamic';

export default async function TripsPage() {
  const supabase = await createClient();
  let trips: any[] | null = [];
  try {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });
    trips = data;
  } catch (e) {
    console.error("Trips fetch error:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
          <p className="text-muted-foreground">Manage and view your generated itineraries.</p>
        </div>
        <Link href="/dashboard/trips/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Trip
          </Button>
        </Link>
      </div>

      {!trips || trips.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Map className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-xl mb-2">No trips planned yet</CardTitle>
          <CardDescription className="max-w-sm mb-6">
            You haven't generated any AI itineraries yet. Start planning your next adventure today!
          </CardDescription>
          <Link href="/dashboard/trips/new">
            <Button>Plan Your First Trip</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const startDate = trip.start_date ? new Date(trip.start_date) : null;
            const endDate = trip.end_date ? new Date(trip.end_date) : null;
            const isUpcoming = startDate && startDate > new Date();
            
            return (
              <Card key={trip.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <Badge variant={isUpcoming ? "default" : "secondary"}>
                      {isUpcoming ? "Upcoming" : "Past"}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-1">{trip.trip_name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-medium text-foreground">
                    <Map className="h-3 w-3" /> {trip.destination}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Unknown'} - {endDate ? format(endDate, 'MMM d, yyyy') : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm line-clamp-3">
                    {trip.itinerary?.summary || "No summary available."}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t gap-2">
                  <Link href={`/dashboard/trips/${trip.id}`} className="flex-1">
                    <Button variant="default" className="w-full gap-2">
                      <Eye className="h-4 w-4" /> View
                    </Button>
                  </Link>
                  <form action={`/api/trips/${trip.id}/delete`} method="POST">
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 border-destructive/20" type="submit" aria-label="Delete Trip">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  )
}
