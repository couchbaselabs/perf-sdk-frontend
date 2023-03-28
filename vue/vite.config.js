import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/

const path = require("path");

export default defineConfig({
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