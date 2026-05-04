# Pantry Tracker V1 — Project State

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, PostCSS
- **Backend:** Supabase (PostgreSQL)
- **AI Integration:** Groq API (Llama 3.3 70B) for receipt parsing & recipe generation
- **No Authentication:** Single shared household (2-person), no user accounts

## Database Schema

### `inventory` table
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| quantity | integer | NOT NULL, default 1 |
| volume_weight | text | nullable (e.g. "500g", "1L") |
| location | text | CHECK: 'Fridge','Freezer','Cupboard','Spice Rack','Pantry' |
| category | text | CHECK: 'Dairy','Meat','Fruit','Veg','Grains','Tinned Goods','Fish','Spices','Alcohol' |
| expiration_date | date | nullable |
| date_added | timestamptz | default now() |

### `shopping_list` table
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| quantity | integer | default 1 |
| checked | boolean | default false |
| created_at | timestamptz | default now() |

## V1 Features
1. **Dashboard/Inventory View** — Display all food, filterable by Location, highlight expiring items (<=3 days)
2. **Manual Entry** — Form to add items with all fields (categories + locations enforced)
3. **Tesco Receipt Parser (Groq)** — Paste raw email text, Groq extracts items, maps to categories/locations, estimates shelf-life
4. **AI Recipe Generator (Groq)** — Takes items expiring in 3-5 days, generates 2-3 recipe ideas
5. **Shopping List** — Simple CRUD list for needed items

## Env Vars Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

## Current Progress
- [x] Project scaffolded (Next.js 15 + Tailwind)
- [x] project_state.md created
- [x] Database schema (migration SQL ready — run `migration.sql` in Supabase SQL Editor)
- [x] Types defined (`src/types/index.ts`)
- [x] PantryContext — no auth, inventory + shopping list CRUD
- [x] Dashboard/Inventory page — filterable by location, expiry badges
- [x] Manual Entry form — enforces allowed categories & locations
- [x] Receipt Parser API + UI — Groq-powered, card-based review, bulk commit
- [x] Recipe Generator API + UI — expiring items → 2-3 recipes
- [x] Shopping List CRUD — add/check/delete/clear
- [x] Old auth, macro tracking, food logs, and user system removed
- [x] Build verified (next build passes with 0 errors)
- [x] Groq LLM system prompt refined (May 2026) — Added strict rules to fix Tesco receipt OCR hallucinations: (1) Extract "Delivered" quantity for substitutes, ignore "Ordered" quantity; (2) Never strip numbers from product names, preserve exact full product name; (3) Process text until absolute end of itemized list to prevent dropping final items
- [x] Groq LLM system prompt further refined (May 2026) — Added aggressive unit normalization rules: (4) Convert all volume/weight to ml or grams with math (e.g., "1.5kg" = "1500g"); (5) Remove weight/volume from product name after extraction to avoid duplication (keep item counts like "10 Slices"); (6) Explicitly scan for Subtotal/Total/delivery fee lines to ensure final item is captured
- [x] Receipt Import UI updated (May 2026) — Added manual purchase/delivery date selection UI (date picker defaults to today) and updated backend to use provided date for expiry estimation instead of relying on LLM text extraction; added RULE 7 (EXPIRY ESTIMATION) to Groq prompt with location/category-based expiry calculations from baseline date
- [x] Clear Pantry feature added (May 2026) — Added `clearInventory()` function to PantryContext to delete all inventory rows from Supabase and update local state; added distinctive red "Clear Pantry" button to inventory tab with `window.confirm` safety dialog before execution
- [x] Groq LLM system prompt refined for multi-pack and unit weight extraction (May 2026) — Replaced weight/quantity rules with: (4) QUANTITY VS UNIT WEIGHT: qty is number of PACKS, volume/weight is weight of SINGLE pack (don't multiply); (5) MULTI-PACK MATH: calculate total weight of multi-packs (e.g., "4 X 410G" = 1640g); (6) UNITLESS ITEMS & COUNTS: don't hallucinate metric weights, use package counts (e.g., "12 Pack"); (7) NAME CLEANING: keep internal item counts in name, only remove final parsed weight/volume string; renumbered existing rules to 8 and 9
- [x] Groq LLM system prompt aggressively refined for OCR parsing (May 2026) — Rewrote extraction rules with strict directives: (2) AGGRESSIVE NAME CLEANING: name field MUST NOT contain ANY weights/volumes, actively delete "400g", "4 X 410G", "1KG", "250ml"; (3) MULTI-PACKS & SLICE MATH: divide total weight by count for items with internal counts (format "[Count] x [Weight per item]g"), for multi-packs output ONLY final number/unit (e.g., "1640g" not "4 x 1640g"); (4) PREVENT DROPPED ITEMS: read line-by-line, forbidden from stopping until "Subtotal", "Total", "Delivery", or absolute final character of text; renumbered existing rules to maintain logical flow
- [x] Groq LLM system prompt refined for substitute filtering and internal quantity extraction (May 2026) — Added strict rules: (1) SUBSTITUTE FILTERING: ignore originally ordered items if substituted, only extract final delivered substitute; (2) INTERNAL QUANTITIES & MIDDLE-STRING MATH: extract internal counts from names (e.g., "6" in "Tesco 6 Cumberland Sausages 400g"), divide total weight by count, format as "[Count] x [Weight]g"; (3) ABSOLUTE NAME CLEANING: strip BOTH total weight AND internal count from name field, leaving clean product name without dangling numbers
- [x] Code-level deduplication logic added (May 2026) — Implemented TypeScript logic block after Groq API response to deduplicate parsed items: merges items with exact same name (case-insensitive) by summing their qty values, returns cleaned deduplicated array to frontend to prevent double-logged substitutes and duplicates
