import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

async function processChunk(text: string, directive: string, receiptDate: string): Promise<any[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `The receipt date is ${receiptDate}. 
For "Items with a shorter life", you will see a date like "22 Sep". 
Calculate the shelf_life_days by subtracting the receipt date from that expiry date.
For all other items, provide your best estimate of shelf life from the receipt date.

Extract every item from this specific section of a receipt. ${directive}

For each item, provide: name, quantity, unit_price, total_price, category, storage_location (fridge/freezer/pantry), and shelf_life_days.

STRICT RULES:
1. STORAGE: Food/Perishables = "fridge" or "freezer", Non-perishables/Household = "pantry".
2. SHELF LIFE - HIERARCHICAL RULES:
   - Rule 1 (Explicit Date): If item is in "Shorter Life" section, calculate (Expiry Date on Line) - (Receipt Date).
   - Rule 2 (Perishables): If storage_location is "fridge" and category is Dairy, Produce, or Meat, estimate realistically (Dairy: 7-14 days, Meat: 3-5 days, Produce: 5-7 days). NEVER assign 3650 days to these.
   - Rule 3 (Long-Life): Only assign 3650 days to Household, Cleaning, or Pantry Staples (like salt or canned goods).
   - Rule 4 (Frozen): Assign 180 days to items with storage_location "freezer".
3. CATEGORY: Assign accurately (Produce, Dairy, Meat, Bakery, Frozen, Household, Drinks, Alcohol, Pantry Staples).
4. QUANTITY: Always extract the leading number.
5. NO MATH: Extract the 'total_price' directly from the right-most column.
6. EXTREMELY IMPORTANT: If an item has no price listed and is not in the 'Short Life' section, it was not purchased. Do NOT include it.
7. CRITICAL: Check the storage_location. If 'fridge', the shelf_life_days MUST be a small number (3-21). Only 'pantry' items like dishcloths or canned goods should have 3650 days.
8. Extract every item from this list. All items in the Substitutions section have been pre-filtered to show ONLY the delivered quantity and price. Extract them as-is.

Return valid json:
{
  "items": [{
    "name": string, 
    "quantity": number, 
    "unit_price": number | null, 
    "total_price": number | null,
    "category": string,
    "storage_location": "fridge" | "freezer" | "pantry",
    "shelf_life_days": number
  }]
}

Receipt Text:
${text}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const responseText = chatCompletion.choices[0]?.message?.content || "{}";
  const cleanJson = responseText.replace(/```json\n?|\n?```/gi, "").trim();
  const parsed = JSON.parse(cleanJson);
  return parsed.items || [];
}

export async function POST(req: Request) {
  try {
    const { rawText } = await req.json();
    
    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY environment variable");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Extract receipt date using regex
    const dateMatch = rawText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
    const receiptDate = dateMatch ? dateMatch[1] : "unknown date";

    // Isolate Substitutions section and filter to only delivered items
    const substitutionsStart = rawText.indexOf('Substitutions');
    const unavailableStart = rawText.indexOf('Unavailable');
    
    let preprocessedText = rawText;
    
    if (substitutionsStart !== -1 && unavailableStart !== -1) {
      const beforeSubstitutions = rawText.substring(0, substitutionsStart);
      const substitutionsSection = rawText.substring(substitutionsStart, unavailableStart);
      const afterUnavailable = rawText.substring(unavailableStart);
      
      // Surgical line filter: keep only lines immediately following "Substituted with:"
      const lines = substitutionsSection.split('\n');
      const cleanedLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Keep the line immediately after "Substituted with:"
        if (i > 0 && lines[i - 1].includes('Substituted with:')) {
          cleanedLines.push(line);
        }
      }
      
      const cleanedSubstitutions = cleanedLines.join('\n');
      
      // Remove Unavailable section completely
      const shortLifeStart = afterUnavailable.indexOf('Items with a shorter life');
      const afterShortLife = shortLifeStart !== -1 
        ? afterUnavailable.substring(shortLifeStart) 
        : afterUnavailable;
      
      preprocessedText = beforeSubstitutions + cleanedSubstitutions + afterShortLife;
    } else if (unavailableStart !== -1) {
      // If no substitutions but Unavailable exists, just remove it
      const shortLifeStart = rawText.indexOf('Items with a shorter life');
      const restOfItemsStart = rawText.indexOf('The rest of your items');
      
      let afterUnavailable: string;
      if (shortLifeStart !== -1) {
        afterUnavailable = rawText.substring(shortLifeStart);
      } else if (restOfItemsStart !== -1) {
        afterUnavailable = rawText.substring(restOfItemsStart);
      } else {
        afterUnavailable = rawText.substring(unavailableStart);
      }
      
      preprocessedText = rawText.substring(0, unavailableStart) + afterUnavailable;
    }

    // Split receipt into two chunks based on sections
    const fridgeEnd = preprocessedText.indexOf('Freezer');
    
    let chunk1: string;
    let chunk2: string;

    if (fridgeEnd === -1) {
      // If split point not found, process entire receipt as one chunk
      const items = await processChunk(preprocessedText, "This is the complete receipt.", receiptDate);
      return NextResponse.json({ items });
    } else {
      chunk1 = preprocessedText.substring(0, fridgeEnd);
      chunk2 = preprocessedText.substring(fridgeEnd);
    }

    // Process both chunks sequentially
    const items1 = await processChunk(
      chunk1,
      "This is a segment of a larger receipt containing substitutions, short-life items, and the fridge section. Extract ONLY the items present in this text.",
      receiptDate
    );

    const items2 = await processChunk(
      chunk2,
      "This is a segment of a larger receipt containing the freezer and cupboard sections. Extract ONLY the items present in this text.",
      receiptDate
    );

    // Aggregate results
    const allItems = [...items1, ...items2];
    
    return NextResponse.json({ items: allItems });
  } catch (error: any) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process receipt" }, { status: 500 });
  }
}
