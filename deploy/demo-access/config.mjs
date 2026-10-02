import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomBytes,scryptSync} from 'node:crypto';
import {isAbsolute,resolve,dirname} from 'node:path';

// Keep configuration errors generic: never echo an env value or parser exception.
export function loadConfig(path,{read=readFileSync}={}){
 try{
  const definitions=JSON.parse(read(path,'utf8'));
  if(!definitions||Array.isArray(definitions)||typeof definitions!=='object'||!Object.keys(definitions).length)throw Error();
  const config=Object.create(null);
  for(const [host,site] of Object.entries(definitions)){
   if(!/^[a-z]+\.innovalogic\.tech$/.test(host)||!site||!/^[A-Za-z0-9 ]+$/.test(site.name))throw Error();
   if(site.expires!==undefined&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(site.expires)||!Number.isFinite(Date.parse(site.expires))))throw Error();
   const entry={name:site.name,expires:site.expires,demoMode:true};
   if(site.envFile!==undefined){
    if(typeof site.envFile!=='string'||!site.envFile.length)throw Error();
    const envPath=isAbsolute(site.envFile)?site.envFile:resolve(dirname(path),site.envFile);
    const env=parseEnv(read(envPath,'utf8'));
    // Only an explicit false disables the gate. Missing or invalid settings fail closed.
    if(!['true','false'].includes(env.DEMO_MODE))throw Error();
    entry.demoMode=env.DEMO_MODE==='true';
    if(entry.demoMode){
     const password=env.DEMO_PASSWORD;
     if(typeof password!=='string'||password.trim().length<8||password.length>256||/[\r\n\0]/.test(password))throw Error();
     entry.salt=randomBytes(16).toString('hex');
     entry.verifier=scryptSync(password,entry.salt,64).toString('hex');
    }
   }else{
    // Backward compatibility permits the previous hashed configuration for rollback.
    if(!/^[a-f0-9]{32}$/.test(site.salt)||!/^[a-f0-9]{128}$/.test(site.verifier))throw Error();
    entry.salt=site.salt;entry.verifier=site.verifier;
   }
   config[host]=entry;
  }
  return config;
 }catch{throw new Error('Invalid demo configuration. Check the private env files; access remains closed.');}
}
