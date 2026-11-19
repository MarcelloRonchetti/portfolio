import path from "path"
import fs from "fs"
import { spawnSync } from "child_process"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function heroUpscalePlugin(): Plugin {
  return {
    name: 'hero-upscale',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) return next()
        // Instagram cover upscale (/photos/:id/hero.jpg)
        const match = req.url.match(/\/photos\/([^/?#]+)\/hero\.jpg/)
        if (match) {
          const eventId = match[1]
          const heroPath = path.resolve(__dirname, 'public/photos', eventId, 'hero.jpg')
          const coverPath = path.resolve(__dirname, 'public/photos', eventId, 'cover.jpg')

          if (!fs.existsSync(heroPath) && fs.existsSync(coverPath)) {
            const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
            if (!probe.error) {
              spawnSync(
                'ffmpeg',
                [
                  '-y',
                  '-loglevel', 'error',
                  '-i', coverPath,
                  '-vf', 'scale=iw*3:ih*3:flags=lanczos+accurate_rnd,unsharp=3:3:0.6:3:3:0',
                  '-q:v', '2',
                  heroPath,
                ],
                { stdio: 'ignore' }
              )
            }
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/portfolio/',
  plugins: [react(), heroUpscalePlugin()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
