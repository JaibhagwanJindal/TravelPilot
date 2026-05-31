import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT = 5; // Max requests
const WINDOW_MS = 60000; // Per minute

export async function POST(request: Request) {
  // Extract IP for rate limiting (simplistic approach for Next.js app router)
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  
  let rateData = rateLimitMap.get(ip);
  if (!rateData || now > rateData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
  } else {
    rateData.count++;
    if (rateData.count > RATE_LIMIT) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  try {
    const body = await request.json();
    const {
      destination,
      dateRange,
      budget,
      travelers,
      travelStyle,
      interests,
      transportation,
      plannedBudget,
      constraints,
    } = body;

    // Calculate duration in days
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const prompt = `You are an expert travel planner. Create a detailed trip itinerary based on the following preferences:
    
    Destination: ${destination}
    Duration: ${durationDays} days (from ${startDate.toDateString()} to ${endDate.toDateString()})
    Budget Tier: ${budget}
    Planned Budget Amount: $${plannedBudget}
    Number of Travelers: ${travelers}
    Travel Style: ${travelStyle}
    Interests: ${interests.join(', ')}
    Constraints: ${constraints ? constraints.join(', ') : 'None'}

    Your goal is to optimize the route each day to minimize transit times.

    Return the itinerary strictly in the following JSON format:
    {
      "tripName": "A catchy name for the trip",
      "destination": "${destination}",
      "summary": "A brief summary of the trip",
      "estimatedBudget": { "total": <number>, "currency": "USD" },
      "days": [
        {
          "day": <number>,
          "title": "Day title (e.g. Exploring the Historical Center)",
          "activities": [
            {
              "title": "Activity name",
              "description": "Activity description",
              "location": "Specific location or address",
              "lat": <number_latitude_approximate>,
              "lng": <number_longitude_approximate>,
              "estimatedCost": <number>,
              "estimatedTransitTime": "e.g. 15 mins walk to next location"
            }
          ],
          "foodRecommendations": ["Food 1", "Food 2"],
          "estimatedCost": <number_total_cost_for_day>
        }
      ],
      "travelTips": ["Tip 1", "Tip 2"]
    }
  `;

    // Note: In production you should ensure GEMINI_API_KEY is present
    if (!process.env.GEMINI_API_KEY) {
       console.warn("GEMINI_API_KEY is missing. Ensure you have set it in .env.local");
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const parsedData = JSON.parse(responseText);

    // Save to Supabase
    try {
      const supabase = await createClient();
      const { data: insertedTrip, error } = await supabase
        .from('trips')
        .insert({
          trip_name: parsedData.tripName,
          destination: parsedData.destination,
          start_date: startDate,
          end_date: endDate,
          budget: plannedBudget ? parseFloat(plannedBudget.toString()) : null,
          itinerary: parsedData
        })
        .select()
        .single();
        
      if (error) {
        console.error("Failed to save trip to Supabase:", error);
        // Continue anyway to return the itinerary to the user, even if DB fails
      } else {
        // Embed the database ID into the response so we can update it later
        parsedData.id = insertedTrip.id;
      }
    } catch (dbError) {
      console.error("Supabase error:", dbError);
    }
    
    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error generating trip:", error);
    return NextResponse.json({ success: false, error: 'Failed to create trip' }, { status: 500 });
  }
}
