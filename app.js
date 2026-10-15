import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $=id=>document.getElementById(id);
const CONFIG_KEY='commitment-radar-supabase-public-config-v1';
const DEFAULT_CONFIG={url:'https://htfrixfcirgrhlmwtkjs.supabase.co',key:'sb_publishable_pgnE6MaOYJCSvNiSt2h7SA_SN57UyK6'};
let client=null,user=null,orgs=[],orgId=null,commitments=[],filter='all',authMode='signin',busy=false;
const show=(id,msg,kind='')=>{const el=$(id);el.textContent=msg;el.className='status'+(kind?' '+kind:'');el.classList.remove('hidden')};
const hide=id=>$(id).classList.add('hidden');
const errText=e=>{const m=e?.message||'Unexpected error';return m.length>240?m.slice(0,237)+'…':m};
function setTag(text){$('connectionTag').textContent=text}
function cfg(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')||DEFAULT_CONFIG}catch{return DEFAULT_CONFIG}}
function saveCfg(c){localStorage.setItem(CONFIG_KEY,JSON.stringify(c))}
function validCfg(c){return c&&/^https:\/\/[a-zA-Z0-9.-]+$/.test(c.url)&&typeof c.key==='string'&&c.key.length>20}
function showOnlyAuth(){ $('authPanel').classList.remove('hidden');$('workspacePanel').classList.add('hidden');$('settingsPanel').classList.remove('open');$('authTitle').textContent=authMode==='signin'?'Sign in to Commitment Radar':'Create your account';$('authSubmit').textContent=authMode==='signin'?'Sign in':'Create account';$('toggleAuthMode').textContent=authMode==='signin'?'Create account':'I already have an account';}
function setBusy(v){busy=v;document.querySelectorAll('button').forEach(b=>{if(!['settingsBtn','closeSettings'].includes(b.id))b.disabled=v})}
async function init(){
 const c=cfg();
 if(!validCfg(c)){setTag('SUPABASE · NOT CONFIGURED');$('settingsPanel').classList.add('open');$('projectUrl').value=c?.url||'https://htfrixfcirgrhlmwtkjs.supabase.co';$('anonKey').value=c?.key||'';return}
 try{client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){user=null;orgs=[];commitments=[];$('workspacePanel').classList.add('hidden');showOnlyAuth()}});setTag('SUPABASE · CONNECTED');const {data,error}=await client.auth.getSession();if(error)throw error;if(data.session){user=data.session.user;await enterApp()}else{showOnlyAuth()}}catch(e){client=null;setTag('CONNECTION · ERROR');$('settingsPanel').classList.add('open');show('settingsStatus','Could not connect: '+errText(e),'error')}
}
$('settingsBtn').addEventListener('click',()=>$('settingsPanel').classList.toggle('open'));
$('closeSettings').addEventListener('click',()=>$('settingsPanel').classList.remove('open'));
$('settingsForm').addEventListener('submit',async e=>{e.preventDefault();const url=$('projectUrl').value.trim().replace(/\/$/,'');const key=$('anonKey').value.trim();if(!validCfg({url,key})){show('settingsStatus','Enter a valid HTTPS project URL and public anon/publishable key. Never use a service-role key.','error');return}try{saveCfg({url,key});hide('settingsStatus');await init();if(client){$('settingsPanel').classList.remove('open');setTag('SUPABASE · CONNECTED')}}catch(ex){show('settingsStatus',errText(ex),'error')}});
$('forgetConfig').addEventListener('click',async()=>{localStorage.removeItem(CONFIG_KEY);if(client)await client.auth.signOut();window.location.reload()});
$('toggleAuthMode').addEventListener('click',()=>{authMode=authMode==='signin'?'signup':'signin';showOnlyAuth();hide('authStatus')});
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;setBusy(true);hide('authStatus');try{const email=$('email').value.trim(),password=$('password').value;if(authMode==='signin'){const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;await enterApp()}else{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(data.session){user=data.user;await enterApp()}else{show('authStatus','Account created. Check your email to confirm it, then return here to sign in.','ok');authMode='signin';$('authTitle').textContent='Sign in to Commitment Radar';$('authSubmit').textContent='Sign in';$('toggleAuthMode').textContent='Create account'}}}catch(ex){show('authStatus',errText(ex),'error')}finally{setBusy(false)}});
async function enterApp(){if(!user||!client)return;$('authPanel').classList.add('hidden');$('workspacePanel').classList.remove('hidden');$('userLabel').textContent=user.email||'Signed in';hide('globalStatus');await loadOrganizations()}
async function loadOrganizations(){setBusy(true);try{const {data,error}=await client.from('cr_memberships').select('organization_id,role,cr_organizations(id,name)').eq('user_id',user.id);if(error)throw error;orgs=(data||[]).map(m=>({id:m.organization_id,name:m.cr_organizations?.name||'Workspace',role:m.role}));const sel=$('workspaceSelect');sel.replaceChildren();for(const o of orgs){const op=document.createElement('option');op.value=o.id;op.textContent=o.name+' · '+o.role;sel.appendChild(op)}if(!orgs.length){orgId=null;commitments=[];render();$('items').innerHTML='<div class="empty">Create your first workspace to begin.</div>';show('globalStatus','No workspace is associated with this account yet. Create one below.');$('workspaceCreate').classList.add('open')}else{orgId=orgs.some(o=>o.id===orgId)?orgId:orgs[0].id;sel.value=orgId;hide('globalStatus');await loadCommitments()}}catch(e){show('globalStatus','Could not load workspaces: '+errText(e),'error');$('items').innerHTML='<div class="empty">Workspace data could not be loaded. Check your connection and RLS policies.</div>'}finally{setBusy(false)}}
$('workspaceSelect').addEventListener('change',async()=>{orgId=$('workspaceSelect').value;await loadCommitments()});
$('newWorkspaceBtn').addEventListener('click',()=>$('workspaceCreate').classList.toggle('open'));
$('cancelWorkspace').addEventListener('click',()=>$('workspaceCreate').classList.remove('open'));
$('workspaceForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('workspaceName').value.trim();if(name.length<2){show('workspaceStatus','Name must contain at least 2 characters.','error');return}setBusy(true);try{const {data,error}=await client.rpc('cr_create_organization',{p_name:name});if(error)throw error;$('workspaceName').value='';$('workspaceCreate').classList.remove('open');show('globalStatus','Workspace created.','ok');await loadOrganizations();if(data){orgId=data;$('workspaceSelect').value=data;await loadCommitments()}}catch(ex){show('workspaceStatus','Could not create workspace: '+errText(ex),'error')}finally{setBusy(false)}});
async function loadCommitments(){if(!orgId){commitments=[];render();return}setBusy(true);try{const {data,error}=await client.from('cr_commitments').select('id,organization_id,project_id,title,details,counterparty,owner_name,due_date,status,priority,confidence,source_type,source_excerpt,source_url,created_by,created_at,updated_at,completed_at').eq('organization_id',orgId).order('due_date',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});if(error)throw error;commitments=data||[];render();hide('dataStatus')}catch(e){show('dataStatus','Could not load commitments: '+errText(e),'error');$('items').innerHTML='<div class="empty">Could not load records. Check the database permissions and membership.</div>'}finally{setBusy(false)}}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function isDone(x){return x.status==='completed'||x.status==='done'}
function isCancelled(x){return x.status==='cancelled'}
function isOpen(x){return !isDone(x)&&!isCancelled(x)}
function isOverdue(x){return isOpen(x)&&x.due_date&&x.due_date<today()}
function fmt(d){if(!d)return'No due date';return new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:new Date(d+'T12:00:00').getFullYear()===new Date().getFullYear()?undefined:'numeric'})}
function safeEl(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
function render(){const active=commitments.filter(isOpen).length,done=commitments.filter(isDone).length,late=commitments.filter(isOverdue).length;$('activeMetric').textContent=active;$('doneMetric').textContent=done;$('attentionMetric').textContent=late;const rows=commitments.filter(x=>filter==='all'||(filter==='active'&&isOpen(x))||(filter==='done'&&isDone(x))||(filter==='attention'&&isOverdue(x)));$('countLabel').textContent=rows.length+' shown';const root=$('items');root.replaceChildren();if(!rows.length){root.appendChild(safeEl('div','empty',commitments.length?'Nothing in this view right now.':'No commitments yet. Add your first commitment.'));return}for(const x of rows){const item=safeEl('article','item'),cb=safeEl('input','check');cb.type='checkbox';cb.checked=isDone(x);cb.disabled=isCancelled(x);cb.setAttribute('aria-label',isCancelled(x)?'Cancelled commitment: '+x.title:'Mark '+x.title+' completed');cb.addEventListener('change',()=>updateStatus(x,cb.checked));const main=safeEl('div','item-main'),title=safeEl('div','item-title'+(isDone(x)?' done':''),x.title),meta=safeEl('div','meta');if(x.owner_name)meta.appendChild(safeEl('span','pill','Owner · '+x.owner_name));if(x.counterparty)meta.appendChild(safeEl('span','pill','For · '+x.counterparty));meta.appendChild(safeEl('span','pill',x.priority||'normal'));meta.appendChild(safeEl('span','pill'+(isOverdue(x)?' overdue':(!isDone(x)&&x.due_date===today()?' today':'')),isDone(x)?'Completed':(isCancelled(x)?'Cancelled':(isOverdue(x)?'Overdue · ':'Due · ')+fmt(x.due_date))));if(x.details)main.appendChild(title),main.appendChild(safeEl('div','hint',x.details.slice(0,180)));else main.appendChild(title);main.appendChild(meta);const del=safeEl('button','delete','×');del.type='button';del.setAttribute('aria-label','Delete '+x.title);del.addEventListener('click',()=>deleteCommitment(x));item.append(cb,main,del);root.appendChild(item)}}
async function updateStatus(x,done){setBusy(true);try{const status=done?'done':'open';const patch={status,completed_at:done?new Date().toISOString():null};const {error}=await client.from('cr_commitments').update(patch).eq('id',x.id).eq('organization_id',orgId);if(error)throw error;await loadCommitments()}catch(e){show('dataStatus','Could not update commitment: '+errText(e),'error');await loadCommitments()}finally{setBusy(false)}}
async function deleteCommitment(x){if(!confirm('Delete this commitment permanently?'))return;setBusy(true);try{const {error}=await client.from('cr_commitments').delete().eq('id',x.id).eq('organization_id',orgId);if(error)throw error;await loadCommitments()}catch(e){show('dataStatus','Could not delete commitment: '+errText(e),'error')}finally{setBusy(false)}}
$('toggleForm').addEventListener('click',()=>{$('commitFormWrap').classList.toggle('open');if($('commitFormWrap').classList.contains('open'))$('commitTitle').focus()});
function closeCommitForm(){$('commitFormWrap').classList.remove('open');$('commitForm').reset();hide('commitStatus')}
$('cancelCommit').addEventListener('click',closeCommitForm);
$('commitForm').addEventListener('submit',async e=>{e.preventDefault();if(!orgId){show('commitStatus','Create or select a workspace first.','error');return}const title=$('commitTitle').value.trim();if(title.length<2){show('commitStatus','Commitment title must contain at least 2 non-space characters.','error');return}setBusy(true);try{const payload={organization_id:orgId,title,details:$('details').value.trim(),owner_name:$('ownerName').value.trim(),counterparty:$('counterparty').value.trim(),due_date:$('dueDate').value||null,priority:$('priority').value,confidence:$('confidence').value,source_type:$('sourceType').value,status:'open',created_by:user.id};const {error}=await client.from('cr_commitments').insert(payload);if(error)throw error;closeCommitForm();await loadCommitments()}catch(ex){show('commitStatus','Could not save commitment: '+errText(ex),'error')}finally{setBusy(false)}});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()}));
$('signOutBtn').addEventListener('click',async()=>{setBusy(true);try{const {error}=await client.auth.signOut();if(error)throw error;user=null;orgs=[];commitments=[];$('workspacePanel').classList.add('hidden');showOnlyAuth()}catch(e){show('globalStatus','Sign out failed: '+errText(e),'error')}finally{setBusy(false)}});

 // Progressive Web App shell. Authentication and API responses are never cached.
let installPromptEvent = null;
const installAppBtn = document.getElementById('installAppBtn');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPromptEvent = event;
  installAppBtn?.classList.remove('hidden');
});
installAppBtn?.addEventListener('click', async () => {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installAppBtn.classList.add('hidden');
});
window.addEventListener('appinstalled', () => {
  installPromptEvent = null;
  installAppBtn?.classList.add('hidden');
});
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .catch(error => console.warn('PWA shell registration failed:', error));
  }, { once: true });
}

await init();
