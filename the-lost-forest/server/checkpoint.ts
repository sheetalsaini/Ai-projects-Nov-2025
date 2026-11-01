import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import pg from 'pg';
import type {GameState} from '../shared/world.js';
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,max:3}):undefined;
let ready:Promise<unknown>|undefined;
const pending=new Map<string,string>();let flushing=false;
export let persistenceHealthy=!pool;
async function initialize(){if(!pool)return;ready ||=pool.query('CREATE TABLE IF NOT EXISTS forest_checkpoints (code TEXT PRIMARY KEY, snapshot JSONB NOT NULL, saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');await ready;}
export async function saveCheckpoint(game:GameState){
 const snapshot=JSON.stringify({...game,players:{}});pending.set(game.code,snapshot);if(flushing)return;flushing=true;
 try{await initialize();while(pending.size){const [code,data]=pending.entries().next().value!;pending.delete(code);
  if(pool){await pool.query('INSERT INTO forest_checkpoints(code,snapshot,saved_at) VALUES($1,$2,NOW()) ON CONFLICT(code) DO UPDATE SET snapshot=EXCLUDED.snapshot,saved_at=NOW()',[code,data]);}
  else{await mkdir('runtime',{recursive:true});const path=`runtime/${code}.json`;await writeFile(path+'.tmp',data);await rename(path+'.tmp',path);}
 }persistenceHealthy=true;}catch(e){persistenceHealthy=false;console.error('Room checkpoint failed:',e instanceof Error?e.message:'unknown error');throw e;}finally{flushing=false;}
}
export async function loadCheckpoint(code:string):Promise<GameState|null>{
 if(!/^[A-F0-9]{6}$/.test(code))return null;
 if(pool){await initialize();const r=await pool.query('SELECT snapshot FROM forest_checkpoints WHERE code=$1 AND saved_at > NOW() - INTERVAL \'24 hours\'',[code]);return r.rows[0]?.snapshot??null;}
 try{return JSON.parse(await readFile(`runtime/${code}.json`,'utf8'));}catch{return null;}
}
export async function cleanupCheckpoints(){if(pool){await initialize();await pool.query("DELETE FROM forest_checkpoints WHERE saved_at < NOW() - INTERVAL '24 hours'");}}
