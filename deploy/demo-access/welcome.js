const form=document.getElementById('access-form'),notice=document.getElementById('notice'),session=document.getElementById('session');
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button'),input=form.elements.password;
 button.disabled=true;notice.textContent='';
 try{
  const response=await fetch('/demo-access/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.value}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo iniciar el acceso.');
  input.value='';location.assign('/');
 }catch(error){notice.textContent=error.name==='TimeoutError'?'La conexión tardó demasiado. Intenta nuevamente.':error.message}
 finally{input.value='';button.disabled=false}
});
document.getElementById('logout').addEventListener('click',async()=>{
 try{const response=await fetch('/demo-access/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();form.hidden=false;session.hidden=true;notice.textContent='Acceso cerrado. Puedes cerrar esta ventana.'}catch{notice.textContent='No se pudo cerrar el acceso. Intenta nuevamente.'}
});
fetch('/demo-access/status').then(r=>r.json()).then(state=>{if(state.authenticated){form.hidden=true;session.hidden=false;notice.textContent='Ya tienes acceso en este navegador.'}}).catch(()=>{});
