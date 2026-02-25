-- ============================================================================
-- Migration: Direct Market Updater Cron Job
-- ============================================================================
-- Description: Replaces HTTP-based edge function call with direct SQL procedure
-- Date: 2026-02-19
-- 
-- This migration eliminates the need for the market-updater edge function by
-- implementing the market update logic directly in PostgreSQL using PL/pgSQL.
-- The cron job now executes a stored procedure instead of making HTTP requests.
-- ============================================================================

-- ============================================================================
-- Step 1: Create function to fetch market data from Polymarket API
-- ============================================================================
-- This function uses the http extension to fetch market data from Polymarket
-- and returns the parsed JSON response

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION fetch_polymarket_market_data(
  p_condition_id TEXT
)
RETURNS JSONB AS $
DECLARE
  v_response http_response;
  v_market_data JSONB;
  v_url TEXT;
BEGIN
  -- Construct Polymarket Gamma API URL
  v_url := 'https://clob.polymarket.com/markets/' || p_condition_id;
  
  -- Make HTTP GET request to Polymarket API
  v_response := http_get(v_url);
  
  -- Check if request was successful (status 200)
  IF v_response.status != 200 THEN
    RETURN NULL;
  END IF;
  
  -- Parse JSON response
  v_market_data := v_response.content::JSONB;
  
  RETURN v_market_data;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NULL to allow processing to continue
    RAISE WARNING 'Error fetching market data for condition_id %: %', p_condition_id, SQLERRM;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 2: Create function to update a single market
-- ============================================================================
-- This function fetches current data from Polymarket and updates the database
-- Returns a JSONB object with update results

CREATE OR REPLACE FUNCTION update_single_market(
  p_market_id TEXT,
  p_condition_id TEXT
)
RETURNS JSONB AS $
DECLARE
  v_market_data JSONB;
  v_current_record RECORD;
  v_probability DECIMAL(5,4);
  v_volume_24h DECIMAL(20,2);
  v_liquidity DECIMAL(20,2);
  v_resolved BOOLEAN;
  v_outcome TEXT;
  v_updates JSONB := '{}'::JSONB;
  v_updated_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Fetch current market data from Polymarket
  v_market_data := fetch_polymarket_market_data(p_condition_id);
  
  -- Return early if market not found
  IF v_market_data IS NULL THEN
    RETURN jsonb_build_object(
      'condition_id', p_condition_id,
      'success', false,
      'error', 'Market not found on Polymarket'
    );
  END IF;
  
  -- Get current database record
  SELECT market_probability, volume_24h, liquidity, status
  INTO v_current_record
  FROM markets
  WHERE id = p_market_id;
  
  -- Extract data from Polymarket response
  -- Probability from first CLOB token price
  v_probability := COALESCE(
    (v_market_data->'clobTokenIds'->0->>'price')::DECIMAL(5,4),
    0
  );
  
  -- Volume 24h
  v_volume_24h := COALESCE(
    (v_market_data->>'volume24hr')::DECIMAL(20,2),
    0
  );
  
  -- Liquidity
  v_liquidity := COALESCE(
    (v_market_data->>'liquidity')::DECIMAL(20,2),
    0
  );
  
  -- Resolution status
  v_resolved := COALESCE(
    (v_market_data->>'closed')::BOOLEAN AND 
    (v_market_data->>'resolvedAt') IS NOT NULL,
    false
  );
  
  -- Outcome
  v_outcome := v_market_data->>'outcome';
  
  -- Build update payload with changed fields only
  IF v_probability IS DISTINCT FROM v_current_record.market_probability THEN
    v_updates := v_updates || jsonb_build_object('market_probability', v_probability);
    v_updated_fields := array_append(v_updated_fields, 'market_probability');
  END IF;
  
  IF v_volume_24h IS DISTINCT FROM v_current_record.volume_24h THEN
    v_updates := v_updates || jsonb_build_object('volume_24h', v_volume_24h);
    v_updated_fields := array_append(v_updated_fields, 'volume_24h');
  END IF;
  
  IF v_liquidity IS DISTINCT FROM v_current_record.liquidity THEN
    v_updates := v_updates || jsonb_build_object('liquidity', v_liquidity);
    v_updated_fields := array_append(v_updated_fields, 'liquidity');
  END IF;
  
  IF v_resolved AND v_current_record.status != 'resolved' THEN
    v_updates := v_updates || jsonb_build_object('status', 'resolved');
    v_updated_fields := array_append(v_updated_fields, 'status');
    
    IF v_outcome IS NOT NULL THEN
      v_updates := v_updates || jsonb_build_object('resolved_outcome', v_outcome);
      v_updated_fields := array_append(v_updated_fields, 'resolved_outcome');
    END IF;
  END IF;
  
  -- Execute update if there are changes
  IF jsonb_object_keys(v_updates) IS NOT NULL THEN
    UPDATE markets
    SET
      market_probability = COALESCE((v_updates->>'market_probability')::DECIMAL(5,4), market_probability),
      volume_24h = COALESCE((v_updates->>'volume_24h')::DECIMAL(20,2), volume_24h),
      liquidity = COALESCE((v_updates->>'liquidity')::DECIMAL(20,2), liquidity),
      status = COALESCE(v_updates->>'status', status),
      resolved_outcome = COALESCE(v_updates->>'resolved_outcome', resolved_outcome),
      updated_at = NOW()
    WHERE id = p_market_id;
  END IF;
  
  -- Return success result
  RETURN jsonb_build_object(
    'condition_id', p_condition_id,
    'success', true,
    'updated_fields', array_to_json(v_updated_fields)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    RETURN jsonb_build_object(
      'condition_id', p_condition_id,
      'success', false,
      'error', SQLERRM
    );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Create main market updater procedure
-- ============================================================================
-- This procedure processes all active markets and returns execution summary

CREATE OR REPLACE FUNCTION run_market_updater()
RETURNS JSONB AS $
DECLARE
  v_start_time TIMESTAMP;
  v_market RECORD;
  v_result JSONB;
  v_total_markets INTEGER := 0;
  v_updated INTEGER := 0;
  v_resolved INTEGER := 0;
  v_failed INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_summary JSONB;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Process each active market
  FOR v_market IN 
    SELECT id, condition_id, question, status
    FROM markets
    WHERE status = 'active'
  LOOP
    v_total_markets := v_total_markets + 1;
    
    -- Update the market
    v_result := update_single_market(v_market.id, v_market.condition_id);
    
    -- Process result
    IF (v_result->>'success')::BOOLEAN THEN
      v_updated := v_updated + 1;
      
      -- Check if market was resolved
      IF 'status' = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_result->'updated_fields'))
      ) THEN
        v_resolved := v_resolved + 1;
      END IF;
    ELSE
      v_failed := v_failed + 1;
      v_errors := array_append(
        v_errors,
        v_market.condition_id || ': ' || (v_result->>'error')
      );
    END IF;
  END LOOP;
  
  -- Build execution summary
  v_summary := jsonb_build_object(
    'total_markets', v_total_markets,
    'updated', v_updated,
    'resolved', v_resolved,
    'failed', v_failed,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
    'errors', array_to_json(v_errors),
    'timestamp', NOW()
  );
  
  RETURN v_summary;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 4: Unschedule the existing HTTP-based cron job
