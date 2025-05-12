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
      // Disable type checking in dev mode if SKIP_TYPECHECKING is true
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
      },
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // Skip type checking if requested
  optimizeDeps: {
    esbuildOptions: {
      tsconfigRaw: skipTypeChecking ? 
        { compilerOptions: { jsx: 'react-jsx', skipLibCheck: true, strict: false } } : 
        undefined
    }
  },
  build: {
    // Skip type checking if requested
    reportCompressedSize: !skipTypeChecking,
    // Use special rollup options when skipping type checking
    rollupOptions: skipTypeChecking ? {
      onwarn(warning, warn) {
        // Skip certain warnings when bypassing type checking
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
    strictPort: false, // Allow fallback ports
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        secure: false,
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          let retryCount = 0

          // Handle proxy errors with retry logic
          const handleProxyError = (err: Error) => {
            console.error('Proxy error:', err.message)
            
            if (retryCount < MAX_RETRIES && err.message.includes('ECONNREFUSED')) {
              retryCount++
              console.log(`Retrying connection (${retryCount}/${MAX_RETRIES})...`)
              
              // Try next fallback port
              const currentPort = parseInt(proxy.options.target.split(':')[2])
              const nextPortIndex = WS_FALLBACK_PORTS.indexOf(currentPort) + 1
              
              if (nextPortIndex < WS_FALLBACK_PORTS.length) {
                const nextPort = WS_FALLBACK_PORTS[nextPortIndex]
                proxy.options.target = `http://localhost:${nextPort}`
                
                setTimeout(() => {
                  console.log(`Attempting connection on port ${nextPort}...`)
                  // Force proxy to try new target
                  proxy.web(proxy.req, proxy.res, proxy.options)
                }, RETRY_DELAY)
              }
            }
          }

          proxy.on('error', handleProxyError)
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url)
          })

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (proxyRes.statusCode === 200) {
              retryCount = 0 // Reset retry count on successful connection
            }
            console.log('Proxy response:', proxyRes.statusCode, req.url)
          })

          proxy.on('upgrade', (req, socket, head) => {
            console.log('WebSocket upgrade requested')
          })
        }
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          let retryCount = 0

          proxy.on('error', (err) => {
            if (retryCount < MAX_RETRIES && err.message.includes('ECONNREFUSED')) {
              retryCount++
              console.log(`API proxy retry (${retryCount}/${MAX_RETRIES})...`)
              
              setTimeout(() => {
                proxy.web(proxy.req, proxy.res, proxy.options)
              }, RETRY_DELAY)
            }
          })
        }
      },
      '/state': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          let retryCount = 0

          proxy.on('error', (err) => {
            if (retryCount < MAX_RETRIES && err.message.includes('ECONNREFUSED')) {
              retryCount++
              console.log(`State proxy retry (${retryCount}/${MAX_RETRIES})...`)
              
              setTimeout(() => {
                proxy.web(proxy.req, proxy.res, proxy.options)
              }, RETRY_DELAY)
            }
          })
        }
      }
    },
    hmr: {
      clientPort: 3001,
      timeout: 5000,
      protocol: 'ws',
    }
  }
})