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
        https
    },
    plugins: [
        vue(),
        Components({
            resolvers: [BootstrapVueNextResolver()]
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
