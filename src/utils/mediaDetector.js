// ARCHIVED / DEPRECATED: Mock media detector is removed.
// OmniStream production uses the real yt-dlp -> backend -> App.jsx pipeline.
// No mock or simulated data is used.

export const PLATFORMS = {};
export const PRESET_SAMPLES = [];
export function detectPlatform() { return { id: 'unknown', name: 'Unknown' }; }
export function detectMediaType() { return 'video'; }
export function getMockMetadata() {
  throw new Error('Mock metadata is deprecated. Use the live backend API (/api/info) instead.');
}
