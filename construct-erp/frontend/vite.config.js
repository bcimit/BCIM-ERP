import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);

  const define = Object.entries(env).reduce((acc, [key, val]) => {
    acc[`process.env.${key}`] = JSON.stringify(val);
    return acc;
  }, {
    'process.env.NODE_ENV': JSON.stringify(mode),
  });

  return {
    plugins: [
      // Treat every .js in src/ as JSX (must be first)
      {
        name: 'treat-js-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.match(/\/src\/.*\.js$/)) return null;
          return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
        },
      },
      react({
        // Faster refresh — skip full reload for most changes
        fastRefresh: true,
      }),
    ],

    envPrefix: ['REACT_APP_', 'VITE_'],
    define,

    // Persist pre-bundle cache between restarts
    cacheDir: 'node_modules/.vite-cache',

    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['bcim.ddns.net'],
      strictPort: true,
      open: false,
      hmr: {
        host: 'bcim.ddns.net',
        port: 3000,
        clientPort: 3000,
      },
      // Pre-warm the files users hit first — dramatically cuts cold-start lag
      warmup: {
        clientFiles: [
          './src/App.js',
          './src/components/layout/Layout.jsx',
          './src/pages/auth/LoginPage.jsx',
          './src/pages/Dashboard.jsx',
          './src/pages/tqs/TQSBillsPage.jsx',
          './src/api/client.js',
          './src/store/authStore.js',
        ],
      },
      proxy: {
        '/api':       { target: 'http://localhost:5000', changeOrigin: true },
        '/uploads':   { target: 'http://localhost:5000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true },
      },
    },

    build: {
      outDir: 'build',
      sourcemap: false,
      // Use esbuild for minification — much faster than terser
      minify: 'esbuild',
      // Raise the chunk warning threshold (large pages are expected)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split into focused chunks so browser caches them independently
          manualChunks(id) {
            // Vendor: React core
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'vendor-react';
            }
            // Vendor: data/state
            if (id.includes('node_modules/@tanstack/') ||
                id.includes('node_modules/zustand/') ||
                id.includes('node_modules/axios/')) {
              return 'vendor-data';
            }
            // Vendor: charts (lazy loaded, separate chunk)
            if (id.includes('node_modules/recharts/') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory-')) {
              return 'vendor-charts';
            }
            // Vendor: icons (lucide is large — isolate it)
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            // Vendor: spreadsheet (xlsx is large — isolate it)
            if (id.includes('node_modules/xlsx/') ||
                id.includes('node_modules/exceljs/')) {
              return 'vendor-xlsx';
            }
            // Vendor: forms
            if (id.includes('node_modules/react-hook-form/') ||
                id.includes('node_modules/@hookform/') ||
                id.includes('node_modules/zod/')) {
              return 'vendor-forms';
            }
            // Vendor: UI utilities
            if (id.includes('node_modules/react-hot-toast/') ||
                id.includes('node_modules/clsx/') ||
                id.includes('node_modules/dayjs/')) {
              return 'vendor-ui';
            }
          },
        },
      },
    },

    optimizeDeps: {
      // Persist optimized deps — skip re-bundling on every cold start
      force: false,
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        // Use all CPU threads for faster dep pre-bundling
        logLevel: 'silent',
      },
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'lucide-react',
        'recharts',
        'react-hot-toast',
        'dayjs',
        'clsx',
        'react-hook-form',
        '@hookform/resolvers',
        'zod',
      ],
      // Never try to optimize these — they break or take too long
      exclude: ['tesseract.js'],
    },
  };
});
