import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGeminiResilient, parseAndNormaliseItinerary } from '@/lib/gemini-resilient';

/** Emergency single-day replan returned when all AI providers are unavailable */
function buildEmergencyDayReplan(day: number, destination: string, currentItinerary: any) {
  return {
    day,
    title: currentItinerary?.title ?? `Day ${day} — ${destination}`,
    activities: currentItinerary?.activities?.length
      ? currentItinerary.activities
      : [
          {
            title: 'Explore the local area',
            description: 'Visit nearby attractions and take in the local atmosphere.',
            location: destination,
            estimatedTransitTime: 'Varies',
          },
        ],
    foodRecommendations:
      currentItinerary?.foodRecommendations?.length
        ? currentItinerary.foodRecommendations
        : ['Local cuisine', 'Nearby cafés'],
    estimatedCost: currentItinerary?.estimatedCost ?? 100,
    _note: 'AI service temporarily unavailable — this day plan is unchanged from your original.',
  };
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    day,
    currentItinerary,
    destination,
    weather,
    plannedBudget,
    constraints,
    tripId,
  } = body;

  // ── Input guard ───────────────────────────────────────────────────────────────
  if (!destination || day == null) {
    return NextResponse.json(
      { success: false, error: 'destination and day are required.' },
      { status: 400 }
    );
  }

  const safeConstraints = Array.isArray(constraints) ? constraints : [];

  // ── Check API key ─────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[replan/route] GEMINI_API_KEY missing — returning current itinerary unchanged.');
    const emergency = buildEmergencyDayReplan(day, destination, currentItinerary);
    return NextResponse.json({ success: true, data: emergency, _warning: 'AI service not configured' });
  }

  // ── Build prompt ──────────────────────────────────────────────────────────────
  const prompt = `You are an expert travel planner. The user wants to REPLAN a single day of their trip based on new circumstances.

Destination: ${destination}
Day Number: ${day}
Planned Budget (Total for trip): $${plannedBudget ?? 'Unknown'}
Current Weather: ${weather?.condition ?? 'Unknown'} - ${weather?.description ?? ''} (Temp: ${weather?.temp ?? 'Unknown'}°C, Raining: ${weather?.isRaining ?? false})
Constraints & Requirements: ${safeConstraints.length ? safeConstraints.join(', ') : 'None'}

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

  // ── Call Gemini (with retry + model fallback + emergency template) ─────────────
  const emergencyDayTemplate = buildEmergencyDayReplan(day, destination, currentItinerary);

  const geminiResult = await callGeminiResilient(apiKey, { prompt }, emergencyDayTemplate);

  console.log('[replan/route] Gemini result — model:', geminiResult.usedModel, '| emergency:', geminiResult.isEmergencyFallback);

  // Parse response (fall back to the un-replanned day if JSON is malformed)
  let parsedData: any;
  try {
    parsedData = JSON.parse(geminiResult.text);
  } catch {
    console.error('[replan/route] JSON parse failed, using emergency day plan.');
    parsedData = emergencyDayTemplate;
  }

  // Defensive normalisation
  if (!Array.isArray(parsedData.activities))          parsedData.activities          = currentItinerary?.activities ?? [];
  if (!Array.isArray(parsedData.foodRecommendations)) parsedData.foodRecommendations = currentItinerary?.foodRecommendations ?? [];
  if (typeof parsedData.estimatedCost !== 'number')   parsedData.estimatedCost       = currentItinerary?.estimatedCost ?? 0;

  // ── Persist to Supabase (non-blocking) ────────────────────────────────────────
  if (tripId) {
    try {
      const supabase = await createClient();

      const { data: trip } = await supabase
        .from('trips')
        .select('itinerary')
        .eq('id', tripId)
        .single();

      if (trip?.itinerary?.days) {
        const updatedDays = trip.itinerary.days.map((d: any) =>
          d.day === parsedData.day ? parsedData : d
        );
        await supabase
          .from('trips')
          .update({ itinerary: { ...trip.itinerary, days: updatedDays } })
          .eq('id', tripId);
      }
    } catch (dbErr) {
      console.error('[replan/route] Supabase update error:', dbErr);
    }
  }

  const response: any = { success: true, data: parsedData };
  if (geminiResult.isEmergencyFallback) {
    response._warning = 'AI service temporarily unavailable. Your original day plan is shown instead.';
  }

  return NextResponse.json(response);
}
