import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Map, CalendarDays, DollarSign } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = await createClient();
  
  // Fetch real data from Supabase
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  const totalTrips = trips?.length || 0;
  
  const now = new Date();
  const upcomingTrips = trips?.filter(t => t.start_date && new Date(t.start_date) > now) || [];
  const pastTripsCount = totalTrips - upcomingTrips.length;
  
  // Calculate total budget used
  const totalBudget = trips?.reduce((acc, curr) => acc + (curr.budget || 0), 0) || 0;

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Overview</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Trips</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTrips.length}</div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {upcomingTrips.length > 0 
                ? `${upcomingTrips[0].destination} next!` 
                : "No upcoming trips"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Adventures</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastTripsCount}</div>
            <p className="text-xs text-muted-foreground">
              Memories made
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planned Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all generated trips
            </p>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col justify-center items-center p-6 border-dashed">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Plan a new adventure</h3>
          </div>
          <Link href="/dashboard/trips/new">
            <Button className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Trip
            </Button>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest generated itineraries.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!trips || trips.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                You haven't generated any trips yet.
              </div>
            ) : (
              <div className="space-y-8">
                {trips.slice(0, 3).map((trip) => (
                  <div key={trip.id} className="flex items-center">
                    <div className="ml-4 space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{trip.trip_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.destination}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      <Link href={`/dashboard/trips/${trip.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
