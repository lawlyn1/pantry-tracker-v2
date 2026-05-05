# Pantry Tracker V1 — Project State

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, PostCSS
- **Backend:** Supabase (PostgreSQL) with Supabase Auth
- **AI Integration:** Groq API (Llama 3.3 70B) for receipt parsing & recipe generation
- **Authentication:** Supabase Auth with SSR (@supabase/ssr) for multi-tenant SaaS

## Database Schema

### `inventory` table
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, FK to auth.users(id) ON DELETE CASCADE |
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
| user_id | uuid | NOT NULL, FK to auth.users(id) ON DELETE CASCADE |
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
- [x] Groq LLM system prompt architectural overhaul for exact string pattern (May 2026) — Added global line structure rule: every item follows `[Quantity][Item Name][Size/Weight][£Price][£Total Price]` format, extract qty from beginning, strip £ prices, keep middle as Name/Weight data; added strict math rule: forbidden from outputting "unknown", must divide internal count by total weight and output "[Count] x [Weight]g", fallback to count string; added fluff removal rule: remove "Minimum", "(C)", "Each" from name, set volume/weight to "1" for "Each"; added substitute recovery rule: don't drop substitute section, ignore "Unavailable"/"Ordered", extract "Substituted with" item
- [x] Groq LLM system prompt refined with aggressive negative constraints (May 2026) — Updated RULE 3 to STRICT NAME PURGE: secondary purge after isolating raw Name/Weight string, strictly forbidden from leaving internal counts (e.g., "6" in "6 Cumberland Sausages") or weights (e.g., "400g") in final name field, "Tesco 6 Cumberland Sausages 400g" must become exactly "Tesco Cumberland Sausages"; updated RULE 4 to RUTHLESS SUBSTITUTE FILTERING: completely ignore items under "Unavailable" header or originally ordered items that were substituted, only extract replacement items under "Substituted with" with actual final prices
- [x] Groq LLM system prompt enhanced with real-world Tesco layout examples (May 2026) — Added RULE 5 (IGNORE PROMOTIONS): completely ignore lines saying "Was £X, now £Y"; added comprehensive EXAMPLES OF TESCO PARSING section with 7 real-world examples showing: internal count math (6 Cumberland Sausages 400g → 6 x 67g), substitute filtering (ignore ordered, extract substituted), unavailable item handling, multi-pack math (4 X100g → 400g), unitless items (Minimum 3 Pack → 3 Pack), and "Each" items (Butternut Squash Each → volume/weight: 1)
- [x] Groq LLM system prompt refined with strict string replacement rules and edge case examples (May 2026) — Added RULE 6 (STRICT STRING REPLACEMENT): actively delete "Minimum" from name and volume/weight fields ("Minimum 3 Pack" → "3 Pack"), actively delete internal quantities from name ("10 Traditional Pork Sausages" → "Traditional Pork Sausages"), extract valid items in main receipt body even if mentioned in top "Substitutions" summary; added 4 new edge case examples to EXAMPLES section: Tesco Red Onions 3Pack Minimum (remove "Minimum"), Tesco Organic Unwaxed Lemons Minimum 3 Pack (remove "Minimum"), Tesco Finest 10 Traditional Pork Sausages 667G (remove "10", calculate 667/10=67g), Simon Howie Dry Cure Smoked Streaky Bacon 220G (extract without substitute context)
- [x] Groq LLM system prompt enhanced with universal pattern-matching directives (May 2026) — Added UNIVERSAL PATTERN MATCHING directive at top of system prompt: examples are abstract templates not definitive list, must apply logical patterns (math division, dropping marketing fluff, filtering substitutes) universally to ALL items regardless of specific food/product; updated RULE 6 to GENERALIZED STRING PURGE: actively purge ALL marketing fluff, packaging descriptors, and internal counts from name field including "Minimum", "Maximum", "Each", "Pack", "(C)", and any quantity numbers inside product name (e.g., "10 Traditional Sausages" → "Traditional Sausages", "Red Onions 3Pack Minimum" → "Red Onions")
- [x] Multi-tenant SaaS migration started (May 2026) — Updated database schema to add user_id UUID columns to inventory and shopping_list tables with FK to auth.users(id) ON DELETE CASCADE; created migration files (migration.sql, add_user_id_migration.sql, supabase_rls_setup.sql) for database changes; installed @supabase/ssr and @supabase/supabase-js packages; implemented Supabase SSR authentication flow with server and browser clients (src/utils/supabase/server.ts, src/utils/supabase/client.ts); created middleware.ts for session updates and route protection (protects / routes, redirects to /login); created login page at src/app/login/page.tsx with Email/Password auth UI; created LogoutButton component for navigation
- [x] Database operations refactored for authenticated user sessions (May 2026) — Updated PantryContext.tsx to use browser client from @/utils/supabase/client instead of old @/lib/supabase; added user state and auth check that redirects to /login if no user; updated all database queries to filter by user_id (fetchInventory, fetchShoppingList); updated all insert operations to attach user_id (addItem, addItemsBulk, addShoppingItem); added user to PantryContextType interface and provider value; added LogoutButton to dashboard header; API routes (parse-receipt, generate-recipes) don't directly interact with database (only use Groq AI) so no changes needed
