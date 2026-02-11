import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Represents a market record from the database
 */
interface MarketRecord {
  id: string;
  condition_id: string;
  question: string;
  status: string;
  market_probability: number | null;
  volume_24h: number | null;
  liquidity: number | null;
}

/**
 * Result of updating a single market
 */
interface UpdateResult {
  condition_id: string;
  success: boolean;
  updated_fields: string[];
  error?: string;
}

/**
 * Summary of the entire execution
 */
interface ExecutionSummary {
  total_markets: number;
  updated: number;
  resolved: number;
  failed: number;
  duration_ms: number;
  errors: string[];
}

/**
 * Market data fetched from Polymarket API
 */
interface PolymarketMarketData {
  probability: number;
  volume24h: number;
  liquidity: number;
  resolved: boolean;
  outcome: string | null;
}

/**
 * Initialize Supabase client with service role credentials
 * @returns Configured Supabase client
 * @throws Error if required environment variables are missing
 */
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }

  if (!supabaseKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Polymarket API base URL
 */
const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";

/**
 * Validate that all required environment variables are present
 * @returns Object with validation result and error message if invalid
 */
function validateConfiguration(): { valid: boolean; error?: string } {
  const requiredVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = requiredVars.filter((varName) => !Deno.env.get(varName));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Fetch all active markets from the database
 * @param supabase - Configured Supabase client
 * @returns Array of active market records
 * @throws Error if database query fails
 */
async function fetchActiveMarkets(supabase: any): Promise<MarketRecord[]> {
  const { data, error } = await supabase
    .from("markets")
    .select("id, condition_id, question, status, market_probability, volume_24h, liquidity")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to fetch active markets: ${error.message}`);
  }

  return data || [];
}

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch current market data from Polymarket API with retry logic
 * @param conditionId - Polymarket condition ID
 * @param attempt - Current attempt number (for retry logic)
 * @returns PolymarketMarketData object or null if fetch fails
 */
async function fetchPolymarketData(
  conditionId: string,
  attempt: number = 1
): Promise<PolymarketMarketData | null> {
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

  try {
    // Fetch market data from Polymarket Gamma API
    const response = await fetch(`${POLYMARKET_API_BASE}/markets/${conditionId}`);
    
    if (!response.ok) {
      console.error(`Market not found for condition_id: ${conditionId} (status: ${response.status})`);
      return null;
    }

    const market = await response.json();

    if (!market) {
      console.error(`Market not found for condition_id: ${conditionId}`);
      return null;
    }

    // Extract probability, volume24h, liquidity from response
    const probability = parseFloat(market.clobTokenIds?.[0]?.price || "0");
    const volume24h = parseFloat(market.volume24hr || "0");
    const liquidity = parseFloat(market.liquidity || "0");

    // Detect resolution status and outcome
    const resolved = market.closed && market.resolvedAt !== null;
    const outcome = market.outcome || null;

    // Return structured PolymarketMarketData object
    return {
      probability,
      volume24h,
      liquidity,
      resolved,
      outcome,
    };
  } catch (error) {
    // Log individual market fetch errors
    console.error(
      `Error fetching market ${conditionId} (attempt ${attempt}/${maxAttempts}):`,
      (error as Error).message
    );

    // Implement exponential backoff retry logic
    if (attempt < maxAttempts) {
      const delay = delays[attempt - 1];
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchPolymarketData(conditionId, attempt + 1);
    }

    // Return null for failed fetches after max attempts
    // This allows processing to continue
    return null;
  }
}

/**
 * Update a single market with current data from Polymarket
 * @param supabase - Configured Supabase client
 * @param market - Market record from database
 * @returns UpdateResult with success status and updated fields
 */
async function updateMarket(
  supabase: any,
  market: MarketRecord
): Promise<UpdateResult> {
  const result: UpdateResult = {
    condition_id: market.condition_id,
    success: false,
    updated_fields: [],
  };

  try {
    // Call fetchPolymarketData to get current state
    const marketData = await fetchPolymarketData(market.condition_id);

    if (!marketData) {
      result.error = "Market not found on Polymarket";
      return result;
    }

    // Build update payload with changed fields
    const updates: Record<string, any> = {};

    // Compare fetched data with database record
    // Update probability if changed
    if (marketData.probability !== market.market_probability) {
      updates.market_probability = marketData.probability;
      result.updated_fields.push("market_probability");
    }

    // Update volume if changed
    if (marketData.volume24h !== market.volume_24h) {
      updates.volume_24h = marketData.volume24h;
      result.updated_fields.push("volume_24h");
    }

    // Update liquidity if changed
    if (marketData.liquidity !== market.liquidity) {
      updates.liquidity = marketData.liquidity;
      result.updated_fields.push("liquidity");
    }

    // Check if marketData.resolved is true
    if (marketData.resolved) {
      // Add status = 'resolved' to update payload
      updates.status = "resolved";
      result.updated_fields.push("status");

      // Add resolved_outcome to update payload
      if (marketData.outcome) {
        updates.resolved_outcome = marketData.outcome;
        result.updated_fields.push("resolved_outcome");
      }
    }

    // Only execute database update if fields have changed
    if (Object.keys(updates).length > 0) {
      // Execute database update via Supabase client
      const { error } = await supabase
        .from("markets")
        .update(updates)
        .eq("id", market.id);

      if (error) {
        result.error = error.message;
        return result;
      }
    }

    // Return UpdateResult with success status and updated fields
    result.success = true;
    return result;
  } catch (error) {
    result.error = (error as Error).message;
    return result;
  }
}

/**
 * Main Edge Function handler
 * Runs hourly to update active market data from Polymarket
 */
serve(async (req: Request) => {
  const startTime = Date.now();
  const summary: ExecutionSummary = {
    total_markets: 0,
    updated: 0,
    resolved: 0,
    failed: 0,
    duration_ms: 0,
    errors: [],
  };

  try {
    // Validate configuration
    const configValidation = validateConfiguration();
    if (!configValidation.valid) {
      summary.duration_ms = Date.now() - startTime;
      summary.errors.push(configValidation.error!);

      return new Response(JSON.stringify(summary), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabase = createSupabaseClient();

    // Fetch active markets
    const markets = await fetchActiveMarkets(supabase);
    summary.total_markets = markets.length;

    // Handle empty market list - return early with success
    if (markets.length === 0) {
      summary.duration_ms = Date.now() - startTime;
      return new Response(JSON.stringify(summary), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process each market and update database records
    for (const market of markets) {
      const result = await updateMarket(supabase, market);
      
      if (result.success) {
        summary.updated++;
        
        // Check if market was resolved
        if (result.updated_fields.includes("status")) {
          summary.resolved++;
        }
      } else {
        summary.failed++;
        summary.errors.push(`${market.condition_id}: ${result.error}`);
      }
    }

    summary.duration_ms = Date.now() - startTime;

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    summary.duration_ms = Date.now() - startTime;
    summary.errors.push((error as Error).message);

    return new Response(JSON.stringify(summary), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
