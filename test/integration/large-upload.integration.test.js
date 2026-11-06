import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('a declared 5 GiB upload streams incrementally and an interrupted source is removed', () => {
  const code = `
    import assert from 'node:assert/strict';
    import http from 'node:http';
    import {mkdtemp,readdir,stat,rm} from 'node:fs/promises';
    import {tmpdir} from 'node:os';
    import {join} from 'node:path';
    const dir=await mkdtemp(join(tmpdir(),'av-large-upload-'));
    process.env.JOB_DIR=dir;
    const {server}=await import('./server.js');
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    let responseStatus=null;
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/upload-jobs',method:'POST',headers:{
      'Content-Type':'video/mp4','Content-Length':String(5*1024**3),'x-vdownloader-upload':'1',
      'x-upload-name':'synthetic.mp4','x-upload-duration':'60','x-upload-start':'0','x-upload-end':'60'
    }},res=>{responseStatus=res.statusCode;res.resume();});
    req.on('error',()=>{});
    const memory=process.memoryUsage().rss;
    try {
      req.write(Buffer.alloc(1024*1024));
      let files=[];
      for(let i=0;i<200;i++){files=(await readdir(dir)).filter(x=>x.includes('.source'));if(files.length&&(await stat(join(dir,files[0]))).size>=1024*1024)break;await new Promise(r=>setTimeout(r,25));}
      assert.equal(responseStatus,null,'large upload rejected before streaming');
      assert.equal(files.length,1);
      assert.equal((await stat(join(dir,files[0]))).size,1024*1024);
      assert(process.memoryUsage().rss-memory<128*1024*1024,'upload buffered excessive memory');
      req.destroy();
      for(let i=0;i<200;i++){if(!(await readdir(dir)).some(x=>x.includes('.source')))break;await new Promise(r=>setTimeout(r,25));}
      assert(!(await readdir(dir)).some(x=>x.includes('.source')),'partial source not cleaned');
    }finally{req.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{
    cwd:new URL('../../',import.meta.url),encoding:'utf8',timeout:20000,
    env:{...process.env,UPLOAD_LIMIT_ENABLED:'true',MAX_UPLOAD_GB:'6',MAX_STORAGE_GB:'12',REMOTE_ACCESS_ENABLED:'false'}
  });
  assert.equal(result.status,0,result.stderr||result.stdout);
});
