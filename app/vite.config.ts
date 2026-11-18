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

        // 1. Responsive custom hero variants (/hero/<name>-1440.jpg, etc.)
        const customMatch = req.url.match(/\/hero\/([a-zA-Z0-9_-]+)-(1440|2560|3840)\.(jpg|jpeg|png|webp)/i)
        if (customMatch) {
          const baseName = customMatch[1]
          const width = customMatch[2]
          const ext = customMatch[3]
          const targetPath = path.resolve(__dirname, 'public/hero', `${baseName}-${width}.${ext}`)
          if (!fs.existsSync(targetPath)) {
            const heroDir = path.resolve(__dirname, 'public/hero')
            const masterPath = path.join(heroDir, `${baseName}.${ext}`)
            if (fs.existsSync(masterPath)) {
              const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
              if (!probe.error) {
                spawnSync(
                  'ffmpeg',
                  [
                    '-y',
                    '-loglevel', 'error',
                    '-i', masterPath,
                    '-vf', `scale='min(iw,${width})':-1:flags=lanczos+accurate_rnd,unsharp=3:3:0.5:3:3:0`,
                    '-q:v', '2',
                    targetPath,
                  ],
                  { stdio: 'ignore' }
                )
              }
            }
          }
        }

        // 2. Instagram cover upscale (/photos/:id/hero.jpg)
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
