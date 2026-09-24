import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/** Dónde corre el backend. La app lo pide en `/api` y Vite lo reenvía acá. */
declare const process: { env: Record<string, string | undefined> };
const BACKEND = process.env.AMI_BACKEND ?? 'http://localhost:3000';

/**
 * `npm run dev:telefono` sirve la app por https con un certificado autofirmado.
 * El reconocimiento de voz del teléfono solo funciona en https (salvo en
 * localhost), así que sin esto el micrófono no anda al abrirla por la IP.
 */
const HTTPS = process.env.AMI_HTTPS === '1';

export default defineConfig({
  plugins: HTTPS ? [react(), basicSsl()] : [react()],
  server: {
    port: 5173,
    // Acepta conexiones de otros equipos (el teléfono) y de túneles https,
    // que llegan con otro nombre de host.
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
