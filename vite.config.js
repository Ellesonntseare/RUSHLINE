import {defineConfig} from 'vite';
import {attachRaceServer} from './server/race.js';
export default defineConfig({
  server:{allowedHosts:['rush.teamtrader.co.za','.trycloudflare.com'],watch:{ignored:['**/.asset-work/**','**/source-assets/**']}},
  plugins:[{name:'rushline-rooms',configureServer(server){
    server.middlewares.use((req,res,next)=>{
      if(/^\/assets\/.*\.bin(?:\?|$)/.test(req.url||''))res.setHeader('Cache-Control','public, max-age=86400');
      next();
    });
    attachRaceServer(server.httpServer);
  },configurePreviewServer(server){attachRaceServer(server.httpServer);}}]
});
