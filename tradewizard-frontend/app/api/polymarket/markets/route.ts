import { NextRequest, NextResponse } from "next/server";
import { GAMMA_API_URL } from "@/constants/api";

// Filtering thresholds for market quality
// MIN_LIQUIDITY_USD: Minimum liquidity for evergreen tag markets ($1,000)
// MIN_LIQUIDITY_NON_EVERGREEN_USD: Minimum liquidity for other markets ($5,000)
const MIN_LIQUIDITY_USD = 1000;
const MIN_LIQUIDITY_NON_EVERGREEN_USD = 5000;

// Evergreen tag IDs: Politics, elections, and other high-priority categories
// These markets get lower liquidity thresholds due to consistent user interest
const EVERGREEN_TAG_IDS = [2, 21, 120, 596, 1401, 100265, 100639];

/**
 * GET /api/polymarket/markets
 * 
 * Proxy endpoint for fetching markets directly from Polymarket's /markets API.
 * Implements comprehensive filtering, sorting, and pagination with event context enrichment.
 * 
 * Query Parameters:
 * - limit: Number of markets to return (default: 20)
 * - offset: Pagination offset (default: 0)
 * - tag_id: Filter by category tag (e.g., 2 for politics)
 * - include_closed: Include closed/resolved markets (default: false)
 * - order: Sort field - "volume24hr" or "liquidity" (default: volume24hr)
 * 
 * Implements Requirements: 2.1-2.5, 3.1-3.3, 4.1-4.5, 5.1-5.6, 6.1-6.3, 7.1-7.2, 8.1-8.4
 * 
 * Over-fetching strategy:
 * - Fetches 3x requested limit from API to account for filtering
 * - Applies client-side filtering and sorting
 * - Returns exactly the requested number of markets
 * 
 * Caching:
 * - Next.js revalidates responses every 60 seconds
 * - Balances freshness with API rate limits
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";
  const tagId = searchParams.get("tag_id");
  const includeClosed = searchParams.get("include_closed") === "true";
  const order = searchParams.get("order") || "volume24hr";

  try {
    const requestedLimit = parseInt(limit);
    const requestedOffset = parseInt(offset);
    
    // Over-fetching strategy: Fetch 3x requested limit to account for filtering
    // This ensures we have enough valid markets after quality filters are applied
    const fetchLimit = Math.max(requestedLimit * 3, 100);
    const fetchOffset = Math.floor(requestedOffset * 1.5);

    // Build URL for direct /markets endpoint
    // Query parameters:
    // - closed: Filter by market status (true/false)
    // - order: Sort field (volume24hr, liquidity, etc.)
    // - ascending: Sort direction (false = descending)
    // - limit: Number of markets to fetch
    // - offset: Pagination offset
    // - tag_id: Optional category filter
    let url = `${GAMMA_API_URL}/markets?closed=${includeClosed ? 'true' : 'false'}&order=${order}&ascending=false&limit=${fetchLimit}&offset=${fetchOffset}`;

    if (tagId) {
      url += `&tag_id=${tagId}`;
    }

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error("Gamma API error:", response.status);
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const markets = await response.json();

    // Validate response structure
    if (!Array.isArray(markets)) {
      console.error("Invalid response structure:", markets);
      return NextResponse.json(
        { error: "Invalid API response" },
        { status: 500 }
      );
    }

    // Event context enrichment: Add event metadata when available
    // Markets may include an optional 'events' array with parent event data
    const enrichedMarkets = markets.map((market: any) => {
      if (market.events && Array.isArray(market.events) && market.events.length > 0) {
        const event = market.events[0];
        return {
          ...market,
          eventTitle: event.title,
          eventSlug: event.slug,
          eventId: event.id,
          eventIcon: event.image || event.icon,
          negRisk: event.negRisk || false,
        };
      }
      return market; // No event context available
    });

    // Apply comprehensive filtering logic
    const validMarkets = enrichedMarkets.filter((market: any) => {
      // Filter 1: All markets must have CLOB token IDs (tradeable)
      if (!market.clobTokenIds) return false;

      // Closed markets have relaxed validation criteria
      if (market.closed === true) {
        // Filter out closed markets if not requested
        if (!includeClosed) return false;
        
        // For closed markets, skip liquidity and price checks
        // (already resolved, just showing historical data)
        return true;
      }

      // Validation for open markets only
      // Filter 2: Must be accepting orders (trading enabled)
      if (market.acceptingOrders === false) return false;

      // Filter 3: Validate tradeable prices
      // At least one outcome price must be between 0.05 and 0.95
      // This ensures meaningful trading opportunity (not too certain)
      if (market.outcomePrices) {
        try {
          const prices = JSON.parse(market.outcomePrices);
          const hasTradeablePrice = prices.some((price: string) => {
            const priceNum = parseFloat(price);
            return priceNum >= 0.05 && priceNum <= 0.95;
          });
          if (!hasTradeablePrice) return false;
        } catch {
          return false; // Invalid JSON in outcomePrices
        }
      }

      // Filter 4: Apply liquidity thresholds based on market tags
      // Evergreen tags (politics, elections) get lower threshold ($1,000)
      // Other markets require higher liquidity ($5,000) for quality
      const marketTagIds =
        market.tags?.map((t: any) => parseInt(t.id)) || [];
      const hasEvergreenTag = EVERGREEN_TAG_IDS.some((id) =>
        marketTagIds.includes(id)
      );

      const liquidity = parseFloat(market.liquidity || "0");

      if (!hasEvergreenTag && liquidity < MIN_LIQUIDITY_NON_EVERGREEN_USD) {
        return false;
      }
      if (liquidity < MIN_LIQUIDITY_USD) return false;

      return true;
    });

    // Apply sorting logic based on market status
    const sortedMarkets = validMarkets.sort((a: any, b: any) => {
      // Closed markets: Sort by end date (most recent first), then by volume
      if (a.closed && b.closed) {
        const aEndDate = new Date(a.endDateIso || a.endDate || 0).getTime();
        const bEndDate = new Date(b.endDateIso || b.endDate || 0).getTime();
        if (aEndDate !== bEndDate) {
          return bEndDate - aEndDate; // Most recent first
        }
        // If same end date, sort by volume
        const aVolume = parseFloat(a.volume24hr || a.volume || "0");
        const bVolume = parseFloat(b.volume24hr || b.volume || "0");
        return bVolume - aVolume;
      }

      // Mixed markets: Prioritize open markets over closed markets
      if (a.closed && !b.closed) return 1;
      if (!a.closed && b.closed) return -1;

      // Open markets: Sort by combined score (liquidity + volume)
      // Higher combined score indicates more active and liquid markets
      const aScore =
        parseFloat(a.liquidity || "0") +
        parseFloat(a.volume24hr || a.volume || "0");
      const bScore =
        parseFloat(b.liquidity || "0") +
        parseFloat(b.volume24hr || b.volume || "0");
      return bScore - aScore; // Descending order
    });

    // Apply client-side pagination after filtering and sorting
    // This ensures we return exactly the requested number of markets
    const startIndex = requestedOffset;
    const endIndex = startIndex + requestedLimit;
    const paginatedMarkets = sortedMarkets.slice(startIndex, endIndex);

    return NextResponse.json(paginatedMarkets);
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch markets",
      },
      { status: 500 }
    );
  }
}
