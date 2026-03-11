import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'

const SERVER_ONLY_PACKAGES = ['@prisma/client', '@prisma/adapter-pg', 'pg']

/**
 * Prevents server-only code from being executed in the browser during dev.
 *
 * Two mechanisms:
 * 1. Stubs server-only npm packages (@prisma/client, etc.) on the client
 * 2. Stubs .server.ts helper files that lack createServerFn (e.g. db.server.ts)
 *    — TanStack Start only transforms files WITH createServerFn into RPC stubs
 */
function serverOnlyPackages(): Plugin {
  const pkgs = new Set(SERVER_ONLY_PACKAGES)
  return {
    name: 'server-only-packages',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (!options?.ssr && pkgs.has(source)) {
        return { id: '\0server-only-stub', moduleSideEffects: false }
      }
    },
    load(id) {
      if (id === '\0server-only-stub') {
        return 'const s = new Proxy({}, { get: (_, p) => p === Symbol.toPrimitive ? () => "" : s }); export default s;'
      }
    },
    transform(code, id, options) {
      if (
        !options?.ssr &&
        id.endsWith('.server.ts') &&
        !code.includes('createServerFn')
      ) {
        // Extract named export identifiers so the stub satisfies import bindings
        const names = new Set<string>()
        for (const m of code.matchAll(
          /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/g,
        )) {
          names.add(m[1])
        }
        for (const m of code.matchAll(/export\s*\{([^}]+)\}/g)) {
          if (/export\s+type\s*\{/.test(m[0])) continue
          for (const n of m[1].split(',')) {
            const name = n
              .trim()
              .split(/\s+as\s+/)
              .pop()
              ?.trim()
            if (name) names.add(name)
          }
        }
        const hasDefault = /export\s+default\b/.test(code)
        const stub =
          'const s = new Proxy({}, { get: (_, p) => p === Symbol.toPrimitive ? () => "" : s });'
        const named = names.size
          ? `export { ${[...names].map((n) => `s as ${n}`).join(', ')} };`
          : ''
        const def = hasDefault ? 'export default s;' : ''
        return { code: `${stub}\n${named}\n${def}`, map: null }
      }
    },
  }
}

const config = defineConfig({
  plugins: [
    serverOnlyPackages(),
    devtools(),
    nitro({
      config: {
        routeRules: {
          '/**': {
            headers: {
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'DENY',
              'Referrer-Policy': 'strict-origin-when-cross-origin',
              'X-XSS-Protection': '0',
              'Content-Security-Policy':
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
              'Strict-Transport-Security':
                'max-age=31536000; includeSubDomains',
              'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            },
          },
          '/_build/**': {
            headers: {
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          },
        },
      },
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
          router: ['@tanstack/react-router', '@tanstack/react-start'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: SERVER_ONLY_PACKAGES,
  },
  ssr: {
    external: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  },
})

export default config
