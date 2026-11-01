import test from 'node:test';import assert from 'node:assert/strict';
import {ForestRoom} from '../server/ForestRoom.js';import {createState,GROUND,stepPlayer,CHAPTERS,makeResources} from '../shared/world.js';
function fixture(){const r=new ForestRoom();r.game=createState('ABC123');(r as any).broadcast=()=>{};const c={sessionId:'one',send:()=>{}} as any;r.onJoin(c,{nickname:'Explorer'});return {r,c,p:r.game.players.one};}
test('jump physics, landings and river recovery',()=>{const{p}=fixture();stepPlayer(p,{left:false,right:true,jump:true,hide:false,seq:1},1/30,1,0,false);assert.ok(p.y<GROUND);for(let i=0;i<100;i++)stepPlayer(p,{left:false,right:false,jump:false,hide:false,seq:i+2},1/30,1,0,false);assert.equal(p.y,GROUND);assert.ok(p.grounded);p.x=2900;p.y=810;stepPlayer(p,{left:false,right:false,jump:false,hide:false,seq:103},.1,3,0,false);assert.equal(p.x,2520);});
test('construction validates range, resources and prevents duplicate spend',()=>{const{r,c,p}=fixture();r.game.wood=6;r.game.supplies=2;r.interact(c);assert.equal(r.game.built,false);p.x=2450;r.interact(c);assert.equal(r.game.built,true);assert.equal(r.game.wood,0);r.game.resources=[];r.interact(c);assert.equal(r.game.wood,0);});
test('five chapter logic including campfire, incorrect puzzle retry and collective ending',()=>{const{r,c,p}=fixture();
 for(let ch=1;ch<=5;ch++){
  assert.equal(r.game.chapter,ch);r.game.resources=makeResources(ch);
  if([1,3,5].includes(ch)){r.game.wood=20;r.game.crystals=20;r.game.supplies=20;p.x=CHAPTERS[ch-1].buildX;r.interact(c);assert.equal(r.game.built,true);}
  if(ch===2){p.x=700;r.tick(.1);assert.ok(r.game.chaseStarted);assert.ok(r.game.creatureX>-450);}
  if(ch===4){p.x=3300;r.rune(c,0);assert.equal(r.game.puzzle,0);for(const rune of [1,0,2])r.rune(c,rune);assert.equal(r.game.puzzle,3);}
  p.x=CHAPTERS[ch-1].goalX;r.interact(c);
  if(ch<5){assert.equal(r.game.campfire,true);r.nextChapter(c);assert.equal(r.game.campfire,false);}else assert.equal(r.game.finished,true);
 }
});
test('connected explorers must reach exit together, disconnected explorer does not block',()=>{const{r,c,p}=fixture();const c2={sessionId:'two',send:()=>{}} as any;r.onJoin(c2,{nickname:'Friend'});r.game.built=true;p.x=3920;r.game.players.two.x=100;r.interact(c);assert.equal(r.game.campfire,false);r.game.players.two.connected=false;r.interact(c);assert.equal(r.game.campfire,true);});
test('hiding requires a fern patch and incorrect rune does not consume inventory',()=>{const{p,r,c}=fixture();p.x=650;stepPlayer(p,{left:false,right:false,jump:false,hide:true,seq:1},1/30,2,0,false);assert.equal(p.hidden,true);p.x=100;stepPlayer(p,{left:false,right:false,jump:false,hide:true,seq:2},1/30,2,0,false);assert.equal(p.hidden,false);r.game.chapter=4;p.x=3300;r.game.crystals=5;r.rune(c,2);assert.equal(r.game.crystals,5);});

test('unfinished construction does not block collecting its nearby required crystal',()=>{const{r,c,p}=fixture();r.game.chapter=3;r.game.resources=makeResources(3);r.game.wood=8;r.game.crystals=2;p.x=2490;r.interact(c);assert.equal(r.game.crystals,3);assert.equal(r.game.built,false);p.x=2530;r.interact(c);assert.equal(r.game.built,true);});

test('final chapter gathering is safe until the glider is repaired',()=>{const{r,p}=fixture();r.game.chapter=5;p.x=3100;r.tick(.1);assert.equal(r.game.chaseStarted,false);r.game.built=true;r.tick(.1);assert.equal(r.game.chaseStarted,true);assert.ok(r.game.creatureX>2700);});
