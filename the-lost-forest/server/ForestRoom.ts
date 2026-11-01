import {Room, Client} from 'colyseus';
import {randomBytes} from 'node:crypto';
import {createState,stepPlayer,CHAPTERS,GROUND,makeResources,requirements,RUNE_ORDER,RUNES,type Input,type GameState} from '../shared/world.js';
import {saveCheckpoint} from './checkpoint.js';
import {consumeResume} from './resume.js';
export class ForestRoom extends Room {
 maxClients=8;
 game!:GameState;
 inputs=new Map<string,Input>();
 lastAction=new Map<string,number>();
 lastChat=new Map<string,number>();
 lastInputAt=new Map<string,number>();
 async onCreate(options:any){
  this.roomId=randomBytes(4).toString('hex').slice(0,6).toUpperCase();
  this.maxClients=options.solo===true?1:8;
  const resumed=consumeResume(options.resumeTicket);
  this.game=resumed||createState(this.roomId);
  if(resumed){this.roomId=resumed.code;this.game.players={};this.game.campfire=false;this.game.phase='adventure';this.game.chaseStarted=false;this.game.chaseTime=0;this.game.creatureX=-450;}
  this.onMessage('input',(c,m)=>{
   if(!m||!Number.isSafeInteger(m.seq)||m.seq<0)return;
   const old=this.inputs.get(c.sessionId);if(old&&m.seq<=old.seq)return;
   this.lastInputAt.set(c.sessionId,Date.now());
   this.inputs.set(c.sessionId,{left:m.left===true,right:m.right===true,jump:m.jump===true,hide:m.hide===true,seq:m.seq});
  });
  this.onMessage('interact',(c)=>{if(this.cooldown(c,250))this.interact(c);});
  this.onMessage('rune',(c,m)=>{if(this.cooldown(c,500)&&Number.isInteger(m)&&m>=0&&m<3)this.rune(c,m);});
  this.onMessage('continue',(c)=>{if(this.cooldown(c,1000))this.nextChapter(c);});
  this.onMessage('chat',(c,m)=>{
   const now=Date.now();if(now-(this.lastChat.get(c.sessionId)||0)<1200||typeof m!=='string')return;
   this.lastChat.set(c.sessionId,now);const text=m.trim().replace(/[\u0000-\u001f]/g,'').slice(0,160);
   if(text)this.broadcast('chat',{name:this.game.players[c.sessionId]?.name||'Explorer',text});
  });
  this.onMessage('reaction',(c,m)=>{const p=this.game.players[c.sessionId];if(p&&['👋','😂','💚','❗','🔥','🦕'].includes(m)&&this.cooldown(c,500)){p.reaction=m;p.reactionUntil=Date.now()+2500;}});
  this.onMessage('campAnswer',(c,m)=>{if(this.game.campfire&&typeof m==='string'&&this.cooldown(c,1000))this.broadcast('chat',{name:'Professor Pebble',text:m==='trivia'?'Correct answer: a group of flamingos is a flamboyance. Humans should try that.':'I have recorded your answer. The trees are politely confused.'});});
  let ticks=0;
  this.setSimulationInterval((ms)=>{this.tick(Math.min(ms/1000,0.066));if(++ticks%2===0)this.broadcast('snapshot',this.game);},1000/30);
  this.setPatchRate(null);
  this.clock.setInterval(()=>{void saveCheckpoint(this.game).catch(()=>{});},10000);
 }
 cooldown(c:Client,ms:number){const n=Date.now();if(n-(this.lastAction.get(c.sessionId)||0)<ms)return false;this.lastAction.set(c.sessionId,n);return true;}
 onJoin(c:Client,options:any){
  const name=(typeof options?.nickname==='string'?options.nickname:'Explorer').trim().replace(/[\u0000-\u001f]/g,'').slice(0,18)||'Explorer';
  const colors=[0xf4c36a,0x7cdbbe,0xf39ab5,0x93baff,0xc6a5ff,0xffa06b,0xd9e978,0x87e4ed];
  const first=Object.values(this.game.players).find(p=>p.connected);
  this.game.players[c.sessionId]={id:c.sessionId,name,color:colors[Object.keys(this.game.players).length%8],x:first?Math.max(70,Math.min(first.x-35,4200)):150,y:GROUND,vx:0,vy:0,grounded:true,hidden:false,connected:true,seq:0,reaction:'👋',reactionUntil:Date.now()+2500};
  c.send('snapshot',this.game);
  this.broadcast('chat',{name:'Forest',text:`${name} found the group.`});
 }
 async onDrop(c:Client){const p=this.game.players[c.sessionId];if(p)p.connected=false;this.inputs.delete(c.sessionId);try{await this.allowReconnection(c,120);}catch{delete this.game.players[c.sessionId];}}
 onReconnect(c:Client){const p=this.game.players[c.sessionId];if(p)p.connected=true;c.send('snapshot',this.game);}
 onLeave(c:Client){delete this.game.players[c.sessionId];this.inputs.delete(c.sessionId);this.lastAction.delete(c.sessionId);this.lastChat.delete(c.sessionId);}
 async onDispose(){await saveCheckpoint(this.game).catch(()=>{});}
 say(text:string){this.game.message=text;this.broadcast('notice',text);}
 tick(dt:number){
  const g=this.game;if(g.finished)return;g.elapsed+=dt;
  for(const p of Object.values(g.players)){
   if(!p.connected)continue;
   const input=(Date.now()-(this.lastInputAt.get(p.id)||0)<1000?this.inputs.get(p.id):undefined)||{left:false,right:false,jump:false,hide:false,seq:p.seq};
   if(!g.campfire)stepPlayer(p,input,dt,g.chapter,g.elapsed,g.built);
   if(input.jump)input.jump=false;
  }
  if((g.chapter===2||g.chapter===5)&&!g.campfire){
   const ps=Object.values(g.players).filter(p=>p.connected);
   if(!g.chaseStarted&&ps.some(p=>p.x>400)){g.chaseStarted=true;this.say('Thornback is coming! Keep moving. Ferns are hiding places.');}
   if(g.chaseStarted){g.chaseTime+=dt;g.creatureX=-300+g.chaseTime*(g.chapter===2?155:130);
    for(const p of ps)if(!p.hidden&&Math.abs(p.x-g.creatureX)<65){p.x=Math.min(3950,p.x+420);p.y=250;p.vy=-220;this.say(`${p.name} took the express mudslide. Everyone is safe!`);}
    if(g.creatureX>4300){g.creatureX=-500;g.chaseTime=-6;this.say('Thornback got distracted by its own reflection. Keep going!');}
   }
  }
  g.revision++;
 }
 interact(c:Client){
  const g=this.game,p=g.players[c.sessionId];if(!p||g.finished||g.campfire)return;
  const chapter=CHAPTERS[g.chapter-1];
  const atBuild=!!chapter.build&&Math.abs(p.x-chapter.buildX)<130&&!g.built;
  const cost=requirements(g.chapter);
  const canBuild=g.wood>=cost.wood&&g.crystals>=cost.crystals&&g.supplies>=cost.supplies;
  const resource=!(atBuild&&canBuild)&&g.resources.filter(r=>!r.taken&&Math.hypot(p.x-r.x,p.y-r.y)<100).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  if(resource){resource.taken=true;if(resource.kind==='wood')g.wood++;if(resource.kind==='crystal')g.crystals++;if(resource.kind==='supply')g.supplies++;this.say(`Shared pack: +1 ${resource.kind}.`);return;}
  if(chapter.build&&Math.abs(p.x-chapter.buildX)<130&&!g.built){
   const req=requirements(g.chapter);
   if(g.wood<req.wood||g.crystals<req.crystals||g.supplies<req.supplies){this.say(`Need ${req.wood} wood, ${req.crystals} crystals, ${req.supplies} supplies in the shared pack.`);return;}
   g.wood-=req.wood;g.crystals-=req.crystals;g.supplies-=req.supplies;g.built=true;this.say(g.chapter===1?'Shelter built! Follow the trail to the giant footprints.':g.chapter===3?'Bridge repaired. Cross together and recover the journal.':'Glider repaired! Reach the launch platform.');void saveCheckpoint(g).catch(()=>{});return;
  }
  if(g.chapter===4){
   const clue=[{x:850,i:0},{x:1700,i:1},{x:2470,i:2}].find(z=>Math.abs(p.x-z.x)<120);
   if(clue){if(!g.symbols.includes(clue.i))g.symbols.push(clue.i);this.say(['First, the leaf drinks the rain.','Then, the moon watches the roots.','Last, the sun wakes the beacon.'][clue.i]);return;}
   if(Math.abs(p.x-3300)<180){c.send('puzzle',true);return;}
  }
  if(Math.abs(p.x-chapter.goalX)<150){
   if([1,3,5].includes(g.chapter)&&!g.built){this.say('Finish the shared construction first.');return;}
   if(g.chapter===4&&g.puzzle<3){this.say('The beacon still needs its three symbols.');return;}
   const others=Object.values(g.players).filter(v=>v.connected&&v.x<chapter.goalX-650);
   if(others.length){this.say('The group is still on the trail. Everyone escapes together.');return;}
   if(g.chapter===5){g.finished=true;this.say('You made it. Every explorer. One way home.');void saveCheckpoint(g).catch(()=>{});return;}
   g.campfire=true;g.phase='campfire';this.say('Safe at last. Professor Pebble has a very important, very silly question.');void saveCheckpoint(g).catch(()=>{});return;
  }
  this.say('Move near a glowing resource, construction marker, clue, or exit, then interact.');
 }
 rune(c:Client,r:number){const g=this.game,p=g.players[c.sessionId];if(!p||g.chapter!==4||Math.abs(p.x-3300)>200||g.puzzle>=3)return;
  if(r===RUNE_ORDER[g.puzzle]){g.puzzle++;this.say(`${RUNES[r]} awakened. ${g.puzzle===3?'The beacon is restored! Follow the golden trail.': 'The ruins hum in agreement.'}`);}else{g.puzzle=0;this.say('The ruins sneezed glitter. Try Leaf, Moon, Sun. Nothing lost!');}void saveCheckpoint(g).catch(()=>{});
 }
 nextChapter(c:Client){const g=this.game;if(!g.campfire||!g.players[c.sessionId])return;g.chapter++;g.phase='adventure';g.campfire=false;g.built=false;g.resources=makeResources(g.chapter);g.puzzle=0;g.creatureX=-450;g.chaseTime=0;g.chaseStarted=false;g.elapsed=0;
  for(const p of Object.values(g.players)){p.x=150;p.y=GROUND;p.vy=0;}
  this.inputs.clear();this.say(`Day ${g.chapter}: ${CHAPTERS[g.chapter-1].title}`);void saveCheckpoint(g).catch(()=>{});
 }
}
