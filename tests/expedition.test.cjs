'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Expedition=require('../expedition.js');
const stocked=()=>({battery:4,scrap:9,rope:3,food:2,knife:1});
const copy=value=>JSON.parse(JSON.stringify(value));

test('new expedition starts offline without inventing progress or rewards',()=>{
 const state=Expedition.create();
 assert.equal(state.discovered,false);
 assert.equal(state.relayOnline,false);
 assert.equal(state.signalTime,0);
 assert.equal(state.rescueReady,false);
 assert.equal(state.completed,false);
 assert.equal(Expedition.extract(state),false);
});

test('every required repair material is mandatory and failed repair is atomic',()=>{
 for(const[key,required]of Object.entries(Expedition.requirements)){
  const state=Expedition.create(),bag=stocked();
  bag[key]=required-1;
  const beforeBag=copy(bag),beforeState=copy(state);
  assert.equal(Expedition.canRepair(state,bag),false);
  assert.equal(Expedition.repair(state,bag),false);
  assert.deepEqual(bag,beforeBag);
  assert.deepEqual(state,beforeState);
 }
 assert.equal(Expedition.repair(Expedition.create(),{}),false);
});

test('explicit repair consumes exactly two batteries, four metal and one rope without gifts',()=>{
 const state=Expedition.create(),bag=stocked();
 assert.deepEqual(Expedition.requirements,{battery:2,scrap:4,rope:1});
 assert.equal(Expedition.canRepair(state,bag),true);
 assert.equal(state.relayOnline,false,'affordability inspection must not activate the relay');
 assert.equal(Expedition.repair(state,bag),true);
 assert.deepEqual(bag,{battery:2,scrap:5,rope:2,food:2,knife:1});
 assert.equal(state.discovered,true);
 assert.equal(state.relayOnline,true);
 assert.equal(state.signalTime,0);
 assert.equal(state.completed,false);
});

test('repair cannot charge materials twice or restart an active transmission',()=>{
 const state=Expedition.create(),bag=stocked();
 assert.equal(Expedition.repair(state,bag),true);
 Expedition.tick(state,12,true);
 const beforeBag=copy(bag),beforeState=copy(state);
 assert.equal(Expedition.canRepair(state,bag),false);
 assert.equal(Expedition.repair(state,bag),false);
 assert.deepEqual(bag,beforeBag);
 assert.deepEqual(state,beforeState);
});

test('offline relay, leaving its area and invalid time steps do not advance signal',()=>{
 const state=Expedition.create(),bag=stocked();
 assert.deepEqual(Expedition.tick(state,40,true),{wave:false,ready:false});
 assert.equal(state.signalTime,0);
 Expedition.repair(state,bag);
 Expedition.tick(state,8,true);
 assert.equal(state.signalTime,8);
 for(const dt of [0,-1,NaN,Infinity,undefined]){
  assert.deepEqual(Expedition.tick(state,dt,true),{wave:false,ready:false});
 }
 Expedition.tick(state,40,false);
 assert.equal(state.signalTime,8);
 assert.equal(state.waveTime,8);
});

test('ninety seconds near the active relay enables extraction but never extracts automatically',()=>{
 assert.equal(Expedition.duration,90);
 const state=Expedition.create(),bag=stocked();
 Expedition.repair(state,bag);
 const afterRepair=copy(bag);
 let waves=0,readinessEvents=0;
 for(let i=0;i<90;i++){
  const result=Expedition.tick(state,1,true);
  if(result.wave)waves++;
  if(result.ready)readinessEvents++;
  if(i<89)assert.equal(state.rescueReady,false);
 }
 assert.equal(waves,5,'defence waves occur during transmission, not on completion');
 assert.equal(readinessEvents,1);
 assert.equal(state.signalTime,90);
 assert.equal(state.rescueReady,true);
 assert.equal(state.completed,false,'a completed signal still requires manual extraction');
 assert.deepEqual(bag,afterRepair);
 assert.deepEqual(Expedition.tick(state,100,true),{wave:false,ready:false});
 assert.equal(state.signalTime,90);
});

test('manual extraction succeeds only when ready and can complete only once',()=>{
 const state=Expedition.create();
 assert.equal(Expedition.extract(state),false);
 Expedition.repair(state,stocked());
 Expedition.tick(state,89,true);
 assert.equal(Expedition.extract(state),false);
 Expedition.tick(state,1,true);
 assert.equal(Expedition.extract(state),true);
 assert.equal(state.completed,true);
 assert.equal(Expedition.extract(state),false);
 assert.equal(Expedition.repair(state,stocked()),false);
});

test('saved transmission resumes exactly and does not modify the input save object',()=>{
 const state=Expedition.create();
 Expedition.repair(state,stocked());
 Expedition.tick(state,37.5,true);
 const saved=copy(state),before=copy(saved),restored=Expedition.create(saved);
 assert.deepEqual(restored,state);
 Expedition.tick(restored,52.5,true);
 assert.equal(restored.rescueReady,true);
 assert.equal(restored.completed,false);
 assert.deepEqual(saved,before);
 assert.equal(state.signalTime,37.5);
});

test('module also loads as a browser script without Node or DOM APIs',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../expedition.js'),'utf8'),context);
 assert.ok(context.Expedition);
 const state=context.Expedition.create();
 assert.equal(state.relayOnline,false);
 assert.equal(context.Expedition.duration,90);
});
