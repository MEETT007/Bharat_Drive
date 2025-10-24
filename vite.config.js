import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vite expects the main file to be a standard index.html
  // and will find the component in the src folder if structured that way,
  // but since we have a single component, this standard config should suffice.
  // It will look for the entry point linked in index.html.
  build: {
    outDir: 'dist',
  }
});
