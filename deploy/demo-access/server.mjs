import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {loadConfig} from './config.mjs';
const derive=promisify(scrypt), hash=value=>createHash('sha256').update(value).digest('hex');
const cookieName='__Host-il_demo';
const duration=8*60*60*1000;
const cookie=token=>`${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${token?duration/1000:0}`;
const html=readFileSync(new URL('./welcome.html',import.meta.url),'utf8');
const assets=new Map(['style.css','welcome.js'].map(name=>[name,readFileSync(new URL('./'+name,import.meta.url))]));
export function createGateway(config,{now=Date.now}={}){
 const sessions=new Map(),rates=new Map();let pending=0;
 function prune(){const t=now();for(const [k,v] of sessions)if(v.expires<=t)sessions.delete(k);for(const [k,v] of rates)if(v.until<=t)rates.delete(k)}
 function authenticated(req,host){prune();const values=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));if(values.length!==1)return false;const token=values[0].slice(cookieName.length+1);if(!/^[a-f0-9]{64}$/.test(token))return false;return sessions.get(hash(token))?.host===host}
 function limit(key,max){let r=rates.get(key);if(!r){if(rates.size>=2048)return false;r={count:0,until:now()+15*60000};rates.set(key,r)}return ++r.count<=max}
 function reply(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",...headers});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data))}
 async function body(req){if(Number(req.headers['content-length'])>2048)throw new Error('size');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048)throw new Error('size');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString())}
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host,site=Object.hasOwn(config,host)?config[host]:undefined;
  if(!site)return reply(res,421,{error:'Sitio no reconocido.'});
  if(site.expires&&now()>=Date.parse(site.expires))return reply(res,403,{error:'El período autorizado de este demo ha terminado.'});
  const url=new URL(req.url,'https://'+host),path=url.pathname;
  if(path==='/check'&&req.method==='GET')return reply(res,site.demoMode===false||authenticated(req,host)?204:401,'');
  if(path==='/demo-access/status'&&req.method==='GET')return reply(res,200,{demoMode:site.demoMode!==false,authenticated:site.demoMode===false||authenticated(req,host)});
  if(site.demoMode===false&&['/demo-access','/demo-access/','/demo-access/login'].includes(path))return reply(res,303,'',{'Location':'/'});
  if((path==='/demo-access'||path==='/demo-access/')&&req.method==='GET')return reply(res,200,html.replaceAll('{{NAME}}',site.name),{'Content-Type':'text/html; charset=utf-8'});
  const asset=path.replace('/demo-access/','');
  if(req.method==='GET'&&path.startsWith('/demo-access/')&&assets.has(asset))return reply(res,200,assets.get(asset),{'Content-Type':asset.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});
  if(!['/demo-access/login','/demo-access/logout'].includes(path))return reply(res,404,{error:'No encontrado.'});
  if(req.method!=='POST')return reply(res,405,{error:'Método no permitido.'});
  if(req.headers.origin!=='https://'+host)return reply(res,403,{error:'Origen no permitido.'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,415,{error:'Formato no permitido.'});
  if(path==='/demo-access/logout'){
   const tokens=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));for(const token of tokens)sessions.delete(hash(token.slice(cookieName.length+1)));
   return reply(res,200,{ok:true},{'Set-Cookie':cookie('')});
  }
  prune();const ip=req.headers['x-real-ip']||req.socket.remoteAddress;
  if(!limit(host+':'+hash(ip),5)||!limit(host+':global',60)||pending>=2||sessions.size>=200)return reply(res,429,{error:'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'},{'Retry-After':'900'});
  let password;
  try{({password}=await body(req))}catch{return reply(res,400,{error:'Solicitud no válida.'})}
  if(typeof password!=='string'||password.length<8||password.length>256)return reply(res,401,{error:'La clave no es correcta. Revisa e intenta nuevamente.'});
  pending++;
  try{
   const derived=await derive(password,site.salt,64);if(!timingSafeEqual(derived,Buffer.from(site.verifier,'hex')))return reply(res,401,{error:'La clave no es correcta. Revisa e intenta nuevamente.'});
   if(sessions.size>=200)return reply(res,429,{error:'El demo está ocupado. Intenta más tarde.'});
   // Sessions are host-bound; only their hashes live in memory. Restart revokes them.
   const token=randomBytes(32).toString('hex');sessions.set(hash(token),{host,expires:now()+duration});
   return reply(res,200,{ok:true},{'Set-Cookie':cookie(token)});
  }catch{return reply(res,503,{error:'No se pudo abrir el acceso. Intenta más tarde.'})}finally{pending--}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const config=loadConfig(process.env.DEMO_ACCESS_CONFIG||'/etc/innovalogic-demo-access/config.json');
 if(process.argv.includes('--check-config'))console.log('Demo configuration valid. No secrets displayed.');
 else createGateway(config).listen(5192,'127.0.0.1',()=>console.log('Demo access service ready on loopback.'));
}
