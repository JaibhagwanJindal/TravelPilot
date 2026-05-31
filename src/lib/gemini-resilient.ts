/**
 * gemini-resilient.ts
 *
 * Production-grade Gemini wrapper with:
 *  - 3x retry with exponential backoff  (0s → 1s → 3s)
 *  - Automatic model fallback           (gemini-2.5-flash → gemini-2.0-flash)
 *  - Emergency local template           (never returns 500 from Gemini issues)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface GeminiCallOptions {
  prompt: string;
  /** Defaults to 'application/json' */
  mimeType?: string;
}

export interface GeminiResult {
  text: string;
  /** Which model actually answered */
  usedModel: string;
  /** true if we fell back to the local emergency template */
  isEmergencyFallback: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRIMARY_MODEL   = 'gemini-2.5-flash';
const FALLBACK_MODEL  = 'gemini-2.0-flash';
const RETRY_DELAYS_MS = [0, 1_000, 3_000]; // attempt 1, 2, 3

/** Status codes from the Gemini SDK that are transient and worth retrying */
const RETRYABLE_STATUS = new Set([429, 500, 503]);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true when the thrown error looks like a transient Gemini API failure
 * (rate-limit, server overload, or unavailability).
 */
function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;

  // Google's generative-ai SDK embeds the HTTP status in various places
  const status: number | undefined =
    e.status ?? e.statusCode ?? e.httpStatusCode ?? e.response?.status;

  if (status !== undefined) return RETRYABLE_STATUS.has(status);

  // Fallback: check the error message for known patterns
  const msg: string = (e.message ?? '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('service unavailable') ||
    msg.includes('too many requests') ||
    msg.includes('quota')
  );
}

// ─── Core: call one model with retries ─────────────────────────────────────────
async function callModelWithRetry(
  genAI: GoogleGenerativeAI,
  modelName: string,
  options: GeminiCallOptions
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      console.log(`[gemini-resilient] Waiting ${delay}ms before attempt ${attempt + 1} on ${modelName}…`);
      await sleep(delay);
    }

    try {
      console.log(`[gemini-resilient] Attempt ${attempt + 1}/${RETRY_DELAYS_MS.length} — model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: options.mimeType ?? 'application/json' },
      });

      const result = await model.generateContent(options.prompt);
      const text = result.response.text();

      console.log(`[gemini-resilient] ✓ Success on attempt ${attempt + 1} using ${modelName}`);
      return text;
    } catch (err: unknown) {
      lastError = err;
      const retryable = isRetryableError(err);
      console.warn(
        `[gemini-resilient] Attempt ${attempt + 1} failed (${modelName}):`,
        (err as any)?.message ?? err,
        retryable ? '→ will retry' : '→ non-retryable, aborting'
      );

      // If it's not a transient error (e.g. bad API key, invalid request)
      // don't waste retries — bubble it up immediately
      if (!retryable) throw err;
    }
  }

  throw lastError;
}

// ─── Public API ────────────────────────────────────────────────────────────────
/**
 * Call Gemini with full resilience:
 * 1. Try PRIMARY_MODEL up to 3 times (exponential backoff).
 * 2. If all fail, try FALLBACK_MODEL once.
 * 3. If that also fails, return an emergency local itinerary template.
 *
 * This function NEVER throws — callers always get a GeminiResult.
 */
export async function callGeminiResilient(
  apiKey: string,
  options: GeminiCallOptions,
  emergencyTemplate: object
): Promise<GeminiResult> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // ── Phase 1: Primary model with retries ──────────────────────────────────────
  try {
    const text = await callModelWithRetry(genAI, PRIMARY_MODEL, options);
    return { text, usedModel: PRIMARY_MODEL, isEmergencyFallback: false };
  } catch (primaryErr) {
    console.error(
      `[gemini-resilient] All retries on ${PRIMARY_MODEL} exhausted. Switching to fallback model…`
    );
  }

  // ── Phase 2: Fallback model (single attempt) ─────────────────────────────────
  try {
    console.log(`[gemini-resilient] Attempting fallback model: ${FALLBACK_MODEL}`);
    const text = await callModelWithRetry(genAI, FALLBACK_MODEL, options);
    return { text, usedModel: FALLBACK_MODEL, isEmergencyFallback: false };
  } catch (fallbackErr) {
    console.error(
      `[gemini-resilient] ${FALLBACK_MODEL} also failed. Using emergency local template.`,
      (fallbackErr as any)?.message ?? fallbackErr
    );
  }

  // ── Phase 3: Emergency local template ────────────────────────────────────────
  console.warn('[gemini-resilient] ⚠ Returning emergency itinerary template (AI unavailable).');
  return {
    text: JSON.stringify(emergencyTemplate),
    usedModel: 'emergency-local',
    isEmergencyFallback: true,
  };
}

// ─── Normalise a raw Gemini response string into a safe object ─────────────────
export function parseAndNormaliseItinerary(raw: string): any {
  let data: any;

  try {
    data = JSON.parse(raw);
  } catch {
    console.error('[gemini-resilient] JSON.parse failed on Gemini response, using empty shell.');
    data = {};
  }

  // Defensive normalisation — the model may omit or mistype these
  if (!Array.isArray(data.days))        data.days = [];
  if (!Array.isArray(data.travelTips))  data.travelTips = [];

  data.days = data.days.map((day: any) => ({
    ...day,
    activities:          Array.isArray(day.activities)          ? day.activities          : [],
    foodRecommendations: Array.isArray(day.foodRecommendations) ? day.foodRecommendations : [],
    estimatedCost:       typeof day.estimatedCost === 'number'  ? day.estimatedCost       : 0,
  }));

  return data;
}
