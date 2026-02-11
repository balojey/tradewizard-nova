/**
 * Timestamp Formatter Utility
 * 
 * Converts ISO 8601 timestamps to human-readable formats for AI agent consumption.
 * Supports both relative time (e.g., "2 hours ago") and absolute time (e.g., "January 15, 2024 at 3:30 PM EST").
 */

import { parseISO, formatDistanceToNow, format, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Options for timestamp formatting
 */
export interface TimestampFormatOptions {
  /**
   * Timezone for absolute time formatting
   * @default 'America/New_York'
   */
  timezone?: string;
  
  /**
   * Threshold in days for switching from relative to absolute time
   * @default 7
   */
  relativeThresholdDays?: number;
  
  /**
   * Reference time for relative calculations (defaults to now)
   */
  referenceTime?: Date;
}

/**
 * Format result with metadata
 */
export interface FormattedTimestamp {
  /**
   * Human-readable timestamp string
   */
  formatted: string;
  
  /**
   * Whether relative or absolute format was used
   */
  formatType: 'relative' | 'absolute' | 'fallback';
  
  /**
   * Original ISO 8601 timestamp (for debugging)
   */
  original: string;
}

/**
 * Configuration interface for timestamp formatting
 */
export interface TimestampFormatterConfig {
  /**
   * Enable/disable human-readable timestamp formatting
   * @default true
   */
  enabled: boolean;
  
  /**
   * Timezone for absolute time formatting
   * @default 'America/New_York'
   */
  timezone: string;
  
  /**
   * Threshold in days for switching from relative to absolute time
   * @default 7
   */
  relativeThresholdDays: number;
}

/**
 * Default configuration
 */
const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_THRESHOLD_DAYS = 7;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: TimestampFormatterConfig = {
  enabled: true,
  timezone: DEFAULT_TIMEZONE,
  relativeThresholdDays: DEFAULT_THRESHOLD_DAYS,
};

/**
 * Global configuration (can be overridden at runtime)
 */
let globalConfig: TimestampFormatterConfig = { ...DEFAULT_CONFIG };

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): TimestampFormatterConfig {
  return {
    enabled: process.env.ENABLE_HUMAN_READABLE_TIMESTAMPS !== 'false',
    timezone: process.env.TIMESTAMP_TIMEZONE || DEFAULT_TIMEZONE,
    relativeThresholdDays: parseInt(
      process.env.RELATIVE_TIME_THRESHOLD_DAYS || String(DEFAULT_THRESHOLD_DAYS),
      10
    ),
  };
}

/**
 * Initialize global configuration from environment variables
 */
function initializeConfig(): void {
  globalConfig = loadConfigFromEnv();
}

/**
 * Get current global configuration
 */
export function getConfig(): Readonly<TimestampFormatterConfig> {
  return { ...globalConfig };
}

/**
 * Set global configuration (for runtime override)
 * 
 * @param config - Partial configuration to merge with current config
 * 
 * @example
 * setConfig({ enabled: false }); // Disable formatting globally
 * setConfig({ timezone: 'America/Los_Angeles' }); // Change timezone
 */
