let rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim();

// Strip trailing slash if present
if (rawApiUrl.endsWith('/')) {
  rawApiUrl = rawApiUrl.slice(0, -1);
}

// If host is provided without protocol (e.g. render host: my-backend.onrender.com), prepend https://
if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}

const API_BASE_URL = rawApiUrl;

export default {
  API_BASE_URL,
  APP_NAME: 'LokuResume AI',
  FOUNDER: 'Lokendra Kumar',
  TAGLINE: 'Build Smart. Score High. Get Hired.',
};
