import {randomBytes} from 'node:crypto';import type {GameState} from '../shared/world.js';
const tickets=new Map<string,{game:GameState;expires:number}>();
export function issueResume(game:GameState){const id=randomBytes(24).toString('hex');tickets.set(id,{game,expires:Date.now()+10000});return id;}
export function consumeResume(ticket:unknown){if(typeof ticket!=='string')return null;const item=tickets.get(ticket);tickets.delete(ticket);if(!item||item.expires<Date.now())return null;return item.game;}
