export const WORLD_WIDTH = 4400;
export const GROUND = 530;
export const SPEED = 250;
export const JUMP = -560;
export const GRAVITY = 1450;
export type Input = {left:boolean;right:boolean;jump:boolean;hide:boolean;seq:number};
export type Explorer = {id:string;name:string;color:number;x:number;y:number;vx:number;vy:number;grounded:boolean;hidden:boolean;connected:boolean;seq:number;reaction:string;reactionUntil:number};
export type Resource = {id:string;x:number;y:number;kind:'wood'|'crystal'|'supply';taken:boolean};
export type GameState = {code:string;chapter:number;phase:string;revision:number;players:Record<string,Explorer>;resources:Resource[];wood:number;crystals:number;supplies:number;built:boolean;symbols:number[];puzzle:number;creatureX:number;chaseTime:number;chaseStarted:boolean;elapsed:number;message:string;campfire:boolean;finished:boolean};
export const CHAPTERS = [
 {title:'Stranded',subtitle:'A shelter. A strange footprint. A very long way home.',objective:'Collect 6 wood and 2 supplies. Build the shelter, then inspect the footprints.',build:'Build shelter',goalX:3920,buildX:2450},
 {title:'The Chase',subtitle:'Those footprints were definitely not a good sign.',objective:'Run right. Jump over roots. Hide in glowing fern patches when Thornback gets close.',build:'',goalX:4100,buildX:0},
 {title:'The Lost Valley',subtitle:'Someone was here before you. They left in a hurry.',objective:'Collect 8 wood and 3 crystals. Repair the bridge and recover the field journal.',build:'Repair bridge',goalX:4020,buildX:2530},
 {title:'The Living Jungle',subtitle:'The forest is listening. Try saying something sensible.',objective:'Read the scattered stone clues. Activate the ruins in the right order.',build:'',goalX:4030,buildX:0},
 {title:'The Final Escape',subtitle:'One last leap of faith. Preferably with wings.',objective:'Collect 6 wood, 4 crystals and 2 supplies. Repair the glider, then reach the launch.',build:'Repair glider',goalX:4110,buildX:2950}
];
export const RUNES = ['Moon','Leaf','Sun'];
export const RUNE_ORDER=[1,0,2];
export type Platform={x:number;y:number;w:number;h:number};
export function platforms(chapter:number,elapsed=0,built=false):Platform[]{
 const p:Platform[]=[{x:0,y:GROUND,w:WORLD_WIDTH,h:90}];
 if(chapter===3){p.splice(0,1,{x:0,y:GROUND,w:2700,h:90},{x:3230,y:GROUND,w:1170,h:90}); if(built)p.push({x:2700,y:GROUND,w:530,h:30});}
 if(chapter===2||chapter===5){for(const x of [900,1500,2150,3400])p.push({x,y:GROUND-65,w:75,h:65});}
 if(chapter===1||chapter===3||chapter===4){p.push({x:700,y:440,w:200,h:25},{x:1170,y:365,w:200,h:25},{x:1660,y:440,w:200,h:25});}
 if(chapter===4){p.push({x:2250+Math.sin(elapsed)*70,y:430,w:200,h:25},{x:2650,y:350,w:200,h:25});}
 return p;
}
export const HIDE_ZONES=[{x:580,w:230},{x:1770,w:230},{x:2770,w:230},{x:3630,w:220}];
export function stepPlayer(p:Explorer,input:Input,dt:number,chapter:number,elapsed:number,built:boolean){
 p.hidden=input.hide&&p.grounded&&HIDE_ZONES.some(z=>p.x>z.x&&p.x<z.x+z.w);
 p.vx=p.hidden?0:((input.right?1:0)-(input.left?1:0))*SPEED;
 if(input.jump&&p.grounded&&!p.hidden){p.vy=JUMP;p.grounded=false;}
 const oldX=p.x;
 p.x=Math.max(24,Math.min(WORLD_WIDTH-24,p.x+p.vx*dt));
 for(const block of platforms(chapter,elapsed,built)){
  if(p.y>block.y+3&&p.y-58<block.y+block.h&&p.x+13>block.x&&p.x-13<block.x+block.w){
   if(oldX+13<=block.x&&p.vx>0)p.x=block.x-13;
   else if(oldX-13>=block.x+block.w&&p.vx<0)p.x=block.x+block.w+13;
  }
 }
 const oldY=p.y;p.vy+=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
 for(const floor of platforms(chapter,elapsed,built)){
  if(p.x+13>floor.x&&p.x-13<floor.x+floor.w&&oldY<=floor.y+2&&p.y>=floor.y&&p.vy>=0){p.y=floor.y;p.vy=0;p.grounded=true;}
 }
 if(p.y>800){p.x=chapter===3?2520:Math.max(100,p.x-150);p.y=GROUND;p.vy=0;}
 p.seq=input.seq;
}
export function makeResources(chapter:number):Resource[]{
 if(chapter===2||chapter===4)return [];
 const result:Resource[]=[];let i=0;
 for(const x of [340,600,850,1050,1320,1560,1800,2050,2300,2530])result.push({id:`${chapter}-w${i++}`,x,y:GROUND-25,kind:'wood',taken:false});
 for(const [j,x] of [650,1100,1630,2100,2490].entries())result.push({id:`${chapter}-c${j}`,x,y:GROUND-25,kind:'crystal',taken:false});
 for(const [j,x] of [460,1250,2210].entries())result.push({id:`${chapter}-s${j}`,x,y:GROUND-25,kind:'supply',taken:false});
 return result;
}
export function createState(code:string):GameState{return {code,chapter:1,phase:'adventure',revision:0,players:{},resources:makeResources(1),wood:0,crystals:0,supplies:0,built:false,symbols:[],puzzle:0,creatureX:-450,chaseTime:0,chaseStarted:false,elapsed:0,message:'Welcome to the forest. Stay curious. Stay together.',campfire:false,finished:false};}
export function requirements(chapter:number){return chapter===1?{wood:6,crystals:0,supplies:2}:chapter===3?{wood:8,crystals:3,supplies:0}:{wood:6,crystals:4,supplies:2};}
