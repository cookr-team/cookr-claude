import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Generate version.json content
    const buildTimestamp = new Date().toISOString();
    const versionContent = JSON.stringify({ version: '1.0.0', timestamp: buildTimestamp }, null, 2);
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, 'version.json'), versionContent);
    console.log(`[Vite Build/Dev] Generated public/version.json with timestamp: ${buildTimestamp}`);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''),
        'process.env.BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
          'react': path.resolve(process.cwd(), 'node_modules/react'),
          'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
        },
        dedupe: ['react', 'react-dom']
      },
      build: {
        target: 'esnext',
        minify: 'esbuild',
        cssMinify: true,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify') || id.includes('purify')) {
                  return 'vendor-pdf';
                }
                if (id.includes('recharts') || id.includes('d3-')) {
                  return 'vendor-charts';
                }
                if (id.includes('@supabase')) {
                  return 'vendor-supabase';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons';
                }
                if (id.includes('motion')) {
                  return 'vendor-motion';
                }
                return 'vendor-core';
              }
            }
          }
        }
      }
    };
});
