# Migration: Direct Market Updater Cron Job

**Date:** 2026-02-19  
**Migration File:** `20260219000000_direct_market_updater_cron.sql`

## Overview

This migration replaces the HTTP-based edge function approach with a direct SQL-based cron job that executes market updates entirely within PostgreSQL.

## What Changed

### Before
- Cron job made HTTP POST request to edge function endpoint
- Edge function fetched market data and updated database
- Required service role authentication
- Subject to cold starts and HTTP overhead

### After
- Cron job directly executes PL/pgSQL stored procedure
- All logic runs natively in PostgreSQL
- No HTTP overhead or authentication needed
- Faster execution and simpler architecture

## Architecture

The migration creates three PostgreSQL functions:

1. **`fetch_polymarket_market_data(condition_id)`**
   - Fetches market data from Polymarket Gamma API
   - Uses the `http` extension for external API calls
   - Returns JSONB or NULL on error

2. **`update_single_market(market_id, condition_id)`**
   - Updates a single market record
   - Compares current vs. fetched data
   - Only updates changed fields
   - Returns success/failure result

3. **`run_market_updater()`**
   - Main procedure called by cron job
   - Processes all active markets
   - Returns execution summary with stats

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
cd tradewizard-agents
supabase db push
```

### Option 2: Manual Application

1. Connect to your Supabase database
2. Run the migration file:
   ```sql
   \i supabase/migrations/20260219000000_direct_market_updater_cron.sql
   ```

### Option 3: Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste the migration file contents
3. Execute the query

## Verification

After applying the migration, verify it's working:

```sql
-- 1. Check if the cron job exists
SELECT * FROM cron.job WHERE jobname = 'market-updater-hourly';

-- 2. Manually test the updater function
SELECT run_market_updater();

-- 3. View recent job executions
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'market-updater-hourly')
ORDER BY start_time DESC
LIMIT 10;

-- 4. Check for failed executions
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'market-updater-hourly')
AND status = 'failed'
ORDER BY start_time DESC;
```

## Expected Output

The `run_market_updater()` function returns a JSONB summary:

```json
{
  "total_markets": 10,
  "updated": 9,
  "resolved": 1,
  "failed": 0,
  "duration_ms": 2345,
  "errors": [],
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

## Monitoring

### Check Cron Job Status

```sql
SELECT 
  jobname,
  schedule,
  active,
  nodename
FROM cron.job 
WHERE jobname = 'market-updater-hourly';
```

### View Execution History (Last 24 Hours)

```sql
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;
```

### Check Success Rate (Last 7 Days)

```sql
SELECT 
  j.jobname,
  COUNT(*) as total_runs,
  COUNT(CASE WHEN jrd.status = 'succeeded' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN jrd.status = 'failed' THEN 1 END) as failed_runs,
  ROUND(
    100.0 * COUNT(CASE WHEN jrd.status = 'succeeded' THEN 1 END) / COUNT(*),
    2
  ) AS success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) AS avg_duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
  AND jrd.start_time > NOW() - INTERVAL '7 days'
GROUP BY j.jobname;
```

## Benefits

1. **Performance**: No HTTP overhead or cold starts
2. **Simplicity**: All logic in one place (database)
3. **Reliability**: Better error handling with PostgreSQL exceptions
4. **Monitoring**: Direct access to execution logs via `cron.job_run_details`
5. **Security**: No need for service role keys or authentication headers
6. **Cost**: Reduced function invocations and network traffic

## Edge Function Deprecation

The `market-updater` edge function is now obsolete and can be removed:

```bash
# Optional: Remove the edge function
rm -rf tradewizard-agents/supabase/functions/market-updater
```

The edge function code is preserved in git history if needed for reference.

## Rollback

If you need to rollback to the HTTP-based approach:

```sql
-- 1. Unschedule the direct SQL cron job
SELECT cron.unschedule('market-updater-hourly');

-- 2. Drop the functions
DROP FUNCTION IF EXISTS run_market_updater();
DROP FUNCTION IF EXISTS update_single_market(TEXT, TEXT);
DROP FUNCTION IF EXISTS fetch_polymarket_market_data(TEXT);

-- 3. Re-apply the previous migration
-- Run: 20260211150000_update_market_updater_cron.sql
```

## Troubleshooting

### Issue: "function http_get does not exist"

**Solution:** Ensure the `http` extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS http;
```

### Issue: Cron job not running

**Solution:** Check if pg_cron is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Issue: Markets not updating

**Solution:** Manually test the function:
```sql
-- Test with a specific market
SELECT update_single_market(
  (SELECT id FROM markets WHERE status = 'active' LIMIT 1),
  (SELECT condition_id FROM markets WHERE status = 'active' LIMIT 1)
);

-- Check the error message in the result
```

### Issue: Rate limiting from Polymarket API

**Solution:** The function processes markets sequentially. If you have many markets, consider adding a delay between requests or batching updates.

## Support

For issues or questions:
1. Check the verification queries above
2. Review `cron.job_run_details` for error messages
3. Test the function manually with a single market
4. Check Supabase logs for any database errors
