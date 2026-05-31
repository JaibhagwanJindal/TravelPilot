import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    Interests: ${interests}
    Transportation Preference: ${transportation}
    Constraints & Requirements: ${constraints?.length ? constraints.join(", ") : "None"}
    
    IMPORTANT: You must act as a Route Optimizer. Order the activities logically by geographic proximity to minimize transit time between locations.
    
    You MUST return the output exclusively as a valid JSON object matching the exact structure below, with no markdown formatting, no code blocks, and no extra text.
    
    {
      "tripName": "A catchy name for the trip",
      "destination": "The destination name",
      "summary": "A short 2-3 sentence summary of the trip",
      "estimatedBudget": {
        "total": 0,
        "currency": "USD",
        "breakdown": {
          "accommodation": 0,
          "food": 0,
          "activities": 0,
          "transportation": 0
        }
      },
      "days": [
        {
          "day": 1,
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
        }
      ],
      "travelTips": ["Tip 1", "Tip 2", "Tip 3"]
    }`;

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
    
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
      parsedData.plannedBudget = plannedBudget;
      parsedData.constraints = constraints || [];
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      return NextResponse.json({ success: false, error: 'Failed to generate valid itinerary format' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error("Error generating trip:", error);
    return NextResponse.json({ success: false, error: 'Failed to create trip' }, { status: 500 });
  }
}
