/**
 * Shared map configuration for Waypoint.
 * Uses Stadia Maps' Alidade Smooth Dark tiles re-colored via CSS filters
 * combined with CartoDB dark_all tiles for a navy ocean / cream land aesthetic.
 *
 * Color tokens from tailwind.config.js:
 *   ink:    #12172A  (navy — used for water/ocean)
 *   paper:  #F1EEE5  (cream — used for landmass)
 *   route:  #2F6F5E  (teal — used for route lines)
 *   signal: #D98E04  (amber — used for accents)
 *   stub:   #E4DFCF  (muted cream — used for UI surfaces)
 */

// Waypoint color tokens (must match tailwind.config.js)
export const COLORS = {
  ink: '#12172A',
  paper: '#F1EEE5',
  route: '#2F6F5E',
  routeDark: '#204F42',
  signal: '#D98E04',
  stub: '#E4DFCF',
  panel: '#FFFFFF',
};

/**
 * Tile layer URL for a dark-themed map.
 * We use CartoDB's dark_nolabels + dark_only_labels combo to separate
 * backgrounds from text, then apply a CSS filter to shift colors
 * toward our navy/cream palette.
 */
export const TILE_URL_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';

export const TILE_URL_LABELS =
  'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';

// Fallback: standard CartoDB dark_all (combined)
export const TILE_URL_COMBINED =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

/**
 * Default map center (India) and zoom
 */
export const DEFAULT_CENTER = [20.5937, 78.9629];
export const DEFAULT_ZOOM = 5;

/**
 * CSS filter string applied to the tile layer container to shift
 * CartoDB dark tiles toward our ink/paper palette.
 *
 * The dark_nolabels tiles have ~#2c2c2c land and ~#000 water.
 * We apply:
 *   - brightness(1.1) to lighten slightly
 *   - sepia(0.3) to warm the greys toward cream
 *   - hue-rotate(200deg) to shift toward blue/navy for water
 *   - saturate(0.7) to keep it muted
 */
export const TILE_FILTER = 'brightness(1.1) sepia(0.3) hue-rotate(200deg) saturate(0.7)';

/**
 * Traveled vs remaining route line colors.
 */
export const ROUTE_LINE = {
  remaining: COLORS.route,      // #2F6F5E teal
  traveled: '#5A7A72',          // muted/desaturated teal
  width: 5,
  glowWidth: 10,
};
