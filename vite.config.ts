import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const SUPABASE_URL_FALLBACK = 'https://nubzdqiyokpbwyjdmzxs.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51YnpkcWl5b2twYnd5amRtenhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzgyOTYsImV4cCI6MjEwODM1NDI5Nn0.ZORtFF3TY-8SjIufXPhw71PJEbfGqJATkINZLgvW9Ak';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || SUPABASE_URL_FALLBACK;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});
