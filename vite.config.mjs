import { defineConfig } from 'vite';

const apiPort = process.env.API_PORT || '3001';

export default defineConfig({
  plugins: [
    {
      name: 'clean-url-html-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/choose') req.url = '/choose.html';
          if (req.url === '/system') req.url = '/system.html';
          next();
        });
      }
    }
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        choose: 'choose.html',
        system: 'system.html'
      }
    }
  }
});
