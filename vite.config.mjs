import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{chunkSizeWarningLimit:750,rollupOptions:{output:{manualChunks:{vendor:['react','react-dom','react-router-dom'],icons:['lucide-react']}}}}});
