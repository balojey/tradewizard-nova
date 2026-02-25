"""NewsData.io API client for fetching news articles."""

import asyncio
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel


# ============================================================================
# NewsData API Response Models
# ============================================================================

class NewsDataArticle(BaseModel):
    """Individual news article from NewsData API."""
    article_id: str
    title: str
    link: str
    description: Optional[str] = None
    content: Optional[str] = None
    pubDate: Optional[str] = None
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_icon: Optional[str] = None
    language: Optional[str] = None
    country: Optional[List[str]] = None
    category: Optional[List[str]] = None
    sentiment: Optional[str] = None
    sentiment_stats: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class NewsDataResponse(BaseModel):
    """Response from NewsData API."""
    status: str
    totalResults: int
    results: List[NewsDataArticle]
    nextPage: Optional[str] = None


# ============================================================================
# NewsData Client
# ============================================================================

class NewsDataClient:
    """Async HTTP client for NewsData.io API."""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://newsdata.io/api/1",
        timeout: int = 30
    ):
        """
        Initialize NewsData client with API key and configuration.
        
        Args:
            api_key: NewsData.io API key
            base_url: Base URL for NewsData API (default: https://newsdata.io/api/1)
            timeout: Request timeout in seconds (default: 30)
        """
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = 3
        self.base_backoff = 1.0  # seconds
    
    async def fetch_latest_news(
        self,
        query: Optional[str] = None,
        qInTitle: Optional[str] = None,
        timeframe: str = "24h",
        country: Optional[List[str]] = None,
        category: Optional[List[str]] = None,
        language: List[str] = ["en"],
        sentiment: Optional[str] = None,
        size: int = 20,
        removeduplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch latest news from past 48 hours.
        
        Args:
            query: Search query for article content
            qInTitle: Search query for article titles only
            timeframe: Time window (1h, 6h, 12h, 24h, 48h)
            country: Country codes (e.g., ['us', 'uk'])
            category: News categories
            language: Language codes (default: ['en'])
            sentiment: Filter by sentiment (positive, negative, neutral)
            size: Number of articles (1-50, default: 20)
            removeduplicate: Remove duplicate articles (default: True)
            
        Returns:
            Dict containing NewsData API response
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If response parsing fails
        """
        endpoint = f"{self.base_url}/latest"
        
        # Build query parameters
        params = {
            "apikey": self.api_key,
            "language": ",".join(language),
            "size": min(size, 50),  # API max is 50
            "removeduplicate": 1 if removeduplicate else 0,
            "timeframe": timeframe
        }
        
        if query:
            params["q"] = query
        if qInTitle:
            params["qInTitle"] = qInTitle
        if country:
            params["country"] = ",".join(country)
        if category:
            params["category"] = ",".join(category)
        if sentiment:
            params["sentiment"] = sentiment
        
        return await self._make_request(endpoint, params)
    
    async def fetch_archive_news(
        self,
        from_date: str,
        to_date: str,
        query: Optional[str] = None,
        qInTitle: Optional[str] = None,
        country: Optional[List[str]] = None,
        category: Optional[List[str]] = None,
        language: List[str] = ["en"],
        size: int = 20,
        removeduplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch historical news with date range.
        
        Args:
            from_date: Start date (YYYY-MM-DD format)
            to_date: End date (YYYY-MM-DD format)
            query: Search query for article content
            qInTitle: Search query for article titles only
            country: Country codes (e.g., ['us', 'uk'])
            category: News categories
            language: Language codes (default: ['en'])
            size: Number of articles (1-50, default: 20)
            removeduplicate: Remove duplicate articles (default: True)
            
        Returns:
            Dict containing NewsData API response
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If response parsing fails
        """
        endpoint = f"{self.base_url}/archive"
        
        # Build query parameters
        params = {
            "apikey": self.api_key,
            "from_date": from_date,
            "to_date": to_date,
            "language": ",".join(language),
            "size": min(size, 50),
            "removeduplicate": 1 if removeduplicate else 0
        }
        
        if query:
            params["q"] = query
        if qInTitle:
            params["qInTitle"] = qInTitle
        if country:
            params["country"] = ",".join(country)
        if category:
            params["category"] = ",".join(category)
        
        return await self._make_request(endpoint, params)
    
    async def fetch_crypto_news(
        self,
        coin: Optional[List[str]] = None,
        query: Optional[str] = None,
        qInTitle: Optional[str] = None,
        timeframe: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sentiment: Optional[str] = None,
        language: List[str] = ["en"],
        size: int = 20,
        removeduplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch cryptocurrency-related news.
        
        Args:
            coin: Cryptocurrency symbols (e.g., ['BTC', 'ETH'])
            query: Search query for article content
            qInTitle: Search query for article titles only
            timeframe: Time window (1h, 6h, 12h, 24h, 48h)
            from_date: Start date for archive search (YYYY-MM-DD)
            to_date: End date for archive search (YYYY-MM-DD)
            sentiment: Filter by sentiment (positive, negative, neutral)
            language: Language codes (default: ['en'])
            size: Number of articles (1-50, default: 20)
            removeduplicate: Remove duplicate articles (default: True)
            
        Returns:
            Dict containing NewsData API response
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If response parsing fails
        """
        endpoint = f"{self.base_url}/crypto"
        
        # Build query parameters
        params = {
            "apikey": self.api_key,
            "language": ",".join(language),
            "size": min(size, 50),
            "removeduplicate": 1 if removeduplicate else 0
        }
        
        if coin:
            params["coin"] = ",".join(coin)
        if query:
            params["q"] = query
        if qInTitle:
            params["qInTitle"] = qInTitle
        if timeframe:
            params["timeframe"] = timeframe
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        if sentiment:
            params["sentiment"] = sentiment
        
        return await self._make_request(endpoint, params)
    
    async def fetch_market_news(
        self,
        symbol: Optional[List[str]] = None,
        organization: Optional[List[str]] = None,
        query: Optional[str] = None,
        qInTitle: Optional[str] = None,
        timeframe: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sentiment: Optional[str] = None,
        country: Optional[List[str]] = None,
        language: List[str] = ["en"],
        size: int = 20,
        removeduplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch financial market and company news.
        
        Args:
            symbol: Stock symbols (e.g., ['AAPL', 'GOOGL'])
            organization: Organization names
            query: Search query for article content
            qInTitle: Search query for article titles only
            timeframe: Time window (1h, 6h, 12h, 24h, 48h)
            from_date: Start date for archive search (YYYY-MM-DD)
            to_date: End date for archive search (YYYY-MM-DD)
            sentiment: Filter by sentiment (positive, negative, neutral)
            country: Country codes (e.g., ['us', 'uk'])
            language: Language codes (default: ['en'])
            size: Number of articles (1-50, default: 20)
            removeduplicate: Remove duplicate articles (default: True)
            
        Returns:
            Dict containing NewsData API response
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If response parsing fails
        """
        endpoint = f"{self.base_url}/news"
        
        # Build query parameters
        params = {
            "apikey": self.api_key,
            "language": ",".join(language),
            "size": min(size, 50),
            "removeduplicate": 1 if removeduplicate else 0
        }
        
        if symbol:
            params["symbol"] = ",".join(symbol)
        if organization:
            params["organization"] = ",".join(organization)
        if query:
            params["q"] = query
        if qInTitle:
            params["qInTitle"] = qInTitle
        if timeframe:
            params["timeframe"] = timeframe
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        if sentiment:
            params["sentiment"] = sentiment
        if country:
            params["country"] = ",".join(country)
        
        return await self._make_request(endpoint, params)
    
    async def _make_request(
        self,
        endpoint: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Make HTTP request to NewsData API with exponential backoff.
        
        Args:
            endpoint: API endpoint URL
            params: Query parameters
            
        Returns:
            Dict containing API response
            
        Raises:
            httpx.HTTPError: If API request fails after retries
            ValueError: If response parsing fails
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(endpoint, params=params)
                    
                    # Handle rate limiting
                    if response.status_code == 429:
                        retry_after = int(
                            response.headers.get(
                                "Retry-After",
                                self.base_backoff * (2 ** attempt)
                            )
                        )
                        await asyncio.sleep(retry_after)
                        continue
                    
                    # Raise for HTTP errors
                    response.raise_for_status()
                    
                    # Parse JSON response
                    try:
                        data = response.json()
                        return data
                    except Exception as e:
                        # Don't retry JSON parsing errors - raise immediately
                        raise ValueError(
                            f"Failed to parse NewsData API response: {str(e)}"
                        ) from e
                    
            except ValueError:
                # Re-raise ValueError immediately without retry
                raise
                
            except httpx.TimeoutException as e:
                last_exception = e
                if attempt == self.max_retries - 1:
                    raise httpx.TimeoutException(
                        f"NewsData API request timeout after {self.max_retries} attempts"
                    ) from e
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except httpx.HTTPStatusError as e:
                last_exception = e
                # Don't retry on client errors (4xx except 429)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise
                
                # Retry on server errors (5xx)
                if attempt == self.max_retries - 1:
                    raise
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
                
            except httpx.RequestError as e:
                last_exception = e
                # Network errors - retry with backoff
                if attempt == self.max_retries - 1:
                    raise
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
            
            except Exception as e:
                # Catch any other unexpected errors
                last_exception = e
                if attempt == self.max_retries - 1:
                    raise RuntimeError(
                        f"Unexpected error in _make_request: {str(e)}"
                    ) from e
                await asyncio.sleep(self.base_backoff * (2 ** attempt))
        
        # If we exhausted retries without returning or raising, raise the last exception
        if last_exception:
            raise RuntimeError(
                f"Request failed after {self.max_retries} attempts"
            ) from last_exception
        else:
            raise RuntimeError("Unexpected error: no response after retries")
