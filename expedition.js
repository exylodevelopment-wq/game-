/* A small, persistent expedition: restore the relay, broadcast, then evacuate. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Expedition=api;})(globalThis,()=>{
 const requirements=Object.freeze({battery:2,scrap:4,rope:1});
 const duration=90;
 function create(saved={}){return{discovered:false,relayOnline:false,signalTime:0,rescueReady:false,completed:false,waveTime:0,...saved};}
 function canRepair(state,bag){return!state.relayOnline&&!state.completed&&Object.entries(requirements).every(([key,n])=>(bag[key]||0)>=n);}
 function repair(state,bag){if(!canRepair(state,bag))return false;for(const[key,n]of Object.entries(requirements))bag[key]-=n;state.discovered=true;state.relayOnline=true;state.signalTime=0;state.waveTime=0;return true;}
 function tick(state,dt,nearRelay){
  if(!Number.isFinite(dt)||dt<=0||!nearRelay||!state.relayOnline||state.rescueReady||state.completed)return{wave:false,ready:false};
  state.signalTime=Math.min(duration,state.signalTime+dt);state.waveTime+=dt;
  const wave=state.waveTime>=15;if(wave)state.waveTime%=15;
  const ready=state.signalTime>=duration;if(ready)state.rescueReady=true;
  return{wave:wave&&!ready,ready};
 }
 function extract(state){if(!state.rescueReady||state.completed)return false;state.completed=true;return true;}
 return{create,requirements,duration,canRepair,repair,tick,extract};
});
