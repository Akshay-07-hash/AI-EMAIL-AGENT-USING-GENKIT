import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Vite Dev Server Plugin: Mounts the Google Genkit AI backend on /api/ai/*
 * Runs strictly in Node.js on the server side during local development.
 * Never bundled into production client build.
 */
function genkitAiDevPlugin() {
  return {
    name: 'genkit-ai-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/ai')) {
          try {
            const { handleAiRequest } = await import('./server/router.js');
            await handleAiRequest(req, res);
          } catch (err) {
            console.error('[Vite AI Dev Plugin Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), genkitAiDevPlugin()],
})
