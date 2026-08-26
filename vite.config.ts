import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js only loads on the landing route, so the advisory about the
    // FestivalScene chunk is expected rather than something to chase.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Vendor code changes on a different cadence than app code; splitting
        // it keeps the long-lived chunks cacheable across deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('three')) return undefined; // stays in the lazy scene chunk
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('@phosphor-icons')) return 'icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
