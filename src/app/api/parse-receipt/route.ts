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

UNIVERSAL PATTERN MATCHING: The examples provided at the end of this prompt are abstract templates, NOT a definitive list. You must apply the logical patterns demonstrated in these examples (e.g., math division, dropping marketing fluff, filtering substitutes) universally to ALL items, regardless of what the specific food or product is.

RULES:
- IGNORE "Unavailable" section items entirely.
- IGNORE non-food (dishcloth, foil, bleach, bags, kitchen roll).
- IGNORE service charges, delivery fees, basket totals.
- RULE 1 (GLOBAL LINE STRUCTURE): Every single item line follows this exact mashed format: \`[Quantity][Item Name][Size/Weight][£Price][£Total Price]\`. (Example: "9Tesco Large Free Range Eggs 12 Pack£3.25£29.25").
  - You MUST extract the number at the absolute beginning of the string as the \`qty\` (e.g., 9).
  - You MUST completely ignore and strip out anything starting with a "£" at the end of the string.
  - The text left in the middle is your raw Name and Weight/Size data.
- RULE 2 (STRICT MATH & NO PLACEHOLDERS): You are strictly forbidden from outputting the word "unknown". If an item has an internal count AND a total weight (e.g., "10 Slices 250g"), you MUST divide it (250/10 = 25) and output "[Count] x [Weight]g" (e.g., "10 x 25g"). If you genuinely cannot find a weight to divide by, fallback to outputting just the count string (e.g., "10 Slices", "12 Pack").
- RULE 3 (STRICT NAME PURGE): After you isolate the raw Name/Weight string from the middle of the layout, you MUST do a secondary purge. You are STRICTLY FORBIDDEN from leaving internal counts (e.g., the "6" in "6 Cumberland Sausages") or weights (e.g., "400g") inside the final \`name\` field. "Tesco 6 Cumberland Sausages 400g" MUST become exactly "Tesco Cumberland Sausages".
- RULE 4 (RUTHLESS SUBSTITUTE FILTERING): You are extracting ghost items. If an item is listed under an "Unavailable" header, or if it represents the originally ordered item that was substituted, you MUST completely ignore it. ONLY extract the item explicitly provided as the replacement (usually under "Substituted with" and possessing actual final prices).
- RULE 5 (IGNORE PROMOTIONS): You must completely ignore lines that say "Was £X, now £Y". Do not attempt to extract them as items.
- RULE 6 (GENERALIZED STRING PURGE): You MUST actively purge all marketing fluff, packaging descriptors, and internal counts from the \`name\` field. This includes, but is not limited to, words like "Minimum", "Maximum", "Each", "Pack", "(C)", or any quantity numbers that appear inside the product name. (e.g., "10 Traditional Sausages" -> "Traditional Sausages", "Red Onions 3Pack Minimum" -> "Red Onions"). Do not skip valid items in the main receipt body just because they were mentioned in a top "Substitutions" summary. If a line has a quantity, name, unit price, and total price, YOU MUST EXTRACT IT.
- RULE 7 (PREVENT DROPPED ITEMS): You are terminating extraction too early. You MUST read the raw text line-by-line. You are strictly forbidden from stopping your extraction until you explicitly read the words "Subtotal", "Total", "Delivery", or reach the absolute final character of the text. Do not summarize. Extract every single item.
- RULE 8 (QUANTITY VS UNIT WEIGHT): The \`qty\` field is the number of PACKS bought. The \`volume/weight\` field must be the weight of a SINGLE pack. DO NOT multiply the weight by the \`qty\`. (e.g., If qty is 5 and the item is 400g, qty=5, weight=400g. NOT 2000g).
- RULE 9 (EXPIRY ESTIMATION): The Purchase/Delivery Baseline Date is strictly ${purchaseDate}.
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

EXAMPLES OF TESCO PARSING:

**Input Text:**
4	Tesco Finest 6 Cumberland Pork Sausages 400g	£3.00	£9.81
**Output JSON:**
{"name": "Tesco Finest Cumberland Pork Sausages", "qty": 4, "volume/weight": "6 x 67g", "category": "Fridge (Meat / Fish)"}

**Input Text:**
10	Simon Howie Dry Cure Smoked Streaky Bacon 220G	£3.00	 	 	 
 	Substituted with:	 	 	£12.69	 
5	Tesco Finest Smoked Dry Cure Streaky Bacon 240G	£3.50
**Output JSON:**
{"name": "Tesco Finest Smoked Dry Cure Streaky Bacon", "qty": 5, "volume/weight": "240g", "category": "Fridge (Meat / Fish)"}

**Input Text:**
Unavailable
2	Tesco Aubergine Each
**Output JSON:**
IGNORE ENTIRELY (Do not output anything)

**Input Text:**
2	Tesco Baby Spinach 250G	20 Sept
**Output JSON:**
{"name": "Tesco Baby Spinach", "qty": 2, "volume/weight": "250g", "category": "Fridge (Fruit / Veg)"}

**Input Text:**
2	Yeo Valley Honey Greek Style Yogurt 4 X100g	£2.60	£5.20
**Output JSON:**
{"name": "Yeo Valley Honey Greek Style Yogurt", "qty": 2, "volume/weight": "400g", "category": "Fridge (Dairy)"}

**Input Text:**
4	Tesco Organic Unwaxed Lemons Minimum 3 Pack	£1.90	£7.60
**Output JSON:**
{"name": "Tesco Organic Unwaxed Lemons", "qty": 4, "volume/weight": "3 Pack", "category": "Fridge (Fruit / Veg)"}

**Input Text:**
2	Tesco Butternut Squash Each (C)	£1.50	£3.00
**Output JSON:**
{"name": "Tesco Butternut Squash", "qty": 2, "volume/weight": "1", "category": "Fridge (Fruit / Veg)"}

**Input Text:**
1	Tesco Red Onions 3Pack Minimum	£0.95	£0.95
**Output JSON:**
{"name": "Tesco Red Onions", "qty": 1, "volume/weight": "3 Pack", "category": "Cupboard / Pantry / Spice Rack"}

**Input Text:**
3	Tesco Finest 10 Traditional Pork Sausages 667G	£4.50	£13.50
**Output JSON:**
{"name": "Tesco Finest Traditional Pork Sausages", "qty": 3, "volume/weight": "10 x 67g", "category": "Fridge (Meat / Fish)"}

**Input Text:**
5	Simon Howie Dry Cure Smoked Streaky Bacon 220G	£3.00	£15.00
**Output JSON:**
{"name": "Simon Howie Dry Cure Smoked Streaky Bacon", "qty": 5, "volume/weight": "220g", "category": "Fridge (Meat / Fish)"}

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
        console.warn('[Groq] Primary model rate-limited, falling back to llama-3.3-70b-versatile');
        modelUsed = 'llama-3.3-70b-versatile';
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
