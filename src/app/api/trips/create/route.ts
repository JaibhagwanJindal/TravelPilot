import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60000;

// ─── Request Validation Schema ─────────────────────────────────────────────────
const createTripSchema = z.object({
  destination: z.string().min(2, 'Destination too short'),
  dateRange: z.object({
    from: z.string().or(z.date()),
    to: z.string().or(z.date()),
  }),
  budget: z.enum(['Budget', 'Moderate', 'Luxury']).optional().default('Moderate'),
  plannedBudget: z.union([z.string(), z.number()]).optional(),
  travelers: z.union([z.string(), z.number()]).optional().default(1),
  travelStyle: z.string().optional().default('Relaxed'),
  // interests can arrive as a string (textarea) or array — handle both
  interests: z.union([z.string(), z.array(z.string())]).optional(),
  transportation: z.string().optional(),
  // constraints can arrive as an array or undefined
  constraints: z.array(z.string()).optional().default([]),
});

// ─── Helper ────────────────────────────────────────────────────────────────────
/** Normalise interests: string → string, array → comma-joined string */
function normaliseInterests(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value.trim();
  return '';
}

/** Always return a safe string[] for any array-like field */
function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  // ── Validate & parse incoming payload ────────────────────────────────────────
  const parsed = createTripSchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error('[create/route] Validation failed:', fieldErrors);
    return NextResponse.json(
      { success: false, error: 'Invalid request data.', details: fieldErrors },
      { status: 400 }
    );
  }

  const {
    destination,
    dateRange,
    budget,
    plannedBudget,
    travelers,
    travelStyle,
    interests: rawInterests,
    transportation,
    constraints: rawConstraints,
  } = parsed.data;

  // ── Normalise values ─────────────────────────────────────────────────────────
  const interestsStr = normaliseInterests(rawInterests) || 'General sightseeing';
  const constraintsArr = safeArray(rawConstraints);

  console.log('[create/route] Received payload:', {
    destination,
    budget,
    plannedBudget,
    travelers,
    travelStyle,
    interestsStr,
    constraintsArr,
    transportation,
  });

  // ── Date handling ─────────────────────────────────────────────────────────────
  let startDate: Date;
  let endDate: Date;
  try {
    startDate = new Date(dateRange.from as string);
    endDate = new Date(dateRange.to as string);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date values');
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid date range provided.' },
      { status: 400 }
    );
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const budgetNum = plannedBudget ? parseFloat(plannedBudget.toString()) : 0;

  // ── Build prompt ──────────────────────────────────────────────────────────────
  const prompt = `You are an expert travel planner. Create a detailed trip itinerary based on the following preferences:

Destination: ${destination}
Duration: ${durationDays} days (from ${startDate.toDateString()} to ${endDate.toDateString()})
Budget Tier: ${budget}
Planned Budget Amount: $${budgetNum}
Number of Travelers: ${travelers}
Travel Style: ${travelStyle}
Interests & Preferences: ${interestsStr}
Transportation Preference: ${transportation || 'Any'}
Constraints & Requirements: ${constraintsArr.length > 0 ? constraintsArr.join(', ') : 'None'}

Your goal is to optimize the route each day to minimize transit times.

Return ONLY a valid JSON object matching this exact structure (no markdown, no code blocks, no extra text):
{
  "tripName": "A catchy name for the trip",
  "destination": "${destination}",
  "summary": "A brief 2-3 sentence summary of the trip",
  "estimatedBudget": { "total": <number>, "currency": "USD" },
  "days": [
    {
      "day": <number>,
      "title": "Day title",
      "activities": [
        {
          "title": "Activity name",
          "description": "Activity description",
          "location": "Specific location or address",
          "lat": <number>,
          "lng": <number>,
          "estimatedCost": <number>,
          "estimatedTransitTime": "e.g. 15 mins walk to next location"
        }
      ],
      "foodRecommendations": ["Food 1", "Food 2"],
      "estimatedCost": <number>
    }
  ],
  "travelTips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[create/route] GEMINI_API_KEY is missing!');
    return NextResponse.json(
      { success: false, error: 'AI service is not configured.' },
      { status: 503 }
    );
  }

  // ── Call Gemini ───────────────────────────────────────────────────────────────
  let parsedData: any;
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    console.log('[create/route] Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('[create/route] Gemini raw response length:', responseText.length);

    parsedData = JSON.parse(responseText);

    // Defensive normalization of Gemini's response
    if (!Array.isArray(parsedData.days)) parsedData.days = [];
    if (!Array.isArray(parsedData.travelTips)) parsedData.travelTips = [];

    parsedData.days = parsedData.days.map((day: any) => ({
      ...day,
      activities: Array.isArray(day.activities) ? day.activities : [],
      foodRecommendations: Array.isArray(day.foodRecommendations) ? day.foodRecommendations : [],
      estimatedCost: typeof day.estimatedCost === 'number' ? day.estimatedCost : 0,
    }));

    // Attach meta fields needed by the frontend
    parsedData.plannedBudget = budgetNum;
    parsedData.constraints = constraintsArr;

  } catch (geminiError: any) {
    console.error('[create/route] Gemini error:', geminiError?.message || geminiError);
    return NextResponse.json(
      { success: false, error: 'Failed to generate itinerary. Please try again.' },
      { status: 500 }
    );
  }

  // ── Save to Supabase (non-blocking) ───────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data: insertedTrip, error: dbError } = await supabase
      .from('trips')
      .insert({
        trip_name: parsedData.tripName,
        destination: parsedData.destination,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        budget: budgetNum,
        itinerary: parsedData,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[create/route] Supabase insert error:', dbError.message);
    } else if (insertedTrip) {
      parsedData.id = insertedTrip.id;
      console.log('[create/route] Trip saved to Supabase, id:', insertedTrip.id);
    }
  } catch (dbErr: any) {
    console.error('[create/route] Supabase exception:', dbErr?.message || dbErr);
    // Non-fatal — still return the generated itinerary
  }

  return NextResponse.json({ success: true, data: parsedData });
}
