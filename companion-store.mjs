import {defaults,sanitize,clone,migrateLegacy,reconcile} from './companion-core.mjs?v=20260922a';
export const STORE_KEY='rdo_companion_v5';
const BACKUP_KEY=STORE_KEY+'_previous', RECORD='companion-v5';
const LEGACY=['rdo_manager_v3','rdo_manager_v2','rdo_manager_v1','rdo_moonshine_buyers_v4','rdo_legendary_collection_v1','rdo_legendary_advisor_v2','rdo_legendary_advisor_v1','rdo_nat_mountain_grassland_v1'];
const COOKIES={rdo_manager_v3:'rdo_b_main',rdo_moonshine_buyers_v4:'rdo_b_buy',rdo_legendary_collection_v1:'rdo_b_leg',rdo_legendary_advisor_v2:'rdo_b_adv',rdo_nat_mountain_grassland_v1:'rdo_b_nat'};
const parse=x=>{try{return JSON.parse(x)}catch{return null}};
function envelope(raw){const e=typeof raw==='string'?parse(raw):raw;if(!e||e.schema!==5||!Number.isSafeInteger(e.revision)||e.revision<0||!Number.isFinite(e.modifiedAt)||!e.data)return null;try{return {...e,data:sanitize(e.data)}}catch{return null}}
function localGet(k){try{return localStorage.getItem(k)}catch{return null}}
function cookieGet(k){try{const c=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(k+'='));return c?parse(decodeURIComponent(c.slice(k.length+1))):null}catch{return null}}
function openDB(){return new Promise(resolve=>{
 let done=false;const finish=db=>{if(done){db?.close();return}done=true;clearTimeout(timer);resolve(db)};
 const timer=setTimeout(()=>finish(null),2500);
 try{const req=indexedDB.open('rdo-money-manager-state',1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('state'))req.result.createObjectStore('state',{keyPath:'key'})};
 req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();finish(req.result)};req.onerror=()=>finish(null);req.onblocked=()=>finish(null);
 }catch{finish(null)}
})}
function dbReadAll(db){return new Promise(resolve=>{if(!db)return resolve([]);let finished=false;const finish=v=>{if(finished)return;finished=true;clearTimeout(timeout);resolve(v)};const timeout=setTimeout(()=>finish([]),2000);try{const req=db.transaction('state','readonly').objectStore('state').getAll();req.onsuccess=()=>finish(req.result||[]);req.onerror=()=>finish([])}catch{finish([])}})}
function dbWrite(db,e){return new Promise(resolve=>{if(!db)return resolve(false);try{
 const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get(RECORD);
 r.onsuccess=()=>{const old=envelope(r.result?.value);if(!old||old.revision<=e.revision)store.put({key:RECORD,value:JSON.stringify(e),ts:e.modifiedAt})};
 tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
 }catch{resolve(false)}})}
