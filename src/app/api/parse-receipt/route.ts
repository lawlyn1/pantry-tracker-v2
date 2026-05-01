import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 1, 
});

const SYSTEM_PROMPT = `Extract food/drink items from Tesco receipt.

MULTIPLIERS: Calculate total quantity (e.g., "3† Water 24x500ml" → qty:72, size:500, type:ml).
SHORT-DATED: Extract all items from "shorter life" section.
ALCOHOL: Include all Wine, Port, Spirits as "Drink".
SYMBOLS: Ignore † and ‡ (tax markers).

JSON keys: n, q, up, tp, cat, stor, shelf, size, type, cal, pro, carb, fat
(n=name, q=quantity, up=unit_price, tp=total_price, cat=category, stor=storage_location, shelf=shelf_life_days, size=unit_size, type=unit_type, cal=calories, pro=protein_g, carb=carbs_g, fat=fat_g)

STORAGE: Raw meat/dairy/fresh produce→fridge. Tinned/dry pasta→pantry. Frozen→freezer. Default: fridge for perishables, pantry for shelf-stable.

NUTRITION: Estimate cal/pro/carb/fat per 100g/ml (0 for non-food).

Exclude ONLY non-consumable household items.
Respond ONLY with JSON: {"items": [...]}`;

const SYSTEM_PROMPT_FAST = `Extract food/drink items from Tesco receipt.

MULTIPLIERS: Calculate total quantity (e.g., "3† Water 24x500ml" → qty:72, size:500, type:ml).
SHORT-DATED: Extract all items from "shorter life" section.
ALCOHOL: Include all Wine, Port, Spirits as "Drink".
SYMBOLS: Ignore † and ‡ (tax markers).

JSON keys: n, q, up, tp, cat, stor, shelf, size, type, cal:0, pro:0, carb:0, fat:0
(n=name, q=quantity, up=unit_price, tp=total_price, cat=category, stor=storage_location, shelf=shelf_life_days, size=unit_size, type=unit_type, cal=calories, pro=protein_g, carb=carbs_g, fat=fat_g)

STORAGE: Raw meat/dairy/fresh produce→fridge. Tinned/dry pasta→pantry. Frozen→freezer. Default: fridge for perishables, pantry for shelf-stable.

Exclude ONLY non-consumable household items.
Respond ONLY with JSON: {"items": [...]}`;

function cleanReceiptText(text: string) {
  // Strip VAT daggers that cause the LLM to choke
  let cleaned = text.replace(/[†‡]/g, '');

  const startIdx = cleaned.indexOf('Substitutions') !== -1 
    ? cleaned.indexOf('Substitutions') 
    : (cleaned.indexOf('Items with a shorter life') !== -1 
        ? cleaned.indexOf('Items with a shorter life') 
        : cleaned.indexOf('QtyProduct'));
    
  const endIdx = cleaned.indexOf('Basket value before offers');

  if (startIdx !== -1) {
    cleaned = cleaned.substring(
      startIdx, 
      endIdx !== -1 ? endIdx : cleaned.length
    );
  }
  
  return cleaned.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = body.rawText || body.text;
    const deepMacroScan = body.deepMacroScan !== false; // Default to true
    
    if (!rawText) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

    const cleanedText = cleanReceiptText(rawText);
    const selectedPrompt = deepMacroScan ? SYSTEM_PROMPT : SYSTEM_PROMPT_FAST;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: selectedPrompt },
        { role: 'user', content: cleanedText }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    console.log(`[DEBUG] Deep Macro Scan: ${deepMacroScan}, Used ${deepMacroScan ? 'full' : 'fast'} prompt`);

    const content = chatCompletion.choices[0]?.message?.content || '{"items": []}';
    const parsed = JSON.parse(content);
    const allItems = parsed.items || [];

    // Map short JSON keys back to full names
    const mappedItems = allItems.map((item: any) => ({
      name: item.n,
      quantity: item.q,
      unit_price: item.up,
      total_price: item.tp,
      category: item.cat,
      storage_location: item.stor,
      shelf_life_days: item.shelf,
      unit_size: item.size,
      unit_type: item.type,
      calories: item.cal || 0,
      protein_g: item.pro || 0,
      carbs_g: item.carb || 0,
      fat_g: item.fat || 0,
    }));

    console.log(`[DEBUG] AI returned ${mappedItems.length} items from parsed receipt`);

    const validItems = mappedItems.filter((item: any) => {
      if (!item || typeof item !== 'object' || !item.name) return false;
      const name = item.name.toLowerCase();
      // Strict exclusions for non-food
      const isServiceCharge = name.includes('basket') || name.includes('delivery') || name.includes('minimum charge');
      const isHousehold = name.includes('dishcloth') || name.includes('foil') || name.includes('bleach') || name.includes('kitchen roll');
      
      return !isServiceCharge && !isHousehold;
    });

    console.log(`[DEBUG] ${validItems.length} items passed backend filter`);
    console.log(`[DEBUG] ${allItems.length - validItems.length} items rejected by backend filter`);

    return NextResponse.json({ items: validItems });
  } catch (error: any) {
    console.error("Parse Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
