"""Polymarket API client for fetching market and event data.

IMPORTANT: This client uses the CLOB API for fetching markets by condition_id,
as the Gamma API does not support direct condition_id lookups. The CLOB API
endpoint is: {clob_api_url}/markets/{condition_id}

The client supports both Gamma API and CLOB API response formats through
flexible model definitions with normalized property accessors.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Union
import httpx
from pydantic import BaseModel

from config import PolymarketConfig
from models.types import (
    MarketBriefingDocument,
    EventContext,
    StreamlinedEventMetadata,
    IngestionError
)
from utils.result import Ok, Err, Result


# ============================================================================
# Polymarket API Response Models
# ============================================================================

class PolymarketMarket(BaseModel):
    """Raw market data from Polymarket API (supports both Gamma and CLOB formats)."""
    # Core fields (present in both APIs)
    id: Optional[str] = None
    question: str
    conditionId: Optional[str] = None
    condition_id: Optional[str] = None  # CLOB API uses snake_case
    
    # Gamma API format (JSON strings)
    outcomes: Optional[str] = None  # JSON string like '["Yes", "No"]'
    outcomePrices: Optional[str] = None  # JSON string like "[0.52, 0.48]"
    
    # CLOB API format (tokens array)
    tokens: Optional[List[Dict[str, Any]]] = None  # CLOB API: [{"outcome": "Yes", "price": 0.52, ...}]
    
    # Common fields
    volume: Optional[str] = None
    liquidity: Optional[str] = None
    active: Optional[bool] = None
    closed: Optional[bool] = None
    description: Optional[str] = None
    endDate: Optional[str] = None
    end_date_iso: Optional[str] = None  # CLOB API uses snake_case
    startDate: Optional[str] = None
    image: Optional[str] = None
    icon: Optional[str] = None
    eventSlug: Optional[str] = None
    market_slug: Optional[str] = None  # CLOB API uses snake_case
    groupItemTitle: Optional[str] = None
    groupItemThreshold: Optional[str] = None
    spread: Optional[Union[str, int, float]] = None  # Can be string, int, or float
    volumeNum: Optional[float] = None
    liquidityNum: Optional[float] = None
    
    @property
    def normalized_condition_id(self) -> str:
        """Get condition ID regardless of API format."""
        return self.conditionId or self.condition_id or ""
    
    @property
    def normalized_market_id(self) -> str:
        """Get market ID/slug regardless of API format."""
        return self.id or self.market_slug or ""
    
    @property
    def normalized_end_date(self) -> Optional[str]:
        """Get end date regardless of API format."""
        return self.endDate or self.end_date_iso
    
    def get_outcomes_and_prices(self) -> tuple[List[str], List[float]]:
        """
        Extract outcomes and prices from either API format.
        
        Returns:
            Tuple of (outcomes list, prices list)
        """
        import json
        
        # Try Gamma API format first (JSON strings)
        if self.outcomes and self.outcomePrices:
            try:
                outcomes = json.loads(self.outcomes)
                prices_str = json.loads(self.outcomePrices)
                prices = [float(p) for p in prices_str]
                return outcomes, prices
            except (json.JSONDecodeError, ValueError):
                pass
        
        # Try CLOB API format (tokens array)
        if self.tokens:
            try:
                outcomes = [token.get("outcome", "") for token in self.tokens]
                prices = [float(token.get("price", 0)) for token in self.tokens]
                return outcomes, prices
            except (ValueError, TypeError):
                pass
        
        # Default fallback
        return ["Yes", "No"], [0.5, 0.5]


class PolymarketEvent(BaseModel):
    """Raw event data from Polymarket API."""
    id: str
    title: str
    description: Optional[str] = None
    slug: str
    markets: List[PolymarketMarket] = []
    tags: List[Dict[str, Any]] = []
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ============================================================================
# Polymarket Client
# ============================================================================

class PolymarketClient:
    """Client for interacting with Polymarket APIs."""
    
    def __init__(self, config: PolymarketConfig):
        """
        Initialize Polymarket client.
        
        Args:
            config: Polymarket configuration with API URLs
        """
        self.gamma_api_url = config.gamma_api_url
        self.clob_api_url = config.clob_api_url
        self.api_key = config.api_key
        self.max_retries = 3
        self.base_backoff = 1.0  # seconds
    
    async def fetch_market_data(
        self, 
        condition_id: str
    ) -> Result[PolymarketMarket, IngestionError]:
        """
        Fetch market data from Polymarket CLOB API using condition ID.
        
        Note: The Gamma API does not support fetching markets by condition_id directly.
        We use the CLOB API which accepts condition_id in the URL path.
        
        Args:
            condition_id: Polymarket condition ID
            
        Returns:
            Result containing PolymarketMarket or IngestionError
        """
        # Use CLOB API with condition_id in URL path (not Gamma API)
        url = f"{self.clob_api_url}/markets/{condition_id}"
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url)
                    
                    # Handle rate limiting
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", self.base_backoff * (2 ** attempt)))
                        await asyncio.sleep(retry_after)
                        continue
                    
                    # Handle not found
                    if response.status_code == 404:
                        return Err(IngestionError(
                            type="INVALID_MARKET_ID",
                            message=f"Market not found for condition_id: {condition_id}",
                            details={"condition_id": condition_id}
                        ))
                    
                    # Raise for other HTTP errors
                    response.raise_for_status()
                    
                    # Parse response - CLOB API returns a single market object
                    data = response.json()
                    
                    # Handle empty results
                    if not data:
                        return Err(IngestionError(
                            type="INVALID_MARKET_ID",
                            message=f"No market data found for condition_id: {condition_id}",
                            details={"condition_id": condition_id}
                        ))
                    
                    # CLOB API returns a single market object directly
                    market_data = data
                    
                    # Validate and parse market data
                    try:
                        market = PolymarketMarket(**market_data)
                        return Ok(market)
                    except Exception as e:
                        return Err(IngestionError(
                            type="VALIDATION_FAILED",
                            message=f"Failed to validate market data: {str(e)}",
                            details={"condition_id": condition_id, "error": str(e)}
                        ))
                    
            except httpx.TimeoutException:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"Request timeout after {self.max_retries} attempts",
                        details={"condition_id": condition_id}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except httpx.HTTPStatusError as e:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"HTTP error: {e.response.status_code} - {str(e)}",
                        details={"condition_id": condition_id, "status_code": e.response.status_code}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except Exception as e:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"Unexpected error: {str(e)}",
                        details={"condition_id": condition_id, "error": str(e)}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
        
        # Should not reach here, but handle it
        return Err(IngestionError(
            type="API_UNAVAILABLE",
            message="Max retries exceeded",
            details={"condition_id": condition_id}
        ))
    
    async def fetch_event_data(
        self, 
        event_slug: str
    ) -> Result[PolymarketEvent, IngestionError]:
        """
        Fetch event data from Polymarket API.
        
        Args:
            event_slug: Polymarket event slug
            
        Returns:
            Result containing PolymarketEvent or IngestionError
        """
        url = f"{self.gamma_api_url}/events/{event_slug}"
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url)
                    
                    # Handle rate limiting
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", self.base_backoff * (2 ** attempt)))
                        await asyncio.sleep(retry_after)
                        continue
                    
                    # Handle not found
                    if response.status_code == 404:
                        return Err(IngestionError(
                            type="INVALID_EVENT_ID",
                            message=f"Event not found for slug: {event_slug}",
                            details={"event_slug": event_slug}
                        ))
                    
                    # Raise for other HTTP errors
                    response.raise_for_status()
                    
                    # Parse response
                    data = response.json()
                    
                    # Validate and parse event data
                    try:
                        event = PolymarketEvent(**data)
                        return Ok(event)
                    except Exception as e:
                        return Err(IngestionError(
                            type="VALIDATION_FAILED",
                            message=f"Failed to validate event data: {str(e)}",
                            details={"event_slug": event_slug, "error": str(e)}
                        ))
                    
            except httpx.TimeoutException:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"Request timeout after {self.max_retries} attempts",
                        details={"event_slug": event_slug}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except httpx.HTTPStatusError as e:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"HTTP error: {e.response.status_code} - {str(e)}",
                        details={"event_slug": event_slug, "status_code": e.response.status_code}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except Exception as e:
                if attempt == self.max_retries - 1:
                    return Err(IngestionError(
                        type="API_UNAVAILABLE",
                        message=f"Unexpected error: {str(e)}",
                        details={"event_slug": event_slug, "error": str(e)}
                    ))
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
        
        # Should not reach here, but handle it
        return Err(IngestionError(
            type="API_UNAVAILABLE",
            message="Max retries exceeded",
            details={"event_slug": event_slug}
        ))
    
    def transform_to_mbd(
        self,
        market: PolymarketMarket,
        event: Optional[PolymarketEvent] = None
    ) -> MarketBriefingDocument:
        """
        Transform Polymarket data to Market Briefing Document format.
        Supports both Gamma API and CLOB API response formats.
        
        Args:
            market: Polymarket market data (from either Gamma or CLOB API)
            event: Optional event data for additional context
            
        Returns:
            MarketBriefingDocument with all required fields
        """
        # Parse outcomes and prices using the normalized method
        outcomes, prices = market.get_outcomes_and_prices()
        current_probability = prices[0] if prices else 0.5
        
        # Parse volume and liquidity
        try:
            volume_24h = float(market.volume) if market.volume else 0.0
            liquidity = float(market.liquidity) if market.liquidity else 0.0
        except (ValueError, TypeError):
            volume_24h = 0.0
            liquidity = 0.0
        
        # Calculate liquidity score (0-10 scale)
        # Simple heuristic: log scale based on liquidity amount
        if liquidity > 0:
            import math
            liquidity_score = min(10.0, max(0.0, math.log10(liquidity + 1)))
        else:
            liquidity_score = 0.0
        
        # Calculate bid-ask spread
        try:
            spread = float(market.spread) if market.spread else 0.01
        except ValueError:
            spread = 0.01
        bid_ask_spread = spread * 100  # Convert to cents
        
        # Determine volatility regime based on spread and liquidity
        if bid_ask_spread < 1.0 and liquidity_score > 7.0:
            volatility_regime = "low"
        elif bid_ask_spread > 3.0 or liquidity_score < 3.0:
            volatility_regime = "high"
        else:
            volatility_regime = "medium"
        
        # Determine event type from tags or description
        event_type = "other"
        if event and event.tags:
            tag_labels = [tag.get("label", "").lower() for tag in event.tags]
            if any(t in tag_labels for t in ["politics", "election"]):
                event_type = "election"
            elif any(t in tag_labels for t in ["policy", "legislation"]):
                event_type = "policy"
            elif any(t in tag_labels for t in ["court", "legal"]):
                event_type = "court"
            elif any(t in tag_labels for t in ["geopolitics", "international"]):
                event_type = "geopolitical"
            elif any(t in tag_labels for t in ["economy", "economics"]):
                event_type = "economic"
        
        # Parse expiry timestamp using normalized end date
        expiry_timestamp = int(time.time()) + (30 * 24 * 60 * 60)  # Default 30 days
        end_date = market.normalized_end_date
        if end_date:
            try:
                from datetime import datetime
                expiry_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                expiry_timestamp = int(expiry_dt.timestamp())
            except (ValueError, AttributeError):
                pass
        
        # Build event context if available
        event_context = None
        if event:
            related_markets = [m.id for m in event.markets if m.id != market.id]
            event_context = EventContext(
                event_id=event.id,
                event_title=event.title,
                event_description=event.description or "",
                related_markets=related_markets[:5],  # Limit to 5
                tags=[tag.get("label", "") for tag in event.tags]
            )
        
        # Build metadata using normalized IDs
        metadata = StreamlinedEventMetadata(
            market_id=market.normalized_market_id,
            condition_id=market.normalized_condition_id,
            created_at=int(time.time()),
            last_updated=int(time.time()),
            source="polymarket",
            version="1.0"
        )
        
        # Create MBD using normalized IDs
        mbd = MarketBriefingDocument(
            market_id=market.normalized_market_id,
            condition_id=market.normalized_condition_id,
            event_type=event_type,
            question=market.question,
            resolution_criteria=market.description or "Market will resolve based on official sources.",
            expiry_timestamp=expiry_timestamp,
            current_probability=current_probability,
            liquidity_score=liquidity_score,
            bid_ask_spread=bid_ask_spread,
            volatility_regime=volatility_regime,
            volume_24h=volume_24h,
            event_context=event_context,
            keywords=None,  # Will be populated by keyword extraction node
            metadata=metadata
        )
        
        return mbd


# ============================================================================
# Convenience Functions
# ============================================================================

async def fetch_and_transform_market(
    condition_id: str,
    config: PolymarketConfig
) -> Result[MarketBriefingDocument, IngestionError]:
    """
    Fetch market data and transform to MBD in one call.
    
    Args:
        condition_id: Polymarket condition ID
        config: Polymarket configuration
        
    Returns:
        Result containing MarketBriefingDocument or IngestionError
    """
    client = PolymarketClient(config)
    
    # Fetch market data
    market_result = await client.fetch_market_data(condition_id)
    if market_result.is_err():
        return market_result
    
    market = market_result.unwrap()
    
    # Optionally fetch event data
    event = None
    if market.eventSlug:
        event_result = await client.fetch_event_data(market.eventSlug)
        if event_result.is_ok():
            event = event_result.unwrap()
    
    # Transform to MBD
    mbd = client.transform_to_mbd(market, event)
    return Ok(mbd)
