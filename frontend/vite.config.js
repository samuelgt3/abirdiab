import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Puts the public address (VITE_SITE_URL) into the share-image and structured-data tags of index.html
const siteUrl = () => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', (process.env.VITE_SITE_URL || '').replace(/\/$/, '')),
});

export default defineConfig({
  plugins: [react(), siteUrl()],
  // Set VITE_BASE if the site lives in a sub-folder (e.g. /abir/). Default: site root.
  base: process.env.VITE_BASE || '/',
  build: {
    rollupOptions: {
      output: {
        // libraries change rarely: separate files so browsers keep them cached between site updates
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: { environment: 'node' },
});
