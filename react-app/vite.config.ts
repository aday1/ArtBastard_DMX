import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import * as sass from 'sass'

// WebSocket fallback ports to try if default fails
const WS_FALLBACK_PORTS = [3000, 3001, 8080, 8081]
const MAX_RETRIES = 3
const RETRY_DELAY = 2000

// Check if we're skipping type checking
const skipTypeChecking = !!process.env.SKIP_TYPECHECKING

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: []
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        quietDeps: true, // Suppress warnings from Sass dependencies
      },
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // tsconfigRaw is correctly typed here, ensure your Vite version supports this structure
      // For older versions, this might need adjustment or removal if it causes type errors.
      tsconfigRaw: skipTypeChecking ? 
        { compilerOptions: { jsx: 'react-jsx' } } : // Simplified, ensure `skipLibCheck` and `strict` are not needed or handled elsewhere
        undefined
    }
  },
  build: {
    reportCompressedSize: !skipTypeChecking,
    rollupOptions: skipTypeChecking ? {
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED' || 
            warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            warning.message.includes('Use of eval')) {
          return;
        }
        warn(warning);
      }
    } : {}
  },
  server: {
    port: 3001,
    strictPort: false,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3030', // Changed from 3000 to 3030
        ws: true,
        secure: false,
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            if (err.message.includes('ECONNREFUSED')) {
              // Log a less verbose message for connection refused errors
              console.warn(`[VITE PROXY WARN] Backend not reachable for ${req.url} (ECONNREFUSED). Ensure backend is running on port 3030.`); // Port reference updated
              // Avoid crashing the Vite server by not re-throwing or sending a 500 if res is available
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Proxy error: Service unavailable. Backend may be down.' }));
              }
            } else {
              console.error(`[VITE PROXY ERROR] ${req.url}:`, err);
            }
          });
        }
      },
      // Proxy for /health endpoint, with similar simplified error handling
      '/health': {
        target: 'http://localhost:3030', // Changed from 3000 to 3030
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            if (err.message.includes('ECONNREFUSED')) {
              console.warn(`[VITE PROXY WARN] /health endpoint not reachable (ECONNREFUSED).`);
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Proxy error: /health service unavailable.' }));
              }
            } else {
              console.error(`[VITE PROXY ERROR] /health:`, err);
            }
          });
        }
      },
      // General API proxy, if your app uses other /api/... routes
      '/api': {
        target: 'http://localhost:3030', // Changed from 3000 to 3030
        secure: false,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            if (err.message.includes('ECONNREFUSED')) {
              console.warn(`[VITE PROXY WARN] API endpoint ${req.url} not reachable (ECONNREFUSED).`);
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Proxy error: API service unavailable.' }));
              }
            } else {
              console.error(`[VITE PROXY ERROR] ${req.url}:`, err);
            }
          });
        }
      }
    }
  }
});