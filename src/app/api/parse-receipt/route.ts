import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { cleanReceiptText } from '@/lib/utils/receiptTextCleaner';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 2,
});

const CATEGORIES = ['Dairy','Meat','Fruit','Veg','Grains','Tinned Goods','Fish','Spices','Alcohol'];
const LOCATIONS = ['Fridge','Freezer','Cupboard','Spice Rack','Pantry'];

const getSystemPrompt = (purchaseDate: string) => `Extract food/drink items from a Tesco delivery email.

RULES:
- IGNORE "Unavailable" section items entirely.
- IGNORE non-food (dishcloth, foil, bleach, bags, kitchen roll).
- IGNORE service charges, delivery fees, basket totals.
- RULE 1 (SUBSTITUTE FILTERING): Retail receipts often show an originally "Ordered" item and a "Substituted with" item. You MUST ignore the originally ordered item if it was substituted. ONLY extract the final, delivered substitute item.
- RULE 2 (INTERNAL QUANTITIES & MIDDLE-STRING MATH): Counts are often buried inside the item name (e.g., the "6" in "Tesco 6 Cumberland Sausages 400g"). You MUST identify this internal count, divide the total weight by it (400/6 = 67g), and format the \`volume/weight\` field as "[Count] x [Weight]g" (e.g., "6 x 67g").
- RULE 3 (ABSOLUTE NAME CLEANING): After extracting the data, you MUST strip BOTH the total weight ("400g") AND the internal count ("6") from the \`name\` field. The resulting name should just be "Tesco Cumberland Sausages". Do not leave dangling numbers in the product name.
- RULE 4 (PREVENT DROPPED ITEMS): You are terminating extraction too early. You MUST read the raw text line-by-line. You are strictly forbidden from stopping your extraction until you explicitly read the words "Subtotal", "Total", "Delivery", or reach the absolute final character of the text. Do not summarize. Extract every single item.
- RULE 5 (QUANTITY VS UNIT WEIGHT): The \`qty\` field is the number of PACKS bought. The \`volume/weight\` field must be the weight of a SINGLE pack. DO NOT multiply the weight by the \`qty\`. (e.g., If qty is 5 and the item is 400g, qty=5, weight=400g. NOT 2000g).
- RULE 6 (UNITLESS ITEMS & COUNTS): If an item has NO metric weight (g/kg/ml/l), DO NOT hallucinate a weight. Instead, look for package counts (e.g., "12 Pack", "6 items") and put that string (e.g., "12 Pack") into the volume/weight field.
- RULE 7 (EXPIRY ESTIMATION): The Purchase/Delivery Baseline Date is strictly ${purchaseDate}.
  - If the receipt text explicitly states a use-by/best-before date for an item, calculate that exact date and use it.
  - If NO explicit item date is provided, you MUST estimate the expiration date by adding time to the Baseline Date (${purchaseDate}) based on the item's Location and Category:
    * Freezer: Add 180 days.
    * Cupboard / Pantry / Spice Rack: Add 365 days.
    * Fridge (Meat / Fish): Add 3 days.
    * Fridge (Dairy): Add 7 days.
    * Fridge (Fruit / Veg): Add 7 days.
    * Fridge (Alcohol / Tinned Goods): Add 14 days.
  Output the exact future date in YYYY-MM-DD format for the expiry field.
- Strip † and ‡ symbols.

ALLOWED categories: ${CATEGORIES.join(', ')}
ALLOWED locations: ${LOCATIONS.join(', ')}

MAPPING RULES:
- Milk/Cheese/Butter/Yogurt/Cream → category:Dairy, location:Fridge
- Chicken/Beef/Pork/Lamb/Mince/Sausage/Bacon → category:Meat, location:Fridge
- Apples/Bananas/Berries/Oranges/Grapes → category:Fruit, location:Fridge
- Potatoes/Onions/Carrots/Peppers/Tomatoes/Lettuce/Mushrooms → category:Veg, location:Fridge
- Rice/Pasta/Bread/Cereal/Flour/Oats → category:Grains, location:Cupboard
- Tinned/Canned items → category:Tinned Goods, location:Cupboard
- Salmon/Cod/Prawns/Tuna(fresh) → category:Fish, location:Fridge
- Herbs/Spices/Seasoning → category:Spices, location:Spice Rack
- Wine/Beer/Spirits/Cider → category:Alcohol, location:Cupboard
- Frozen items → keep category, location:Freezer

JSON format (use short keys to save tokens):
{"items":[{"n":"name","q":quantity,"vw":"volume/weight e.g. 500g","loc":"location","cat":"category","exp":"YYYY-MM-DD"}]}

Respond ONLY with valid JSON.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = body.rawText || body.text;
    const purchaseDate = body.purchaseDate || new Date().toISOString().split('T')[0];

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'No receipt text provided' }, { status: 400 });
    }

    const cleanedText = cleanReceiptText(rawText);

    if (cleanedText.length < 10) {
      return NextResponse.json({ error: 'Receipt text too short after cleaning' }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(purchaseDate);
    let chatCompletion;
    let modelUsed = 'llama-3.3-70b-versatile';

    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanedText },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });
    } catch (primaryError: any) {
      const isRateLimit = primaryError?.status === 429 ||
        primaryError?.code === 'rate_limit_exceeded' ||
        primaryError?.message?.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        console.warn('[Groq] Primary model rate-limited, falling back to llama-3.1-8b-instant');
        modelUsed = 'llama-3.1-8b-instant';
        chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanedText },
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        });
      } else {
        throw primaryError;
      }
    }

    const content = chatCompletion.choices[0]?.message?.content || '{"items":[]}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[Groq] Failed to parse JSON response:', content.substring(0, 200));
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 502 });
    }

    const rawItems = parsed.items || [];

    const mappedItems = rawItems
      .filter((item: any) => item?.n && typeof item.n === 'string')
      .map((item: any) => ({
        name: item.n.trim(),
        quantity: Math.max(1, parseInt(item.q) || 1),
        volume_weight: item.vw || null,
        location: LOCATIONS.includes(item.loc) ? item.loc : 'Cupboard',
        category: CATEGORIES.includes(item.cat) ? item.cat : 'Grains',
        expiration_date: item.exp || null,
      }));

    // Code-level deduplication: merge items with the same name (case-insensitive)
    const deduplicatedItems = mappedItems.reduce((acc: any[], item: any) => {
      const existingIndex = acc.findIndex(
        (existing: any) => existing.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Merge with existing item: sum quantities
        acc[existingIndex].quantity += item.quantity;
      } else {
        // Add new item
        acc.push(item);
      }

      return acc;
    }, []);

    console.log(`[Receipt Parser] Model: ${modelUsed} | Extracted: ${mappedItems.length} items | Deduplicated to: ${deduplicatedItems.length} items`);

    return NextResponse.json({ items: deduplicatedItems });
  } catch (error: any) {
    console.error('[Receipt Parser] Error:', error?.message || error);
    const status = error?.status || 500;
    const message = error?.message || 'Failed to parse receipt. Please try again.';
    return NextResponse.json({ error: message }, { status });
  }
}
