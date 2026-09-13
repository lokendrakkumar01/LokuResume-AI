const getApiBaseUrl = () => {
  let envUrl = (import.meta.env.VITE_API_URL || '').trim();

  // If env variable is set and not empty, prioritize it
  if (envUrl && envUrl !== 'http://localhost:8000') {
    if (envUrl.endsWith('/')) envUrl = envUrl.slice(0, -1);
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }
    return envUrl;
  }

  // Runtime detection: if running on onrender.com or external domain, connect to live Render backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com') || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
      return 'https://lokiresume-backend.onrender.com';
    }
  }

  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

export default {
  API_BASE_URL,
  APP_NAME: 'LokuResume AI',
  FOUNDER: 'Lokendra Kumar',
  TAGLINE: 'Build Smart. Score High. Get Hired.',
};
