"""Unit tests for NewsData client."""

import pytest
import httpx
from unittest.mock import AsyncMock, patch
from tools.newsdata_client import NewsDataClient, NewsDataResponse


@pytest.mark.asyncio
async def test_newsdata_client_initialization():
    """Test NewsData client initialization with API key and configuration."""
    client = NewsDataClient(
        api_key="test_api_key",
        base_url="https://newsdata.io/api/1",
        timeout=30
    )
    
    assert client.api_key == "test_api_key"
    assert client.base_url == "https://newsdata.io/api/1"
    assert client.timeout == 30
    assert client.max_retries == 3
    assert client.base_backoff == 1.0


@pytest.mark.asyncio
async def test_fetch_latest_news_builds_correct_params():
    """Test that fetch_latest_news constructs correct query parameters."""
    client = NewsDataClient(api_key="test_key")
    
    # Mock the _make_request method
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {
            "status": "success",
            "totalResults": 1,
            "results": []
        }
        
        await client.fetch_latest_news(
            query="election",
            qInTitle="Trump",
            timeframe="24h",
            country=["us"],
            category=["politics"],
            language=["en"],
            sentiment="positive",
            size=10,
            removeduplicate=True
        )
        
        # Verify _make_request was called with correct parameters
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        endpoint = call_args[0][0]
        params = call_args[0][1]
        
        assert endpoint == "https://newsdata.io/api/1/latest"
        assert params["apikey"] == "test_key"
        assert params["q"] == "election"
        assert params["qInTitle"] == "Trump"
        assert params["timeframe"] == "24h"
        assert params["country"] == "us"
        assert params["category"] == "politics"
        assert params["language"] == "en"
        assert params["sentiment"] == "positive"
        assert params["size"] == 10
        assert params["removeduplicate"] == 1


@pytest.mark.asyncio
async def test_fetch_archive_news_builds_correct_params():
    """Test that fetch_archive_news constructs correct query parameters."""
    client = NewsDataClient(api_key="test_key")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"status": "success", "totalResults": 0, "results": []}
        
        await client.fetch_archive_news(
            from_date="2024-01-01",
            to_date="2024-01-31",
            query="market",
            country=["us", "uk"],
            language=["en"]
        )
        
        call_args = mock_request.call_args
        endpoint = call_args[0][0]
        params = call_args[0][1]
        
        assert endpoint == "https://newsdata.io/api/1/archive"
        assert params["from_date"] == "2024-01-01"
        assert params["to_date"] == "2024-01-31"
        assert params["q"] == "market"
        assert params["country"] == "us,uk"


@pytest.mark.asyncio
async def test_fetch_crypto_news_builds_correct_params():
    """Test that fetch_crypto_news constructs correct query parameters."""
    client = NewsDataClient(api_key="test_key")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"status": "success", "totalResults": 0, "results": []}
        
        await client.fetch_crypto_news(
            coin=["BTC", "ETH"],
            query="price",
            timeframe="24h",
            sentiment="positive"
        )
        
        call_args = mock_request.call_args
        endpoint = call_args[0][0]
        params = call_args[0][1]
        
        assert endpoint == "https://newsdata.io/api/1/crypto"
        assert params["coin"] == "BTC,ETH"
        assert params["q"] == "price"
        assert params["timeframe"] == "24h"
        assert params["sentiment"] == "positive"


@pytest.mark.asyncio
async def test_fetch_market_news_builds_correct_params():
    """Test that fetch_market_news constructs correct query parameters."""
    client = NewsDataClient(api_key="test_key")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"status": "success", "totalResults": 0, "results": []}
        
        await client.fetch_market_news(
            symbol=["AAPL", "GOOGL"],
            organization=["Apple", "Google"],
            query="earnings",
            sentiment="neutral"
        )
        
        call_args = mock_request.call_args
        endpoint = call_args[0][0]
        params = call_args[0][1]
        
        assert endpoint == "https://newsdata.io/api/1/news"
        assert params["symbol"] == "AAPL,GOOGL"
        assert params["organization"] == "Apple,Google"
        assert params["q"] == "earnings"
        assert params["sentiment"] == "neutral"


@pytest.mark.asyncio
async def test_make_request_handles_rate_limiting():
    """Test that _make_request handles 429 rate limiting with retry."""
    client = NewsDataClient(api_key="test_key")
    
    # Mock httpx.AsyncClient
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # First call returns 429, second call succeeds
        from unittest.mock import MagicMock
        mock_response_429 = MagicMock()
        mock_response_429.status_code = 429
        mock_response_429.headers.get.return_value = "1"
        
        mock_response_200 = MagicMock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {"status": "success", "results": []}
        
        mock_client.get.side_effect = [mock_response_429, mock_response_200]
        
        result = await client._make_request("https://test.com", {"apikey": "test"})
        
        assert result["status"] == "success"
        assert mock_client.get.call_count == 2


@pytest.mark.asyncio
async def test_make_request_handles_timeout():
    """Test that _make_request handles timeout with retry."""
    client = NewsDataClient(api_key="test_key")
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # All attempts timeout
        mock_client.get.side_effect = httpx.TimeoutException("Timeout")
        
        with pytest.raises(httpx.TimeoutException):
            await client._make_request("https://test.com", {"apikey": "test"})
        
        # Should retry max_retries times
        assert mock_client.get.call_count == 3


@pytest.mark.asyncio
async def test_make_request_handles_http_errors():
    """Test that _make_request handles HTTP errors appropriately."""
    client = NewsDataClient(api_key="test_key")
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # 404 should not retry
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 404
        
        def raise_http_error():
            raise httpx.HTTPStatusError(
                "Not found", request=MagicMock(), response=mock_response
            )
        
        mock_response.raise_for_status = raise_http_error
        mock_client.get.return_value = mock_response
        
        with pytest.raises(httpx.HTTPStatusError):
            await client._make_request("https://test.com", {"apikey": "test"})
        
        # Should only try once for 4xx errors
        assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_make_request_parses_json_response():
    """Test that _make_request successfully parses JSON response."""
    client = NewsDataClient(api_key="test_key")
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "totalResults": 2,
            "results": [
                {"article_id": "1", "title": "Test 1", "link": "http://test1.com"},
                {"article_id": "2", "title": "Test 2", "link": "http://test2.com"}
            ]
        }
        
        mock_client.get.return_value = mock_response
        
        result = await client._make_request("https://test.com", {"apikey": "test"})
        
        assert result["status"] == "success"
        assert result["totalResults"] == 2
        assert len(result["results"]) == 2


@pytest.mark.asyncio
async def test_make_request_handles_invalid_json():
    """Test that _make_request handles invalid JSON response."""
    client = NewsDataClient(api_key="test_key")
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("Invalid JSON")
        
        mock_client.get.return_value = mock_response
        
        with pytest.raises(ValueError, match="Failed to parse NewsData API response"):
            await client._make_request("https://test.com", {"apikey": "test"})


@pytest.mark.asyncio
async def test_size_parameter_capped_at_50():
    """Test that size parameter is capped at API maximum of 50."""
    client = NewsDataClient(api_key="test_key")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"status": "success", "totalResults": 0, "results": []}
        
        # Request 100 articles, should be capped at 50
        await client.fetch_latest_news(size=100)
        
        call_args = mock_request.call_args
        params = call_args[0][1]
        
        assert params["size"] == 50
