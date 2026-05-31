import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGeminiResilient, parseAndNormaliseItinerary } from '@/lib/gemini-resilient';
import { z } from 'zod';

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS  = 60_000;

// ─── Request Validation Schema ─────────────────────────────────────────────────
const createTripSchema = z.object({
  destination:   z.string().min(2, 'Destination too short'),
  dateRange:     z.object({ from: z.string().or(z.date()), to: z.string().or(z.date()) }),
  budget:        z.enum(['Budget', 'Moderate', 'Luxury']).optional().default('Moderate'),
  plannedBudget: z.union([z.string(), z.number()]).optional(),
  travelers:     z.union([z.string(), z.number()]).optional().default(1),
  travelStyle:   z.string().optional().default('Relaxed'),
  interests:     z.union([z.string(), z.array(z.string())]).optional(),
  transportation: z.string().optional(),
  constraints:   z.array(z.string()).optional().default([]),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function normaliseInterests(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value.trim();
  return '';
}

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/** Emergency itinerary returned when all AI providers are unavailable */
function buildEmergencyItinerary(params: {
  destination: string;
  durationDays: number;
  budgetNum: number;
  constraintsArr: string[];
}) {
  const { destination, durationDays, budgetNum, constraintsArr } = params;
  const dailyCost = budgetNum > 0 ? Math.round(budgetNum / durationDays) : 100;

  return {
    tripName:        `Your Trip to ${destination}`,
    destination,
    summary:
      `A ${durationDays}-day trip to ${destination}. ` +
      `Our AI is temporarily unavailable, so this is a starter template — ` +
      `tap "Replan Day" on any day once the service recovers to get personalised suggestions.`,
    estimatedBudget: { total: budgetNum || durationDays * 100, currency: 'USD' },
    days: Array.from({ length: durationDays }, (_, i) => ({
      day:   i + 1,
      title: `Day ${i + 1} — Explore ${destination}`,
      activities: [
        {
          title:                `Morning exploration of ${destination}`,
          description:          'Start your day by visiting the most popular local attractions.',
          location:             destination,
          lat:                  0,
          lng:                  0,
          estimatedCost:        Math.round(dailyCost * 0.3),
          estimatedTransitTime: 'Varies',
        },
        {
          title:                'Afternoon cultural experience',
          description:          'Visit a local museum, gallery, or cultural landmark.',
          location:             destination,
          lat:                  0,
          lng:                  0,
          estimatedCost:        Math.round(dailyCost * 0.3),
          estimatedTransitTime: 'Varies',
        },
        {
          title:                'Evening dining & leisure',
          description:          'Enjoy local cuisine at a highly-rated restaurant.',
          location:             destination,
          lat:                  0,
          lng:                  0,
          estimatedCost:        Math.round(dailyCost * 0.4),
          estimatedTransitTime: 'Varies',
        },
      ],
      foodRecommendations: ['Local specialties', 'Street food', 'Nearby restaurants'],
      estimatedCost:       dailyCost,
    })),
    travelTips: [
      `Research the local currency and tipping customs before you arrive in ${destination}.`,
      'Keep digital and physical copies of all important documents.',
      'Download offline maps for navigation without roaming charges.',
      constraintsArr.length > 0
        ? `Your requirements (${constraintsArr.join(', ')}) — verify options locally before booking.`
        : 'Book popular attractions in advance to avoid queues.',
    ].filter(Boolean),
    _note: 'This is an AI-unavailable emergency template. Use "Replan Day" to get AI-generated activities.',
  };
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // ── Rate limiting ─────────────────────────────────────────────────────────────
  const ip  = request.headers.get('x-forwarded-for') || 'anonymous';
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

  // ── Parse body ────────────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  // ── Zod validation ────────────────────────────────────────────────────────────
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

  const interestsStr    = normaliseInterests(rawInterests) || 'General sightseeing';
  const constraintsArr  = safeArray(rawConstraints);

  // ── Date handling ─────────────────────────────────────────────────────────────
  let startDate: Date;
  let endDate:   Date;
  try {
    startDate = new Date(dateRange.from as string);
    endDate   = new Date(dateRange.to   as string);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid date range provided.' }, { status: 400 });
  }

  const diffTime    = Math.abs(endDate.getTime() - startDate.getTime());
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const budgetNum   = plannedBudget ? parseFloat(plannedBudget.toString()) : 0;

  console.log('[create/route] Payload:', { destination, budget, budgetNum, travelers, travelStyle, interestsStr, constraintsArr });

  // ── Check API key ─────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[create/route] GEMINI_API_KEY missing — returning emergency template');
    const emergency: any = buildEmergencyItinerary({ destination, durationDays, budgetNum, constraintsArr });
    emergency.plannedBudget  = budgetNum;
    emergency.constraints    = constraintsArr;
    return NextResponse.json({ success: true, data: emergency, _warning: 'AI service not configured' });
  }

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

  // ── Call Gemini (with retry + model fallback + emergency template) ─────────────
  const emergencyTemplate = buildEmergencyItinerary({ destination, durationDays, budgetNum, constraintsArr });

  const geminiResult = await callGeminiResilient(apiKey, { prompt }, emergencyTemplate);

  console.log('[create/route] Gemini result — model:', geminiResult.usedModel, '| emergency:', geminiResult.isEmergencyFallback);

  const parsedData = parseAndNormaliseItinerary(geminiResult.text);

  // Ensure required top-level fields are always present
  if (!parsedData.tripName)        parsedData.tripName        = emergencyTemplate.tripName;
  if (!parsedData.destination)     parsedData.destination     = destination;
  if (!parsedData.summary)         parsedData.summary         = emergencyTemplate.summary;
  if (!parsedData.estimatedBudget) parsedData.estimatedBudget = emergencyTemplate.estimatedBudget;
  if (parsedData.days.length === 0) parsedData.days           = emergencyTemplate.days;

  parsedData.plannedBudget  = budgetNum;
  parsedData.constraints    = constraintsArr;

  // ── Save to Supabase (non-blocking) ───────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data: insertedTrip, error: dbError } = await supabase
      .from('trips')
      .insert({
        trip_name:  parsedData.tripName,
        destination: parsedData.destination,
        start_date:  startDate.toISOString(),
        end_date:    endDate.toISOString(),
        budget:      budgetNum,
        itinerary:   parsedData,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[create/route] Supabase insert error:', dbError.message);
    } else if (insertedTrip) {
      parsedData.id = insertedTrip.id;
      console.log('[create/route] Trip saved, id:', insertedTrip.id);
    }
  } catch (dbErr: any) {
    console.error('[create/route] Supabase exception:', dbErr?.message ?? dbErr);
  }

  const response: any = { success: true, data: parsedData };
  if (geminiResult.isEmergencyFallback) {
    response._warning = 'AI service temporarily unavailable. This is a template itinerary — use Replan Day to customise.';
  }

  return NextResponse.json(response);
}
