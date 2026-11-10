import {createServer} from 'node:http';

// Preserve the familiar localhost:5173 link while Cloudflare uses port 5174.
createServer((request,response)=>{
  response.writeHead(307,{Location:`http://localhost:5174${request.url||'/'}`});
  response.end();
}).listen(5173,'127.0.0.1');
