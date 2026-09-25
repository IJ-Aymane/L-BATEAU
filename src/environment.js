const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const isBrowser = typeof window !== 'undefined';
const isLocalBrowser = isBrowser && localHosts.has(window.location.hostname);
const configuredApiUrl = import.meta.env.VITE_API_URL;
const configuredApiIsLocal = configuredApiUrl && /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(configuredApiUrl);

export const environment = {
  apiUrl: configuredApiUrl && (isLocalBrowser || !configuredApiIsLocal)
    ? configuredApiUrl
    : isLocalBrowser
      ? 'http://localhost:8080/api'
      : 'https://l-bateau-back.onrender.com/api',
};
