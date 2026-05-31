"use client"

import { useState, useEffect } from "react"
import { GeneratedTripResponse, GeneratedTripDay } from "@/types/trip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Map, Calendar, DollarSign, Lightbulb, Coffee, MapPin, CloudRain, Sun, AlertTriangle, RefreshCw, Loader2, Navigation, CloudLightning, Wind } from "lucide-react"

interface TripItineraryProps {
  trip: GeneratedTripResponse;
}

export function TripItinerary({ trip: initialTrip }: TripItineraryProps) {
  const [tripData, setTripData] = useState<GeneratedTripResponse>(initialTrip)
  const [weather, setWeather] = useState<any>(null)
  const [replanningDay, setReplanningDay] = useState<number | null>(null)
  const [replanError, setReplanError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(`/api/weather?destination=${encodeURIComponent(initialTrip.destination)}`)
        const json = await res.json()
        if (json.success) {
          setWeather(json.data)
        }
      } catch (err) {
        console.error("Failed to fetch weather", err)
      }
    }
    fetchWeather()
  }, [initialTrip.destination])

  // Budget Tracking Calculations
  const plannedBudget = tripData.plannedBudget || tripData.estimatedBudget.total;
  const estimatedSpend = tripData.days.reduce((acc, day) => acc + (day.estimatedCost || 0), 0) +
                         (tripData.estimatedBudget.breakdown?.accommodation || 0) +
                         (tripData.estimatedBudget.breakdown?.transportation || 0);
  const remainingBudget = plannedBudget - estimatedSpend;

  const handleReplanDay = async (dayToReplan: GeneratedTripDay) => {
    setReplanningDay(dayToReplan.day);
    setReplanError(null);
    try {
      const response = await fetch("/api/trips/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: dayToReplan.day,
          currentItinerary: dayToReplan,
          destination: tripData.destination,
          weather,
          plannedBudget: tripData.plannedBudget,
          constraints: tripData.constraints,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to replan day");
      }

      // Update the specific day in our local state
      setTripData((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.day === dayToReplan.day ? result.data : d)),
      }));
    } catch (err: any) {
      setReplanError(err.message || "An error occurred while replanning.");
    } finally {
      setReplanningDay(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{tripData.tripName}</h1>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1"><Map className="h-4 w-4" /> {tripData.destination}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {tripData.days.length} Days</span>
          {tripData.constraints?.length > 0 && (
            <span className="flex items-center gap-1 text-primary text-sm font-medium">
              Constraints: {tripData.constraints.join(", ")}
            </span>
          )}
        </div>
        <p className="text-lg">{tripData.summary}</p>
      </div>

      {weather && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {weather.isRaining ? <CloudRain className="h-8 w-8 text-blue-500" /> : <Sun className="h-8 w-8 text-orange-400" />}
              <div>
                <h3 className="font-semibold text-lg">{weather.temp}°C - {weather.condition}</h3>
                <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
              </div>
            </div>
            {weather.alerts && weather.alerts.length > 0 && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-1.5 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{weather.alerts[0]}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Budget Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-medium">Planned Budget</span>
                <span className="font-bold text-lg">${plannedBudget}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-medium">Estimated Spend</span>
                <span className="font-bold text-lg text-primary">${estimatedSpend}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Remaining</span>
                <span className={`font-bold text-lg ${remainingBudget < 0 ? 'text-destructive' : 'text-green-500'}`}>
                  ${remainingBudget}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500" /> Travel Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {tripData.travelTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-2xl font-bold">Daily Itinerary</h2>
          {replanError && <span className="text-sm text-destructive">{replanError}</span>}
        </div>
        
        {tripData.days.map((day) => (
          <Card key={day.day} className="overflow-hidden">
            <div className="bg-primary/5 border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Badge variant="default" className="text-base">Day {day.day}</Badge>
                  {day.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground bg-background px-3 py-1 rounded-full shadow-sm">
                  <DollarSign className="h-4 w-4" /> ${day.estimatedCost}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={replanningDay === day.day}
                  onClick={() => handleReplanDay(day)}
                  className="gap-2"
                >
                  {replanningDay === day.day ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Replan Day
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <Navigation className="h-4 w-4" /> Optimized Route
                </h4>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent">
                  {day.activities.map((activity, i) => (
                    <div key={i} className="relative flex items-start gap-4 pl-8">
                       <div className="absolute left-0 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center -translate-x-[1px] mt-0.5">
                         <span className="text-[10px] font-bold">{i + 1}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="font-semibold text-sm">{activity.title}</span>
                         <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                           <MapPin className="h-3 w-3" /> {activity.location}
                         </span>
                         <p className="text-sm mt-1">{activity.description}</p>
                         {activity.estimatedTransitTime && (
                           <span className="text-xs text-blue-500 mt-1 font-medium bg-blue-50 dark:bg-blue-900/30 w-fit px-2 py-0.5 rounded-sm">
                             Next stop: {activity.estimatedTransitTime}
                           </span>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-orange-500">
                  <Coffee className="h-4 w-4" /> Food & Dining
                </h4>
                <div className="flex flex-wrap gap-2">
                  {day.foodRecommendations.map((food, i) => (
                    <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 py-1 px-3">
                      {food}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
