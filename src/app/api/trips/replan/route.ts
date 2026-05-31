import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      day,
      currentItinerary,
      destination,
      weather,
      plannedBudget,
      constraints,
      tripId,
    } = body;

    const prompt = `You are an expert travel planner. The user wants to REPLAN a single day of their trip based on new circumstances.
    
    Destination: ${destination}
    Day Number: ${day}
    Planned Budget (Total for trip): $${plannedBudget}
    Current Weather: ${weather?.condition || 'Unknown'} - ${weather?.description || ''} (Temp: ${weather?.temp || 'Unknown'}°C, Raining: ${weather?.isRaining})
    Constraints & Requirements: ${constraints?.length ? constraints.join(", ") : "None"}
    
    Here is the CURRENT itinerary for Day ${day}:
    ${JSON.stringify(currentItinerary, null, 2)}
    
    INSTRUCTIONS:
    - Update the activities and food recommendations to better suit the Current Weather (e.g. if it is raining, suggest indoor activities unless outdoor is requested).
    - Respect all Constraints & Requirements (e.g., Vegetarian, Wheelchair Accessible).
    - Act as a Route Optimizer. Order the activities logically by geographic proximity to minimize transit time.
    - Return the updated day itinerary as a valid JSON object matching the exact structure below, with no markdown formatting, no code blocks, and no extra text.
    
    {
      "day": ${day},
      "title": "Title of the day's theme or main area",
      "activities": [
        {
          "title": "Activity Name",
          "location": "Specific location or address",
          "description": "Brief description of what to do",
          "estimatedTransitTime": "15 mins walking"
        }
      ],
      "foodRecommendations": ["Restaurant 1", "Restaurant 2"],
      "estimatedCost": 0
    }`;

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
    
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      return NextResponse.json({ success: false, error: 'Failed to generate valid day itinerary format' }, { status: 500 });
    }
    
    // If we have a tripId, update it in Supabase
    if (tripId) {
      try {
        const supabase = await createClient();
        
        // Fetch the current trip
        const { data: trip } = await supabase
          .from('trips')
          .select('itinerary')
          .eq('id', tripId)
          .single();
          
        if (trip && trip.itinerary && trip.itinerary.days) {
          // Replace the specific day
          const updatedDays = trip.itinerary.days.map((d: any) => 
            d.day === parsedData.day ? parsedData : d
          );
          
          const newItinerary = {
            ...trip.itinerary,
            days: updatedDays
          };
          
          // Save back to Supabase
          await supabase
            .from('trips')
            .update({ itinerary: newItinerary })
            .eq('id', tripId);
        }
      } catch (dbErr) {
        console.error("Failed to update trip in Supabase:", dbErr);
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error("Error replanning trip day:", error);
    return NextResponse.json({ success: false, error: 'Failed to replan day' }, { status: 500 });
  }
}