export class TrackerStore extends EventTarget {
 constructor(){super();this.state={schema:5,revision:0,modifiedAt:0,data:defaults()};this.db=null;this.ready=false;this.undoStack=[];this.status='Loading saved progress…';this.loadedFrom='';this.memoryOnly=false;}
 get data(){return this.state.data}
 signal(){this.dispatchEvent(new Event('change'))}
 async init(){
  // Read every supported persistent source BEFORE creating or saving defaults.
  // Do not monkey-patch Storage, write cookies, or rewrite the URL each second.
  this.db=await openDB();const records=await dbReadAll(this.db);
  const candidates=[envelope(localGet(STORE_KEY)),envelope(localGet(BACKUP_KEY)),envelope(records.find(r=>r.key===RECORD)?.value)].filter(Boolean).sort((a,b)=>b.revision-a.revision);
  if(candidates.length){this.state=candidates[0];this.loadedFrom='Saved progress restored';this.status='Progress restored on this device';}
  else {
   const metadata=parse(localGet('_rdo_persist_meta_v1'))||{};let found=false;
   const legacy={};
   for(const key of LEGACY){
    const options=[];const val=localGet(key);if(val&&parse(val))options.push({data:parse(val),ts:Number(metadata[key]||0),priority:2});
    const cookie=cookieGet(COOKIES[key]);if(cookie&&parse(cookie.data))options.push({data:parse(cookie.data),ts:Number(cookie.ts||0),priority:1});
    for(const row of records.filter(r=>r.key===key)){const value=parse(row.value);if(value)options.push({data:value,ts:Number(row.ts||0),priority:0})}
    if(key==='rdo_manager_v3'&&location.hash.startsWith('#rdo=')){try{const h=parse(decodeURIComponent(location.hash.slice(5)));if(h&&parse(h.data))options.push({data:parse(h.data),ts:Number(h.ts||0),priority:1})}catch{}}
    options.sort((a,b)=>b.ts-a.ts||b.priority-a.priority);if(options.length){legacy[key]=options[0].data;found=true;}
   }
   if(found){this.state.data=migrateLegacy(k=>legacy[k]);this.loadedFrom='Imported your older tracker data';this.status='Older progress imported; saving…';}
   else{this.loadedFrom='New tracker';this.status='Ready · no changes saved yet';}
   this.ready=true;
   if(found)this.commit('Imported existing progress',()=>{});
  }
  this.ready=true;
  this.refreshDerived();
  const probe=STORE_KEY+'_probe';let writable=false;try{localStorage.setItem(probe,'ok');writable=localStorage.getItem(probe)==='ok';localStorage.removeItem(probe)}catch{}
  if(!writable&&!this.db){this.memoryOnly=true;this.status='Saving unavailable — export a backup before leaving';}
  this.signal();
  window.addEventListener('storage',e=>{if(e.key===STORE_KEY){const next=envelope(e.newValue);if(next&&next.revision>this.state.revision){this.state=next;this.undoStack=[];this.status='Updated from another tab';this.refreshDerived();this.signal()}}});
  const resume=()=>this.restore();window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.restore()});
  return this;
 }
 refreshLocal(){const latest=envelope(localGet(STORE_KEY));if(latest&&latest.revision>this.state.revision){this.state=latest;this.undoStack=[];}}
 commit(note,mutator,{undo=true}={}){
  if(!this.ready)throw new Error('Saved progress is still loading.');
  this.refreshLocal();const old=clone(this.state.data),next=clone(old);mutator(next);const clean=sanitize(next);reconcile(clean,Date.now());
  if(undo){this.undoStack.push(old);if(this.undoStack.length>15)this.undoStack.shift();}
  if(note)clean.history=[...clean.history,{at:Date.now(),note}].slice(-30);
  const e={schema:5,revision:Math.max(Date.now()*1000,this.state.revision+1),modifiedAt:Date.now(),data:clean};
  this.state=e;let localOK=false;
  try{const prev=localGet(STORE_KEY);if(prev&&envelope(prev))localStorage.setItem(BACKUP_KEY,prev);localStorage.setItem(STORE_KEY,JSON.stringify(e));localOK=localStorage.getItem(STORE_KEY)===JSON.stringify(e)}catch{}
  this.status=localOK?'Saved on this device · backup saving…':'Saving backup on this device…';this.signal();
  dbWrite(this.db,e).then(dbOK=>{
   if(this.state.revision!==e.revision)return;
   this.memoryOnly=!localOK&&!dbOK;
   this.status=localOK&&dbOK?'Saved on this device · database backup saved':localOK?'Saved locally · database backup unavailable':dbOK?'Saved in database · local storage unavailable':'NOT SAVED — export a backup before leaving';
   this.signal();
  });
 }
 refreshDerived(){const test=clone(this.data);if(reconcile(test,Date.now()))this.commit('',s=>reconcile(s,Date.now()),{undo:false});}
 async restore(){if(!this.ready)return;this.refreshLocal();const rows=await dbReadAll(this.db);const next=envelope(rows.find(r=>r.key===RECORD)?.value);if(next&&next.revision>this.state.revision){this.state=next;this.undoStack=[];this.status='Newer database backup restored';}this.refreshDerived();this.signal();}
 undo(){const previous=this.undoStack.pop();if(previous)this.commit('Undid last change',s=>Object.assign(s,previous),{undo:false});}
 exportText(){return JSON.stringify({app:'RDO Companion',...this.state},null,2)}
 importText(raw){if(raw.length>500000)throw new Error('That backup is too large.');const e=envelope(raw);if(!e)throw new Error('Use a valid RDO Companion backup JSON file.');this.commit('Restored a backup',s=>Object.assign(s,e.data));}
}
