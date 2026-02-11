-- ============================================================================
-- Market Updater Edge Function - Monitoring Queries
-- ============================================================================
-- This file contains SQL queries for monitoring the market-updater edge
-- function and tracking its performance, execution history, and data updates.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CRON JOB STATUS
-- ----------------------------------------------------------------------------

-- Check if the cron job is configured
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'market-updater-hourly';

-- View cron job execution history (last 24 hours)
SELECT 
  j.jobname,
  jrd.runid,
  jrd.job_pid,
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

-- Check cron job success rate (last 7 days)
SELECT 
  j.jobname,
  COUNT(*) AS total_runs,
  SUM(CASE WHEN jrd.status = 'succeeded' THEN 1 ELSE 0 END) AS successful_runs,
  SUM(CASE WHEN jrd.status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
  ROUND(
    100.0 * SUM(CASE WHEN jrd.status = 'succeeded' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) AS avg_duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
  AND jrd.start_time > NOW() - INTERVAL '7 days'
GROUP BY j.jobname;

-- View failed cron job runs with error messages
SELECT 
  j.jobname,
  jrd.runid,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
  AND jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '7 days'
ORDER BY jrd.start_time DESC;

-- Check when the cron job will run next
SELECT 
  jobname,
  schedule,
  CASE 
    WHEN active THEN 'Next run scheduled'
    ELSE 'Job is inactive'
  END AS status
FROM cron.job 
WHERE jobname = 'market-updater-hourly';

-- ----------------------------------------------------------------------------
-- 2. RECENT MARKET UPDATES
-- ----------------------------------------------------------------------------

-- View markets updated in the last hour
SELECT 
  condition_id,
  question,
  status,
  market_probability,
  volume_24h,
  liquidity,
  updated_at,
  NOW() - updated_at AS time_since_update
FROM markets
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- View markets updated in the last 24 hours
SELECT 
  condition_id,
  question,
  status,
  market_probability,
  volume_24h,
  liquidity,
  updated_at,
  NOW() - updated_at AS time_since_update
FROM markets
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- Count updates by hour (last 24 hours)
SELECT 
  DATE_TRUNC('hour', updated_at) AS update_hour,
  COUNT(*) AS markets_updated,
  COUNT(DISTINCT condition_id) AS unique_markets
FROM markets
WHERE updated_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', updated_at)
ORDER BY update_hour DESC;

-- View markets with significant probability changes (last 24 hours)
-- Note: This requires a history table or previous snapshot for comparison
-- For now, showing markets with extreme probabilities
SELECT 
  condition_id,
  question,
  market_probability,
  volume_24h,
  updated_at
FROM markets
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND (market_probability > 0.9 OR market_probability < 0.1)
ORDER BY updated_at DESC;

-- View most recently updated active markets
SELECT 
  condition_id,
  question,
  status,
  market_probability,
  volume_24h,
  liquidity,
  updated_at
FROM markets
WHERE status = 'active'
ORDER BY updated_at DESC
LIMIT 20;

-- Check for stale markets (not updated in over 2 hours)
SELECT 
  condition_id,
  question,
  status,
  updated_at,
  NOW() - updated_at AS time_since_update
FROM markets
WHERE status = 'active'
  AND updated_at < NOW() - INTERVAL '2 hours'
ORDER BY updated_at ASC;

-- ----------------------------------------------------------------------------
-- 3. RESOLUTION DETECTION TRACKING
-- ----------------------------------------------------------------------------

-- View recently resolved markets (last 24 hours)
SELECT 
  condition_id,
  question,
  status,
  resolved_outcome,
  market_probability AS final_probability,
  updated_at AS resolved_at
FROM markets
WHERE status = 'resolved'
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- View recently resolved markets (last 7 days)
SELECT 
  condition_id,
  question,
  status,
  resolved_outcome,
  market_probability AS final_probability,
  updated_at AS resolved_at
FROM markets
WHERE status = 'resolved'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- Count resolutions by day (last 30 days)
SELECT 
  DATE(updated_at) AS resolution_date,
  COUNT(*) AS markets_resolved,
  COUNT(CASE WHEN resolved_outcome = 'YES' THEN 1 END) AS yes_outcomes,
  COUNT(CASE WHEN resolved_outcome = 'NO' THEN 1 END) AS no_outcomes,
  COUNT(CASE WHEN resolved_outcome IS NULL THEN 1 END) AS unknown_outcomes
FROM markets
WHERE status = 'resolved'
  AND updated_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(updated_at)
ORDER BY resolution_date DESC;

-- View resolution outcomes distribution
SELECT 
  resolved_outcome,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM markets
WHERE status = 'resolved'
  AND updated_at > NOW() - INTERVAL '30 days'
GROUP BY resolved_outcome
ORDER BY count DESC;

-- Check for markets that might need manual review
-- (resolved but no outcome recorded)
SELECT 
  condition_id,
  question,
  status,
  resolved_outcome,
  updated_at
FROM markets
WHERE status = 'resolved'
  AND resolved_outcome IS NULL
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- ----------------------------------------------------------------------------
-- 4. MARKET STATUS OVERVIEW
-- ----------------------------------------------------------------------------

-- Overall market status distribution
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM markets
GROUP BY status
ORDER BY count DESC;

-- Active markets summary
SELECT 
  COUNT(*) AS total_active_markets,
  AVG(market_probability) AS avg_probability,
  AVG(volume_24h) AS avg_volume_24h,
  AVG(liquidity) AS avg_liquidity,
  MIN(updated_at) AS oldest_update,
  MAX(updated_at) AS newest_update
FROM markets
WHERE status = 'active';

-- Markets by update recency
SELECT 
  CASE 
    WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 'Last hour'
    WHEN updated_at > NOW() - INTERVAL '2 hours' THEN '1-2 hours ago'
    WHEN updated_at > NOW() - INTERVAL '6 hours' THEN '2-6 hours ago'
    WHEN updated_at > NOW() - INTERVAL '24 hours' THEN '6-24 hours ago'
    ELSE 'Over 24 hours ago'
  END AS update_recency,
  COUNT(*) AS market_count
FROM markets
WHERE status = 'active'
GROUP BY update_recency
ORDER BY 
  CASE update_recency
    WHEN 'Last hour' THEN 1
    WHEN '1-2 hours ago' THEN 2
    WHEN '2-6 hours ago' THEN 3
    WHEN '6-24 hours ago' THEN 4
    ELSE 5
  END;

-- ----------------------------------------------------------------------------
-- 5. PERFORMANCE METRICS
-- ----------------------------------------------------------------------------

-- Average update frequency per market (last 7 days)
WITH update_counts AS (
  SELECT 
    condition_id,
    COUNT(*) AS update_count,
    MIN(updated_at) AS first_update,
    MAX(updated_at) AS last_update
  FROM markets
  WHERE updated_at > NOW() - INTERVAL '7 days'
  GROUP BY condition_id
)
SELECT 
  AVG(update_count) AS avg_updates_per_market,
  MIN(update_count) AS min_updates,
  MAX(update_count) AS max_updates,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY update_count) AS median_updates
FROM update_counts;

-- Markets with highest volume (last 24 hours)
SELECT 
  condition_id,
  question,
  volume_24h,
  market_probability,
  liquidity,
  updated_at
FROM markets
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND volume_24h IS NOT NULL
ORDER BY volume_24h DESC
LIMIT 10;

-- Markets with highest liquidity (last 24 hours)
SELECT 
  condition_id,
  question,
  liquidity,
  market_probability,
  volume_24h,
  updated_at
FROM markets
WHERE updated_at > NOW() - INTERVAL '24 hours'
  AND liquidity IS NOT NULL
ORDER BY liquidity DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- 6. DATA QUALITY CHECKS
-- ----------------------------------------------------------------------------

-- Check for markets with missing data
SELECT 
  'Missing probability' AS issue,
  COUNT(*) AS count
FROM markets
WHERE status = 'active' AND market_probability IS NULL
UNION ALL
SELECT 
  'Missing volume' AS issue,
  COUNT(*) AS count
FROM markets
WHERE status = 'active' AND volume_24h IS NULL
UNION ALL
SELECT 
  'Missing liquidity' AS issue,
  COUNT(*) AS count
FROM markets
WHERE status = 'active' AND liquidity IS NULL;

-- Check for markets with invalid probability values
SELECT 
  condition_id,
  question,
  market_probability,
  updated_at
FROM markets
WHERE status = 'active'
  AND (market_probability < 0 OR market_probability > 1)
ORDER BY updated_at DESC;

-- Check for duplicate condition_ids (should be none)
SELECT 
  condition_id,
  COUNT(*) AS duplicate_count
FROM markets
GROUP BY condition_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 7. ALERTING QUERIES
-- ----------------------------------------------------------------------------

-- Markets that haven't been updated in over 3 hours (potential issue)
SELECT 
  condition_id,
  question,
  status,
  updated_at,
  NOW() - updated_at AS time_since_update
FROM markets
WHERE status = 'active'
  AND updated_at < NOW() - INTERVAL '3 hours'
ORDER BY updated_at ASC;

-- Check if cron job hasn't run in over 90 minutes (potential issue)
SELECT 
  j.jobname,
  MAX(jrd.start_time) AS last_run,
  NOW() - MAX(jrd.start_time) AS time_since_last_run,
  CASE 
    WHEN NOW() - MAX(jrd.start_time) > INTERVAL '90 minutes' THEN 'ALERT: Cron job overdue'
    ELSE 'OK'
  END AS status
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
GROUP BY j.jobname;

-- Recent failures requiring attention
SELECT 
  j.jobname,
  jrd.runid,
  jrd.status,
  jrd.return_message,
  jrd.start_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'market-updater-hourly'
  AND jrd.status = 'failed'
  AND jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
-- 
-- 1. Run these queries in the Supabase SQL Editor or via psql
-- 2. Adjust time intervals as needed for your monitoring requirements
-- 3. Consider creating views for frequently used queries
-- 4. Set up alerts based on the alerting queries (section 7)
-- 5. For production monitoring, consider integrating with tools like:
--    - Grafana for visualization
--    - PagerDuty for alerting
--    - Datadog for comprehensive monitoring
--
-- ============================================================================
