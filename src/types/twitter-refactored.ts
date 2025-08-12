/**
 * Twitter Types - Backward Compatibility Layer
 * Re-exports modular types to maintain existing API
 */

// Re-export all types from modular structure
export * from './twitter';

// Default export for legacy imports
import * as TwitterTypes from './twitter';
export default TwitterTypes;
