import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'unplugin-vue-components/resolvers'
import * as fs from 'fs'
import * as path from 'path'

// https://vitejs.dev/config/


let https = undefined
if (fs.existsSync('/etc/nginx/ca.key')) {
    console.info("Found key, assuming prod and enabling https")
    https = {
        key: fs.readFileSync('/etc/nginx/ca.key'),
        cert: fs.readFileSync('/etc/nginx/ca.crt'),
    }
}
else {
    console.info("Did not find key, assuming local dev and not enabling https")
}

export default defineConfig({
    server: {
        port: 8080,
        https,
        hmr: {
            // Use 443 only when running with HTTPS (prod-like). Otherwise use local dev port.
            clientPort: https ? 443 : 8080
        },
        // Dev-only proxy so relative API calls like /dashboard/* work locally
        // to the Nest backend running on :3002
        proxy: {
            '/dashboard': {
                target: 'http://localhost:3002',
                changeOrigin: true,
                // Keep the /dashboard prefix for Nest routes
                rewrite: (p) => p
            }
        }
    },
    plugins: [
        vue(),
        Components({
            resolvers: [BootstrapVueNextResolver()]
        })
    ],
    base: '/results/',
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
