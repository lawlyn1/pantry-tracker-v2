import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 2,
});

const SYSTEM_PROMPT = `You are a home cook assistant. Given a list of food items that are expiring soon, suggest 2-3 simple recipes that use as many of these items as possible to prevent food waste.

For each recipe provide:
- title
- items_used (array of item names from the list)
- instructions (brief numbered steps, max 6 steps)
- prep_time (e.g. "15 mins")

Respond ONLY with valid JSON: {"recipes":[{"title":"...","items_used":["..."],"instructions":["1. ...","2. ..."],"prep_time":"..."}]}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: { name: string; expiration_date: string | null; quantity: number }[] = body.items || [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No expiring items provided' }, { status: 400 });
    }

    const itemList = items.map(i => `- ${i.name} (qty: ${i.quantity}, expires: ${i.expiration_date || 'unknown'})`).join('\n');

    let chatCompletion;
    let modelUsed = 'llama-3.3-70b-versatile';

    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `These items are expiring soon:\n${itemList}\n\nSuggest recipes to use them up.` },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2048,
      });
    } catch (primaryError: any) {
      const isRateLimit = primaryError?.status === 429 ||
        primaryError?.code === 'rate_limit_exceeded' ||
        primaryError?.message?.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        console.warn('[Groq] Rate-limited, falling back to llama-3.1-8b-instant');
        modelUsed = 'llama-3.1-8b-instant';
        chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `These items are expiring soon:\n${itemList}\n\nSuggest recipes to use them up.` },
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 2048,
        });
      } else {
        throw primaryError;
      }
    }

    const content = chatCompletion.choices[0]?.message?.content || '{"recipes":[]}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[Groq] Invalid JSON from recipe generator:', content.substring(0, 200));
      return NextResponse.json({ error: 'AI returned invalid response. Please try again.' }, { status: 502 });
    }

    console.log(`[Recipe Generator] Model: ${modelUsed} | Recipes: ${(parsed.recipes || []).length}`);

    return NextResponse.json({ recipes: parsed.recipes || [] });
  } catch (error: any) {
    console.error('[Recipe Generator] Error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate recipes. Please try again.' },
      { status: error?.status || 500 }
    );
  }
}
