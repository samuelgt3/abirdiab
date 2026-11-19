import { createApiClient } from './apiClient.js';

/**
 * The one place the backend client is created (the file keeps its old name so no other file changes).
 * VITE_API_URL is the public address of the Django API, e.g. https://api.example.com/api
 * null when it is missing: the public site then runs on the bundled fallback content.
 */
const url = import.meta.env.VITE_API_URL;

export const supabase = url && !url.startsWith('paste-') ? createApiClient(url) : null;

export const hasSupabase = Boolean(supabase);
