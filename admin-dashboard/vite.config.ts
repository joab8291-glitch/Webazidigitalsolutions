import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin app is served through the main Webazi domain at /admin.
export default defineConfig({ base: '/admin/', plugins: [react()] });
