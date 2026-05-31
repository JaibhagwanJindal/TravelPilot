"use client"

import { useState } from "react"
import { TripForm } from "@/features/trips/components/trip-form"
import { TripItinerary } from "@/features/trips/components/trip-itinerary"
import { GeneratedTripResponse } from "@/types/trip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NewTripPage() {
  const [generatedTrip, setGeneratedTrip] = useState<GeneratedTripResponse | null>(null)

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {generatedTrip ? "Your Itinerary" : "Plan a New Trip"}
        </h1>
        {generatedTrip && (
          <Button variant="outline" size="sm" onClick={() => setGeneratedTrip(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
          </Button>
        )}
      </div>

      {!generatedTrip ? (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle>Tell us about your adventure</CardTitle>
            <CardDescription>
              Our AI will craft a personalized itinerary based on your preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <TripForm onTripGenerated={setGeneratedTrip} />
          </CardContent>
        </Card>
      ) : (
        <TripItinerary trip={generatedTrip} />
      )}
    </div>
  )
}
