import {defineConfig} from 'vite';
export default defineConfig({server:{allowedHosts:true,proxy:{'/api':'http://127.0.0.1:2567','/matchmake':'http://127.0.0.1:2567','/ws':{target:'ws://127.0.0.1:2567',ws:true}}},build:{chunkSizeWarningLimit:1600}});