-- ============================================================================

SELECT cron.unschedule('market-updater-hourly');

-- ============================================================================
-- Step 5: Create new direct SQL-based cron job
-- ============================================================================
-- Schedule the run_market_updater function to execute hourly
-- Cron expression '0 * * * *' means: at minute 0 of every hour

SELECT cron.schedule(
  'market-updater-hourly',           -- Job name
  '0 * * * *',                       -- Cron expression (every hour at minute 0)
  $
  SELECT run_market_updater();
  $
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Use these queries to verify the cron job is configured correctly:
--
-- 1. Check if the cron job exists:
-- SELECT * FROM cron.job WHERE jobname = 'market-updater-hourly';
--
-- 2. View recent job executions:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'market-updater-hourly')
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- 3. Check for failed executions:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'market-updater-hourly')
-- AND status = 'failed'
-- ORDER BY start_time DESC;
--
-- 4. Manually test the updater function:
-- SELECT run_market_updater();
--
-- 5. Test updating a specific market:
-- SELECT update_single_market(
--   (SELECT id FROM markets WHERE condition_id = 'YOUR_CONDITION_ID' LIMIT 1),
--   'YOUR_CONDITION_ID'
-- );

-- ============================================================================
-- Notes
-- ============================================================================
-- 
-- Benefits of this approach:
-- 1. No HTTP overhead - direct database execution
-- 2. No edge function cold starts
-- 3. Simpler architecture - all logic in one place
-- 4. Better error handling with PostgreSQL exception handling
-- 5. Easier to monitor via cron.job_run_details
-- 6. No need for service role keys or authentication headers
-- 
-- The edge function (market-updater) can now be deprecated and removed.
-- 
-- Performance considerations:
-- - The http extension is used for external API calls
-- - Each market is processed sequentially to avoid rate limiting
-- - Failed markets don't stop the entire process
-- - Execution summary is returned for monitoring
-- 
-- Monitoring:
-- - Use the verification queries above to check job status
-- - Check cron.job_run_details for execution history
-- - The return_message column contains the execution summary JSON
