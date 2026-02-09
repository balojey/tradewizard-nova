/**
 * Memory Context Formatter
 *
 * This module provides utilities for formatting historical agent signals
 * into human-readable text for inclusion in agent prompts.
 *
 * Requirements: 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { AgentMemoryContext, HistoricalSignal } from '../database/memory-retrieval.js';
import { getMemoryMetricsCollector } from './memory-metrics.js';

/**
 * Format options for memory context
 */
export interface MemoryFormatOptions {
  maxLength?: number; // Maximum character length (default: 1000)
  includeMetadata?: boolean; // Include metadata fields (default: false)
  dateFormat?: 'iso' | 'relative' | 'human'; // Date formatting style (default: 'human')
}

/**
 * Formatted memory context ready for agent prompt
 */
export interface FormattedMemoryContext {
  text: string;
  signalCount: number;
  truncated: boolean;
}

/**
 * Format agent memory context for inclusion in prompts
 *
 * Requirements:
 * - 2.2: Present each signal as distinct entry with clear separation
 * - 2.3: Format timestamps as human-readable dates
 * - 2.5: Present signals in chronological order (oldest to most recent)
 * - 7.1: Clear separation between signals
 * - 7.2: Human-readable timestamps
 * - 7.3: Percentages for probabilities and confidence
 * - 7.4: Bulleted list for key drivers
 * - 7.5: Truncation logic for long contexts
 *
 * @param memory - Agent memory context with historical signals
 * @param options - Formatting options
 * @returns Formatted memory context
 */
export function formatMemoryContext(
  memory: AgentMemoryContext,
  options: MemoryFormatOptions = {}
): FormattedMemoryContext {
  const startTime = Date.now();
  const metricsCollector = getMemoryMetricsCollector();
  
  const {
    maxLength = 1000,
    includeMetadata = false,
    dateFormat = 'human',
  } = options;

  try {
    // Requirement 2.4: Handle empty memory context
    if (!memory.hasHistory || memory.historicalSignals.length === 0) {
      const result = {
        text: 'No previous analysis available for this market.',
        signalCount: 0,
        truncated: false,
      };
      
      // Record formatting metrics
      const duration = Date.now() - startTime;
      const contextSize = new TextEncoder().encode(result.text).length;
      metricsCollector.recordContextFormatting({
        duration,
        success: true,
        agentName: memory.agentName,
        signalCount: 0,
        contextSize,
        truncated: false,
      });
      
      return result;
    }

    // Requirement 2.5: Sort signals chronologically (oldest first) to show evolution
    const sortedSignals = [...memory.historicalSignals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    let text = `Previous Analysis History (${sortedSignals.length} signal${sortedSignals.length > 1 ? 's' : ''}):\n\n`;
    let truncated = false;

    for (const signal of sortedSignals) {
      const signalText = formatSingleSignal(signal, dateFormat, includeMetadata);

      // Requirement 7.5: Check if adding this signal would exceed max length
      if (text.length + signalText.length > maxLength) {
        text += '\n[Additional signals truncated for brevity]';
        truncated = true;
        break;
      }

      text += signalText + '\n\n';
    }

    const result = {
      text: text.trim(),
      signalCount: sortedSignals.length,
      truncated,
    };
    
    // Record formatting metrics
    const duration = Date.now() - startTime;
    const contextSize = new TextEncoder().encode(result.text).length;
    metricsCollector.recordContextFormatting({
      duration,
      success: true,
      agentName: memory.agentName,
      signalCount: sortedSignals.length,
      contextSize,
      truncated,
    });

    return result;
  } catch (error) {
    // Record formatting error
    const duration = Date.now() - startTime;
    metricsCollector.recordContextFormatting({
      duration,
      success: false,
      agentName: memory.agentName,
      signalCount: memory.historicalSignals.length,
      contextSize: 0,
      truncated: false,
      error: {
        type: 'FORMATTING_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    });
    
    // Return fallback
    return {
      text: 'Error formatting memory context.',
      signalCount: 0,
      truncated: false,
    };
  }
}

/**
 * Format a single historical signal
 *
 * Requirements:
 * - 7.1: Clear entry with separation
 * - 7.2: Human-readable timestamp
 * - 7.3: Percentages for probabilities
 * - 7.4: Bulleted list for key drivers
 *
 * @param signal - Historical signal to format
 * @param dateFormat - Date formatting style
 * @param includeMetadata - Whether to include metadata
 * @returns Formatted signal text
 */
function formatSingleSignal(
  signal: HistoricalSignal,
  dateFormat: 'iso' | 'relative' | 'human',
  includeMetadata: boolean
): string {
  // Requirement 7.2: Format timestamp as human-readable
  const timestamp = formatTimestamp(signal.timestamp, dateFormat);

  // Requirement 7.3: Format probabilities and confidence as percentages
  const probability = formatPercentage(signal.fairProbability);
  const confidence = formatPercentage(signal.confidence);

  // Requirement 7.1: Clear entry with structured format
  let text = `Analysis from ${timestamp}:\n`;
  text += `  Direction: ${signal.direction}\n`;
  text += `  Fair Probability: ${probability}\n`;
  text += `  Confidence: ${confidence}\n`;

  // Requirement 7.4: Present key drivers as bulleted list
  if (signal.keyDrivers.length > 0) {
    text += `  Key Drivers:\n`;
    signal.keyDrivers.forEach((driver) => {
      text += `    • ${driver}\n`;
    });
  }

  if (includeMetadata && Object.keys(signal.metadata).length > 0) {
    text += `  Metadata: ${JSON.stringify(signal.metadata, null, 2)}\n`;
  }

  return text;
}

/**
 * Format timestamp according to specified format
 *
 * Requirement 7.2: Human-readable date formatting
 *
 * @param date - Date to format
 * @param format - Formatting style
 * @returns Formatted timestamp string
 */
function formatTimestamp(date: Date, format: 'iso' | 'relative' | 'human'): string {
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'relative':
      return getRelativeTime(date);
    case 'human':
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      });
  }
}

/**
 * Format number as percentage
 *
 * Requirement 7.3: Display probabilities and confidence as percentages
 *
 * @param value - Number between 0 and 1
 * @returns Formatted percentage string
 */
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get relative time description
 *
 * @param date - Date to describe
 * @returns Relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'less than 1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 1) return 'less than 1 hour ago';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US');
}
