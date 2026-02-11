import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ClobClient } from "https://esm.sh/@polymarket/clob-client@4";

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

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Initialize Polymarket CLOB client for read-only operations
 * @returns Configured ClobClient
 */
function createPolymarketClient() {
  const chainId = parseInt(Deno.env.get("POLYMARKET_CHAIN_ID") || "137", 10);

  return new ClobClient({
    chainId,
    // No private key needed for read-only operations
  });
}

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
 * @param polymarket - Configured ClobClient
 * @param conditionId - Polymarket condition ID
 * @param attempt - Current attempt number (for retry logic)
 * @returns PolymarketMarketData object or null if fetch fails
 */
async function fetchPolymarketData(
  polymarket: any,
  conditionId: string,
  attempt: number = 1
): Promise<PolymarketMarketData | null> {
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

  try {
    // Call getMarket() method on CLOB client
    const market = await polymarket.getMarket(conditionId);

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
      return fetchPolymarketData(polymarket, conditionId, attempt + 1);
    }

    // Return null for failed fetches after max attempts
    // This allows processing to continue
    return null;
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
    const polymarket = createPolymarketClient();

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

    // TODO: Process each market
    // TODO: Update database records

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
