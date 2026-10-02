import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,randomBytes} from 'node:crypto';
import {createGateway} from './server.mjs';
import {loadConfig} from './config.mjs';
import {resolve,dirname} from 'node:path';
import http from 'node:http';
function fetch(url,options={}){return new Promise((resolve,reject)=>{const req=http.request(url,{method:options.method||'GET',headers:options.headers},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:new Headers(Object.entries(res.headers).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))}))});req.on('error',reject);req.end(options.body)})}
const password='test-only-password-strong-2026',salt=randomBytes(16).toString('hex');
const site={name:'Test Demo',salt,verifier:scryptSync(password,salt,64).toString('hex')};
test('password gate protects sessions, host isolation, CSRF, expiry and logout',async()=>{
 let clock=Date.now();const server=createGateway({'one.innovalogic.tech':site,'two.innovalogic.tech':site},{now:()=>clock});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,options={})=>fetch(base+path,{...options,headers:{Host:'one.innovalogic.tech',...options.headers}});
 const login=(pw,headers={})=>request('/demo-access/login',{method:'POST',headers:{Origin:'https://one.innovalogic.tech','Content-Type':'application/json',...headers},body:JSON.stringify({password:pw})});
 try{
  let r=await request('/check');assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null);
  r=await login('incorrect-password-value');assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null);
  r=await login(password,{Origin:'https://attacker.example'});assert.equal(r.status,403);
  r=await request('/demo-access/login',{method:'POST',headers:{Origin:'https://one.innovalogic.tech','Content-Type':'application/json'},body:'x'.repeat(2200)});assert.equal(r.status,400);
  r=await login(password);assert.equal(r.status,200);const set=r.headers.get('set-cookie');assert.match(set,/Secure; HttpOnly; SameSite=Strict; Max-Age=28800/);const cookie=set.split(';')[0];
  assert.equal((await request('/check',{headers:{Cookie:cookie}})).status,204);
  assert.equal((await request('/check',{headers:{Cookie:cookie,Host:'two.innovalogic.tech'}})).status,401);
  assert.equal((await request('/check',{headers:{Cookie:cookie+'; '+cookie}})).status,401);
  assert.equal((await request('/check',{headers:{Cookie:'__Host-ilgate=old-cookie'}})).status,401);
  clock+=8*3600000+1;assert.equal((await request('/check',{headers:{Cookie:cookie}})).status,401);
  r=await login(password);const second=r.headers.get('set-cookie').split(';')[0];
  r=await request('/demo-access/logout',{method:'POST',headers:{Cookie:second,Origin:'https://one.innovalogic.tech','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await request('/check',{headers:{Cookie:second}})).status,401);
  assert.equal((await request('/demo-access',{headers:{Host:'unrecognized.example'}})).status,421);
  assert.equal((await request('/demo-access',{headers:{Host:'__proto__'}})).status,421);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
test('repeated invalid keys are limited and expired pilot stays closed',async()=>{
 const server=createGateway({'one.innovalogic.tech':site,'expired.innovalogic.tech':{...site,expires:'2020-01-01T00:00:00Z'}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  for(let i=0;i<6;i++){const r=await fetch(base+'/demo-access/login',{method:'POST',headers:{Host:'one.innovalogic.tech',Origin:'https://one.innovalogic.tech','Content-Type':'application/json'},body:JSON.stringify({password:'wrong-password-value'})});assert.equal(r.status,i===5?429:401)}
  assert.equal((await fetch(base+'/demo-access',{headers:{Host:'expired.innovalogic.tech'}})).status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});

function fromEnv(env,extra={}){
 const file=resolve('fixture/config.json'),envFile=resolve(dirname(file),'app/.env');
 return loadConfig(file,{read:path=>{
  if(path===file)return JSON.stringify({'one.innovalogic.tech':{name:'Test Demo',envFile:'app/.env',...extra}});
  assert.equal(path,envFile);return env;
 }});
}

test('private env config requires an explicit mode and a valid password when enabled',()=>{
 const config=fromEnv('DEMO_MODE=true\nDEMO_PASSWORD="demo-2026 # private"\n');
 const loaded=config['one.innovalogic.tech'];
 assert.equal(loaded.demoMode,true);
 assert.equal(loaded.verifier,scryptSync('demo-2026 # private',loaded.salt,64).toString('hex'));
 assert.equal(Object.hasOwn(loaded,'password'),false);
 assert.equal(JSON.stringify(config).includes('demo-2026 # private'),false);
 assert.equal(fromEnv('DEMO_MODE=false\n')['one.innovalogic.tech'].demoMode,false);
 for(const invalid of ['', 'DEMO_MODE=\n','DEMO_MODE=yes\n','DEMO_MODE=FALSE\n','DEMO_MODE=true\n','DEMO_MODE=true\nDEMO_PASSWORD=short\n'])assert.throws(()=>fromEnv(invalid),/Invalid demo configuration/);
 assert.throws(()=>fromEnv('DEMO_MODE=false\n',{expires:'invalid'}),/Invalid demo configuration/);
 assert.throws(()=>loadConfig('missing',{read:()=>{throw Error('private secret value')}}),error=>!error.message.includes('private secret value'));
});

test('env mode false permits entry without cookies while enabled apps and expiry stay protected',async()=>{
 const disabled=fromEnv('DEMO_MODE=false\n')['one.innovalogic.tech'];
 const enabled=fromEnv('DEMO_MODE=true\nDEMO_PASSWORD=demo-2026\n')['one.innovalogic.tech'];
 const server=createGateway({'one.innovalogic.tech':disabled,'two.innovalogic.tech':enabled,'expired.innovalogic.tech':{...disabled,expires:'2020-01-01T00:00:00Z'}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,host)=>fetch(base+path,{headers:{Host:host}});
 try{
  assert.equal((await request('/check','one.innovalogic.tech')).status,204);
  const welcome=await request('/demo-access','one.innovalogic.tech');assert.equal(welcome.status,303);assert.equal(welcome.headers.get('location'),'/');assert.equal(welcome.headers.get('set-cookie'),null);
  assert.equal((await request('/check','two.innovalogic.tech')).status,401);
  assert.equal((await request('/check','expired.innovalogic.tech')).status,403);
  const login=await fetch(base+'/demo-access/login',{method:'POST',headers:{Host:'two.innovalogic.tech',Origin:'https://two.innovalogic.tech','Content-Type':'application/json'},body:JSON.stringify({password:'demo-2026'})});assert.equal(login.status,200);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});

test('restart applies a changed env password and revokes earlier sessions',async()=>{
 async function start(password){
  const server=createGateway(fromEnv('DEMO_MODE=true\nDEMO_PASSWORD='+password+'\n'));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {server,base:'http://127.0.0.1:'+server.address().port};
 }
 const login=(base,password)=>fetch(base+'/demo-access/login',{method:'POST',headers:{Host:'one.innovalogic.tech',Origin:'https://one.innovalogic.tech','Content-Type':'application/json'},body:JSON.stringify({password})});
 const first=await start('old-demo-key');let oldCookie;
 try{const r=await login(first.base,'old-demo-key');assert.equal(r.status,200);oldCookie=r.headers.get('set-cookie').split(';')[0];}
 finally{first.server.closeAllConnections();await new Promise(r=>first.server.close(r))}
 const second=await start('new-demo-key');
 try{
  assert.equal((await fetch(second.base+'/check',{headers:{Host:'one.innovalogic.tech',Cookie:oldCookie}})).status,401);
  assert.equal((await login(second.base,'old-demo-key')).status,401);
  assert.equal((await login(second.base,'new-demo-key')).status,200);
 }finally{second.server.closeAllConnections();await new Promise(r=>second.server.close(r))}
});
