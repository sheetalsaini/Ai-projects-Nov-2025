import express from 'express';
import {createServer} from 'node:http';
import {Server,matchMaker} from 'colyseus';
import {loadCheckpoint,cleanupCheckpoints,persistenceHealthy} from './checkpoint.js';
import {issueResume} from './resume.js';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {ForestRoom} from './ForestRoom.js';
const app=express();
app.disable('x-powered-by');
const rates=new Map<string,{n:number;t:number}>();
app.use((req,res,next)=>{
 const origin=req.headers.origin;
 const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean);
 if(origin&&(!allowed.length||allowed.includes(origin))){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.sendStatus(204);return;}
 if(req.path.startsWith('/matchmake')){const ip=req.ip||'unknown',now=Date.now();let r=rates.get(ip);if(!r||now-r.t>60000){r={n:0,t:now};rates.set(ip,r);}if(++r.n>60){res.status(429).json({error:'Please wait before joining again.'});return;}}
 next();
});
setInterval(()=>{for(const[k,v]of rates)if(Date.now()-v.t>120000)rates.delete(k);},60000).unref();
app.get('/api/health',(_req,res)=>res.json({ok:true,game:'THE LOST FOREST',version:'0.1.0',durableCheckpoints:!!process.env.DATABASE_URL,persistenceHealthy}));
const restoring=new Map<string,Promise<string|null>>();
app.post('/api/rooms/:code/resolve',async(req,res)=>{
 const code=String(req.params.code).replace(/\s+/g,'').toUpperCase();
 res.setHeader('Cache-Control','no-store');
 if(!/^[A-F0-9]{6}$/.test(code)){res.status(400).json({code:'INVALID_ROOM_CODE',message:'Enter the six-character code shown in the host’s game.'});return;}
 try{
  const active=await matchMaker.getRoomById(code);
  if(active){
   if(active.clients>=active.maxClients){res.status(409).json({code:'ROOM_FULL',message:'All 8 places are occupied or reserved for reconnecting explorers. Try again shortly.'});return;}
   res.json({roomId:active.roomId,capacity:active.maxClients,players:active.clients});return;
  }
  let task=restoring.get(code);
  if(!task){task=(async()=>{const game=await loadCheckpoint(code);if(!game||game.finished)return null;const result=await matchMaker.createRoom('forest',{resumeTicket:issueResume(game)});return result.roomId;})();restoring.set(code,task);task.finally(()=>restoring.delete(code)).catch(()=>{});}
  const roomId=await task;
  if(!roomId){res.status(404).json({code:'ROOM_NOT_FOUND',message:'That room has ended or its code is no longer active. Ask the host for the current room code.'});return;}
  res.json({roomId,capacity:8});
 }catch(e){console.error('Room resolution failed:',e instanceof Error?e.message:'unknown error');res.status(503).json({code:'SERVER_UNAVAILABLE',message:'The forest server is temporarily unavailable. Wait a moment and try again.'});}
});
setInterval(()=>{void cleanupCheckpoints().catch(()=>{});},3600000).unref();
app.use(express.static('dist'));
app.get('/',(_req,res)=>res.sendFile('index.html',{root:'dist'}));
const http=createServer(app);
const server=new Server({transport:new WebSocketTransport({server:http,maxPayload:4096}),greet:false});
server.define('forest',ForestRoom);
const portArg=process.argv.indexOf('--port');
const port=Number(process.env.PORT||(portArg>=0?process.argv[portArg+1]:2567));
await server.listen(port,'0.0.0.0');console.log(`Forest server listening on ${port}`);
