import {Client,type Room} from '@colyseus/sdk';import assert from 'node:assert/strict';
const base=process.env.FOREST_TEST_URL;if(!base)throw Error('FOREST_TEST_URL required');
const rooms:Room[]=[];const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function attach(r:Room){rooms.push(r);r.onMessage('snapshot',()=>{});r.onMessage('notice',()=>{});r.onMessage('chat',()=>{});return r;}
let pass=false;
try{const c=new Client(base);const first=attach(await c.create('forest',{nickname:'Capacity 1'}));for(let i=2;i<=8;i++)attach(await new Client(base).joinById(first.roomId,{nickname:`Capacity ${i}`}));await assert.rejects(()=>new Client(base).joinById(first.roomId,{nickname:'Ninth'}));console.log('PASS: eight real clients join; ninth client rejected.');const solo=attach(await c.create('forest',{nickname:'Solo QA',solo:true}));attach(await new Client(base).joinById(solo.roomId,{nickname:'Invited friend'}));console.log('PASS: a solo-started room accepts an invited friend.');pass=true;}catch(e){console.error(e);}finally{await Promise.all(rooms.map(r=>Promise.race([r.leave(),delay(1000)]).catch(()=>{})));process.exit(pass?0:1);}
