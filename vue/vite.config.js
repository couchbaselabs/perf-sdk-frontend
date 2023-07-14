import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'unplugin-vue-components/resolvers'
import * as fs from 'fs'

// https://vitejs.dev/config/

const path = require("path");

export default defineConfig({
    server: {
        port: 8080,
	https: {
		key: fs.readFileSync('/etc/nginx/ca.key'),
		cert: fs.readFileSync('/etc/nginx/ca.crt'),
	}
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
