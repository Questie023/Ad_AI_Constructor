import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path'; // Import path module for resolving paths

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5174, // Default Vite port
  },
  // Explicitly set the root of the Vite project.
  // This tells Vite that the project's base directory (where it looks for index.html by default)
  // is the directory where vite.config.js itself resides (i.e., 'client/').
  root: path.resolve(__dirname),
  
  // Explicitly set the directory for static assets.
  // This tells Vite where to find files like index.html, images, etc., that are served directly.
  // It's relative to the 'root' directory.
  publicDir: path.resolve(__dirname, 'public'),

  build: {
    outDir: 'dist', // Standard output directory for the build
    emptyOutDir: true, // Clear the output directory before building
    // Vite will automatically find index.html in the publicDir relative to the root.
  },
});