export function setConfig(config: Partial<TimestampFormatterConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Reset configuration to defaults from environment variables
 */
export function resetConfig(): void {
  initializeConfig();
}

// Initialize configuration on module load
initializeConfig();

/**
 * Parse timestamp input to Date object
 */
function parseTimestamp(timestamp: string | number): Date | null {
  try {
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return parseISO(timestamp);
  } catch {
    return null;
  }
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 * 
 * @param isoTimestamp - ISO 8601 timestamp string or Unix timestamp number
 * @param referenceTime - Reference time for calculation (defaults to now)
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime('2024-01-15T15:30:00Z')
 * // => 'just now' | '5 minutes ago' | '2 hours ago' | '3 days ago'
 */
export function formatRelativeTime(
  isoTimestamp: string | number,
  referenceTime?: Date
): string {
  const date = parseTimestamp(isoTimestamp);
  
  if (!date || !isValid(date)) {
    return 'invalid timestamp';
  }

  const reference = referenceTime || new Date();
  const diffMs = reference.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute
  if (diffMinutes < 1) {
    return 'just now';
  }

  // 1-59 minutes
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  // 1-23 hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  // 1-6 days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Fallback to formatDistanceToNow for consistency
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format timestamp as absolute time (e.g., "January 15, 2024 at 3:30 PM EST")
 * 
 * @param isoTimestamp - ISO 8601 timestamp string or Unix timestamp number
 * @param timezone - Timezone for formatting (defaults to America/New_York)
 * @returns Absolute time string
 * 
 * @example
 * formatAbsoluteTime('2024-01-15T15:30:00Z')
 * // => 'January 15, 2024 at 3:30 PM EST'
 */
export function formatAbsoluteTime(
  isoTimestamp: string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = parseTimestamp(isoTimestamp);
  
  if (!date || !isValid(date)) {
    return 'invalid timestamp';
  }

  try {
    // Format: "MMMM d, yyyy 'at' h:mm a zzz"
    // MMMM = full month name (January)
    // d = day without leading zero
    // yyyy = full year
    // h = 12-hour format without leading zero
    // mm = minutes with leading zero
    // a = AM/PM
    // zzz = timezone abbreviation (EST/EDT)
    const formatted = formatInTimeZone(
      date,
      timezone,
      "MMMM d, yyyy 'at' h:mm a zzz"
    );
    
    return formatted;
  } catch (error) {
    // Fallback to UTC if timezone conversion fails
    console.warn('Timezone conversion failed, falling back to UTC', { error });
    return format(date, "MMMM d, yyyy 'at' h:mm a") + ' (UTC)';
  }
}

/**
 * Main formatting function - automatically chooses relative or absolute format
 * 
 * @param isoTimestamp - ISO 8601 timestamp string or Unix timestamp number
 * @param options - Formatting options (overrides global config)
 * @returns Formatted timestamp with metadata
 * 
 * @example
 * formatTimestamp('2024-01-15T15:30:00Z')
 * // => { formatted: '2 hours ago', formatType: 'relative', original: '2024-01-15T15:30:00Z' }
 * 
 * formatTimestamp('2024-01-01T15:30:00Z')
 * // => { formatted: 'January 1, 2024 at 3:30 PM EST', formatType: 'absolute', original: '2024-01-01T15:30:00Z' }
 */
export function formatTimestamp(
  isoTimestamp: string | number | null | undefined,
  options?: TimestampFormatOptions
): FormattedTimestamp {
  // Handle null/undefined
  if (isoTimestamp === null || isoTimestamp === undefined) {
    return {
      formatted: 'unknown time',
      formatType: 'fallback',
      original: String(isoTimestamp),
    };
  }

  const originalStr = String(isoTimestamp);
  const date = parseTimestamp(isoTimestamp);

  // Handle invalid timestamps
  if (!date || !isValid(date)) {
    return {
      formatted: 'invalid timestamp',
      formatType: 'fallback',
      original: originalStr,
    };
  }

  // Check if formatting is disabled globally
  if (!globalConfig.enabled) {
    // Return ISO 8601 format when disabled
    return {
      formatted: date.toISOString(),
      formatType: 'fallback',
      original: originalStr,
    };
  }

  // Merge options with global config
  const timezone = options?.timezone || globalConfig.timezone;
  const thresholdDays = options?.relativeThresholdDays ?? globalConfig.relativeThresholdDays;
  const referenceTime = options?.referenceTime || new Date();

  // Calculate age in days
  const diffMs = referenceTime.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Use relative format for recent timestamps (< threshold)
  if (diffDays < thresholdDays && diffDays >= 0) {
    return {
      formatted: formatRelativeTime(isoTimestamp, referenceTime),
      formatType: 'relative',
      original: originalStr,
    };
  }

  // Use absolute format for older timestamps
  return {
    formatted: formatAbsoluteTime(isoTimestamp, timezone),
    formatType: 'absolute',
    original: originalStr,
  };
}

/**
 * Batch format multiple timestamps efficiently
 * 
 * @param timestamps - Array of ISO 8601 timestamps
 * @param options - Formatting options
 * @returns Array of formatted timestamps
 */
export function formatTimestampBatch(
  timestamps: Array<string | number | null | undefined>,
  options?: TimestampFormatOptions
): FormattedTimestamp[] {
  return timestamps.map(timestamp => formatTimestamp(timestamp, options));
}
