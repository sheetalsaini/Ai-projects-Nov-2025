/** Network playthrough using only ordinary inputs and interactions. No teleport or admin endpoint. */
import {Client,type Room} from '@colyseus/sdk';
import assert from 'node:assert/strict';
import {CHAPTERS,requirements,type GameState,GROUND} from '../shared/world.js';
const base=process.env.FOREST_TEST_URL;if(!base)throw Error('FOREST_TEST_URL is required');
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const client=new Client(base);const room:Room=await client.create('forest',{nickname:'Trail QA',solo:true});
let state:GameState|undefined,seq=0;const start=Date.now();
room.onMessage('snapshot',(s:GameState)=>state=s);room.onMessage('chat',m=>{if(m.name==='Professor Pebble')console.log('Funny encounter:',m.text);});room.onMessage('notice',()=>{});room.onMessage('puzzle',()=>{});
function input(right=false,left=false,jump=false){room.send('input',{right,left,jump,hide:false,seq:++seq});}
async function until(fn:()=>boolean,ms=12000){const begin=Date.now();while(!fn()){if(Date.now()-begin>ms)throw Error(`Timed out, chapter ${state?.chapter}, x=${state?.players[room.sessionId]?.x}`);await delay(70);}}
async function driveTo(x:number){let lastJump=0,oldX=-1,stuck=0;const begin=Date.now();
 while(!state||Math.abs(state.players[room.sessionId].x-x)>48){
  if(Date.now()-begin>35000)throw Error(`Cannot reach ${x}, current ${state?.players[room.sessionId]?.x}`);
  if(!state){await delay(70);continue;}const p=state.players[room.sessionId],right=p.x<x;
  const root=[2,5].includes(state.chapter)&&[900,1500,2150,3400].some(v=>right&&v-p.x<150&&v-p.x>-20);
  if(Math.abs(p.x-oldX)<3)stuck++;else stuck=0;oldX=p.x;
  const jump=p.grounded&&(root||stuck>8)&&Date.now()-lastJump>650;
  if(jump)lastJump=Date.now();input(right,!right,jump);await delay(90);
 }
 input();await delay(180);
}
try{
 await until(()=>!!state);console.log('Live solo room:',room.roomId);
 for(let chapter=1;chapter<=5;chapter++){
  assert.equal(state!.chapter,chapter);console.log('Starting day',chapter);
  if([1,3,5].includes(chapter)){
   const need=requirements(chapter);
   for(const kind of ['wood','supply','crystal'] as const){
    const key=kind==='wood'?'wood':kind==='supply'?'supplies':'crystals';const count=need[key];
    while(state![key]<count){
     const p=state!.players[room.sessionId];const available=state!.resources.filter(r=>r.kind===kind&&!r.taken).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
     const r=available[0];if(!r)throw Error(`Insufficient ${kind}`);
     await driveTo(r.x);const before=state![key];room.send('interact');await until(()=>state![key]>before);
    }
   }
   await driveTo(CHAPTERS[chapter-1].buildX);room.send('interact');await until(()=>state!.built);
  }
  if(chapter===4){for(const x of [850,1700,2470]){await driveTo(x);room.send('interact');await delay(350);}await driveTo(3300);room.send('interact');await delay(350);for(const rune of [1,0,2]){room.send('rune',rune);await delay(650);}assert.equal(state!.puzzle,3);}
  await driveTo(CHAPTERS[chapter-1].goalX);await until(()=>state!.players[room.sessionId].grounded);room.send('interact');
  if(chapter<5){await until(()=>state!.campfire);room.send('campAnswer','trivia');await delay(1300);room.send('continue');await until(()=>state!.chapter===chapter+1);}
  else await until(()=>state!.finished);
  console.log('Completed day',chapter);
 }
 console.log('PASS: full live adventure, no admin actions. Seconds:',Math.round((Date.now()-start)/1000));
}catch(e){console.error('Live adventure failed:',e);}finally{input();await Promise.race([room.leave(),delay(1000)]);process.exit(state?.finished?0:1);}
