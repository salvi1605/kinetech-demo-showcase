/**
 * Development Tools Configuration
 * 
 * Controls visibility of development/testing tools in the UI.
 * - In local development: always enabled
 * - In production: only enabled if VITE_DEV_TOOLS=true
 */
export const isDevToolsEnabled = 
  import.meta.env.VITE_DEV_TOOLS === 'true' || 
  import.meta.env.DEV;
