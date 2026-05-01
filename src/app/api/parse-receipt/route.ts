import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Model hierarchy for rate limit bypass
const MODEL_PRIORITY = [
  'llama-3.3-70b-versatile', // Primary
  'llama-3.1-8b-instant'    // Immediate Backup
];

// Helper function to split text into exactly 20 chunks
function splitTextIntoChunks(text: string, numChunks: number = 20): string[] {
  const lines = text.split('\n');
  const linesPerChunk = Math.ceil(lines.length / numChunks);
  const chunks: string[] = [];
  
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunk = lines.slice(i, i + linesPerChunk).join('\n');
    chunks.push(chunk);
  }
  
  return chunks;
}

// Helper function to get total item count from 8B model
async function getTotalItemCount(text: string): Promise<number> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `Count the total number of food/drink items on this receipt. Ignore non-food items like dishcloths. Return ONLY a number, no text.

Receipt Text:
${text}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 10,
    });
    
    const countText = response.choices[0]?.message?.content || '0';
    const count = parseInt(countText.replace(/\D/g, ''), 10);
    return isNaN(count) ? 0 : count;
  } catch (error) {
    console.error('Failed to get item count, defaulting to 0:', error);
    return 0;
  }
}

async function parseItems(text: string, directive: string, receiptDate: string, itemCount: number = 20, activeModels?: Set<string>): Promise<any[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Extract the food/drink items from this receipt text into a JSON array of objects with these keys: name, quantity, unit_price, total_price, category, storage_location, shelf_life_days, unit_size, unit_type. If a price is missing, use null. DO NOT include items that are not in the text.

${directive}

Receipt Text:
${text}`;

  let chatCompletion;
  let lastError: any = null;
  
  // Simple model hopper
  for (const model of MODEL_PRIORITY) {
    // Skip if model is not in active set
    if (activeModels && !activeModels.has(model)) {
      console.log(`Skipping ${model} (blacklisted)`);
      continue;
    }
    
    try {
      console.log(`Trying model: ${model}`);
      chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      console.log(`Success with model: ${model}`);
      break; // Success, exit model loop
    } catch (error: any) {
      lastError = error;
      if (error?.status === 429 || error?.error?.code === 'rate_limit_exceeded') {
        console.warn(`Rate limit hit for ${model}. Trying next model...`);
        // Dynamically blacklist this model
        if (activeModels) {
          activeModels.delete(model);
        }
        continue; // Try next model
      } else if (error?.status === 413) {
        console.warn(`Request too large for ${model}. Trying next model...`);
        continue; // Try next model
      } else if (error?.status === 400 || error?.error?.type === 'model_decommissioned' || error?.error?.code === 'model_not_found') {
        console.warn(`Model error for ${model}: ${error.message}. Blacklisting and trying next model...`);
        // Blacklist decommissioned models
        if (activeModels) {
          activeModels.delete(model);
        }
        continue; // Try next model
      } else {
        console.warn(`Unexpected error for ${model}: ${error.message}. Trying next model...`);
        continue; // Try next model anyway
      }
    }
  }

  if (!chatCompletion) {
    console.warn('All models failed for this chunk, returning empty array');
    return [];
  }

  let rawContent = chatCompletion.choices[0]?.message?.content || '{}';

  // 1. Find the first and last curly braces to extract only the JSON object
  const firstBrace = rawContent.indexOf('{');
  const lastBrace = rawContent.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    rawContent = rawContent.substring(firstBrace, lastBrace + 1);
  } else {
    // 2. Safety net: If the AI returned an array instead of an object
    const firstBracket = rawContent.indexOf('[');
    const lastBracket = rawContent.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
      rawContent = rawContent.substring(firstBracket, lastBracket + 1);
    } else {
      console.error("Raw AI Output:", rawContent);
      throw new Error("Could not locate valid JSON brackets in the AI response.");
    }
  }

  // 3. Parse the cleanly extracted string
  const parsed = JSON.parse(rawContent);
  
  // Ensure we always return an array, even if the AI nested it or returned a single object
  let items = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed.items && Array.isArray(parsed.items)) {
    items = parsed.items;
  } else if (parsed.products && Array.isArray(parsed.products)) {
    items = parsed.products;
  } else {
    // If the AI just returned a single object instead of an array
    items = [parsed];
  }
  
  // Filter out any object that doesn't at least have a 'name'
  return items.filter((item: any) => item && typeof item === 'object' && item.name);
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
        if (i > 0 && lines[i - 1].includes('Substituted with:')) {
          cleanedLines.push(line);
        }
      }
      
      const cleanedSubstitutions = cleanedLines.join('\n');
      
      const shortLifeStart = afterUnavailable.indexOf('Items with a shorter life');
      const afterShortLife = shortLifeStart !== -1 
        ? afterUnavailable.substring(shortLifeStart) 
        : afterUnavailable;
      
      preprocessedText = beforeSubstitutions + cleanedSubstitutions + afterShortLife;
    } else if (unavailableStart !== -1) {
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

    // Split text into 20 chunks
    const textChunks = splitTextIntoChunks(preprocessedText, 20);
    console.log(`Split text into ${textChunks.length} chunks`);

    // Simple aggregation
    const allItems: any[] = [];
    
    // Stateful blacklist of active models
    const activeModels = new Set<string>(MODEL_PRIORITY);

    // Process each chunk sequentially
    for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex++) {
      console.log(`Processing chunk ${chunkIndex + 1}/${textChunks.length}`);
      
      const directive = `Extract items from this chunk of the receipt.`;
      const items = await parseItems(textChunks[chunkIndex], directive, receiptDate, 20, activeModels);
      
      if (items.length > 0) {
        allItems.push(...items);
        console.log(`Chunk ${chunkIndex + 1}: Retrieved ${items.length} items (Total: ${allItems.length})`);
      }
    }

    console.log("Final Aggregated Items:", allItems);
    return NextResponse.json({ items: allItems });
  } catch (error: any) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process receipt" }, { status: 500 });
  }
}
