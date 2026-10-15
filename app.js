import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $=id=>document.getElementById(id);
const CONFIG_KEY='commitment-radar-supabase-public-config-v1';
const DEFAULT_CONFIG={url:'https://htfrixfcirgrhlmwtkjs.supabase.co',key:'sb_publishable_pgnE6MaOYJCSvNiSt2h7SA_SN57UyK6'};
let client=null,user=null,orgs=[],orgId=null,commitments=[],projects=[],evidenceItems=[],reviews=[],auditEvents=[],dependencies=[],filter='all',editingCommitmentId=null,authMode='signin',busy=false;
const show=(id,msg,kind='')=>{const el=$(id);el.textContent=msg;el.className='status'+(kind?' '+kind:'');el.classList.remove('hidden')};
const hide=id=>$(id).classList.add('hidden');
const errText=e=>{const m=e?.message||'Unexpected error';return m.length>240?m.slice(0,237)+'…':m};
function setTag(text){$('connectionTag').textContent=text}

function canEdit(){return ['owner','admin','editor'].includes(orgs.find(o=>o.id===orgId)?.role)}
function fillCommitmentSelects(){
  const options=[['projectId','No project',projects.filter(p=>p.status==='active').map(p=>[p.id,p.name])],['evidenceCommitmentId','Select a commitment',commitments.map(c=>[c.id,c.title])],['reviewCommitmentId','Select a commitment',commitments.filter(c=>!isCancelled(c)).map(c=>[c.id,c.title])],['dependencyCommitmentId','Choose dependent commitment',commitments.filter(c=>!isCancelled(c)).map(c=>[c.id,c.title])],['dependsOnCommitmentId','Choose prerequisite',commitments.filter(c=>!isCancelled(c)).map(c=>[c.id,c.title])]];
  for(const [id,placeholder,items] of options){const el=$(id);if(!el)continue;const previous=el.value;el.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=placeholder;el.appendChild(blank);for(const [value,label] of items){const opt=document.createElement('option');opt.value=value;opt.textContent=label;el.appendChild(opt)}if(items.some(item=>item[0]===previous))el.value=previous}
}
function showView(view){
  document.querySelectorAll('[data-view-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.viewPanel!==view));
  document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  if(view==='projects')loadProjects();
  if(view==='evidence')loadEvidence();
  if(view==='reviews')loadReviews();
  if(view==='audit')loadAudit();
  if(view==='dependencies')loadDependencies();
}

function cfg(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')||DEFAULT_CONFIG}catch{return DEFAULT_CONFIG}}
function saveCfg(c){localStorage.setItem(CONFIG_KEY,JSON.stringify(c))}
function validCfg(c){return c&&/^https:\/\/[a-zA-Z0-9.-]+$/.test(c.url)&&typeof c.key==='string'&&c.key.length>20}
function showOnlyAuth(){ $('authPanel').classList.remove('hidden');$('workspacePanel').classList.add('hidden');$('settingsPanel').classList.remove('open');$('authTitle').textContent=authMode==='signin'?'Sign in to Commitment Radar':'Create your account';$('authSubmit').textContent=authMode==='signin'?'Sign in':'Create account';$('toggleAuthMode').textContent=authMode==='signin'?'Create account':'I already have an account';}
function setBusy(v){busy=v;document.querySelectorAll('button').forEach(b=>{if(!['settingsBtn','closeSettings'].includes(b.id))b.disabled=v})}
async function init(){
 const c=cfg();
 if(!validCfg(c)){setTag('SUPABASE · NOT CONFIGURED');$('settingsPanel').classList.add('open');$('projectUrl').value=c?.url||'https://htfrixfcirgrhlmwtkjs.supabase.co';$('anonKey').value=c?.key||'';return}
 try{client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){user=null;orgs=[];commitments=[];projects=[];evidenceItems=[];reviews=[];auditEvents=[];dependencies=[];$('workspacePanel').classList.add('hidden');showOnlyAuth()}});setTag('SUPABASE · CONNECTED');const {data,error}=await client.auth.getSession();if(error)throw error;if(data.session){user=data.session.user;await enterApp()}else{showOnlyAuth()}}catch(e){client=null;setTag('CONNECTION · ERROR');$('settingsPanel').classList.add('open');show('settingsStatus','Could not connect: '+errText(e),'error')}
}
$('settingsBtn').addEventListener('click',()=>$('settingsPanel').classList.toggle('open'));
$('closeSettings').addEventListener('click',()=>$('settingsPanel').classList.remove('open'));
$('settingsForm').addEventListener('submit',async e=>{e.preventDefault();const url=$('projectUrl').value.trim().replace(/\/$/,'');const key=$('anonKey').value.trim();if(!validCfg({url,key})){show('settingsStatus','Enter a valid HTTPS project URL and public anon/publishable key. Never use a service-role key.','error');return}try{saveCfg({url,key});hide('settingsStatus');await init();if(client){$('settingsPanel').classList.remove('open');setTag('SUPABASE · CONNECTED')}}catch(ex){show('settingsStatus',errText(ex),'error')}});
$('forgetConfig').addEventListener('click',async()=>{localStorage.removeItem(CONFIG_KEY);if(client)await client.auth.signOut();window.location.reload()});
$('toggleAuthMode').addEventListener('click',()=>{authMode=authMode==='signin'?'signup':'signin';showOnlyAuth();hide('authStatus')});
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;setBusy(true);hide('authStatus');try{const email=$('email').value.trim(),password=$('password').value;if(authMode==='signin'){const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;await enterApp()}else{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(data.session){user=data.user;await enterApp()}else{show('authStatus','Account created. Check your email to confirm it, then return here to sign in.','ok');authMode='signin';$('authTitle').textContent='Sign in to Commitment Radar';$('authSubmit').textContent='Sign in';$('toggleAuthMode').textContent='Create account'}}}catch(ex){show('authStatus',errText(ex),'error')}finally{setBusy(false)}});
async function enterApp(){if(!user||!client)return;$('authPanel').classList.add('hidden');$('workspacePanel').classList.remove('hidden');$('userLabel').textContent=user.email||'Signed in';hide('globalStatus');await loadOrganizations()}
async function loadOrganizations(){setBusy(true);try{const {data,error}=await client.from('cr_memberships').select('organization_id,role,cr_organizations(id,name)').eq('user_id',user.id);if(error)throw error;orgs=(data||[]).map(m=>({id:m.organization_id,name:m.cr_organizations?.name||'Workspace',role:m.role}));const sel=$('workspaceSelect');sel.replaceChildren();for(const o of orgs){const op=document.createElement('option');op.value=o.id;op.textContent=o.name+' · '+o.role;sel.appendChild(op)}if(!orgs.length){orgId=null;commitments=[];projects=[];evidenceItems=[];reviews=[];auditEvents=[];dependencies=[];fillCommitmentSelects();render();renderProjects();renderEvidence();renderReviews();renderAudit();renderDependencies();$('items').innerHTML='<div class="empty">Create your first workspace to begin.</div>';show('globalStatus','No workspace is associated with this account yet. Create one below.');$('workspaceCreate').classList.add('open')}else{orgId=orgs.some(o=>o.id===orgId)?orgId:orgs[0].id;sel.value=orgId;hide('globalStatus');await loadProjects();await loadCommitments();await loadEvidence();await loadReviews();await loadAudit();await loadDependencies()}}catch(e){show('globalStatus','Could not load workspaces: '+errText(e),'error');$('items').innerHTML='<div class="empty">Workspace data could not be loaded. Check your connection and RLS policies.</div>'}finally{setBusy(false)}}
$('workspaceSelect').addEventListener('change',async()=>{orgId=$('workspaceSelect').value;await loadProjects();await loadCommitments();await loadEvidence();await loadReviews();await loadAudit();await loadDependencies()});
$('newWorkspaceBtn').addEventListener('click',()=>$('workspaceCreate').classList.toggle('open'));
$('cancelWorkspace').addEventListener('click',()=>$('workspaceCreate').classList.remove('open'));
$('workspaceForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('workspaceName').value.trim();if(name.length<2){show('workspaceStatus','Name must contain at least 2 characters.','error');return}setBusy(true);try{const {data,error}=await client.rpc('cr_create_organization',{p_name:name});if(error)throw error;$('workspaceName').value='';$('workspaceCreate').classList.remove('open');show('globalStatus','Workspace created.','ok');await loadOrganizations();if(data){orgId=data;$('workspaceSelect').value=data;await loadProjects();await loadCommitments();await loadEvidence();await loadReviews();await loadAudit();await loadDependencies()}}catch(ex){show('workspaceStatus','Could not create workspace: '+errText(ex),'error')}finally{setBusy(false)}});
async function loadCommitments(){if(!orgId){commitments=[];fillCommitmentSelects();render();return}setBusy(true);try{const {data,error}=await client.from('cr_commitments').select('id,organization_id,project_id,title,details,counterparty,owner_name,due_date,status,priority,confidence,source_type,source_excerpt,source_url,created_by,created_at,updated_at,completed_at').eq('organization_id',orgId).order('due_date',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});if(error)throw error;commitments=data||[];fillCommitmentSelects();render();hide('dataStatus')}catch(e){show('dataStatus','Could not load commitments: '+errText(e),'error');$('items').innerHTML='<div class="empty">Could not load records. Check the database permissions and membership.</div>'}finally{setBusy(false)}}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function isDone(x){return x.status==='completed'||x.status==='done'}
function isCancelled(x){return x.status==='cancelled'}
function isOpen(x){return !isDone(x)&&!isCancelled(x)}
function isOverdue(x){return isOpen(x)&&x.due_date&&x.due_date<today()}
function fmt(d){if(!d)return'No due date';return new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:new Date(d+'T12:00:00').getFullYear()===new Date().getFullYear()?undefined:'numeric'})}
function safeEl(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
function render(){
  const active=commitments.filter(isOpen).length;
  const done=commitments.filter(isDone).length;
  const late=commitments.filter(isOverdue).length;
  $('activeMetric').textContent=active;
  $('doneMetric').textContent=done;
  $('attentionMetric').textContent=late;

  const query=($('commitSearch')?.value||'').trim().toLocaleLowerCase();
  let rows=commitments.filter(x=>{
    if(filter==='active'&&!isOpen(x))return false;
    if(filter==='in_progress'&&x.status!=='in_progress')return false;
    if(filter==='blocked'&&x.status!=='blocked')return false;
    if(filter==='done'&&!isDone(x))return false;
    if(filter==='cancelled'&&!isCancelled(x))return false;
    if(filter==='attention'&&!isOverdue(x))return false;
    if(query){
      const project=projects.find(p=>p.id===x.project_id)?.name||'';
      const haystack=[x.title,x.details,x.owner_name,x.counterparty,x.source_excerpt,x.source_url,project].join(' ').toLocaleLowerCase();
      if(!haystack.includes(query))return false;
    }
    return true;
  });

  const sort=$('commitSort')?.value||'due';
  const priorityRank={urgent:4,high:3,normal:2,low:1};
  rows.sort((a,b)=>{
    if(sort==='title')return String(a.title||'').localeCompare(String(b.title||''));
    if(sort==='created')return String(b.created_at||'').localeCompare(String(a.created_at||''));
    if(sort==='priority'){
      const rank=(priorityRank[b.priority]||0)-(priorityRank[a.priority]||0);
      return rank||String(a.due_date||'9999-12-31').localeCompare(String(b.due_date||'9999-12-31'));
    }
    const due=String(a.due_date||'9999-12-31').localeCompare(String(b.due_date||'9999-12-31'));
    return due||String(b.created_at||'').localeCompare(String(a.created_at||''));
  });

  $('countLabel').textContent=rows.length+' shown';
  const root=$('items');
  root.replaceChildren();
  if(!rows.length){
    root.appendChild(safeEl('div','empty',commitments.length?(query?'No matching commitments.':'Nothing in this view right now.'):'No commitments yet. Add your first commitment.'));
    return;
  }
  const statusLabels={open:'Open',in_progress:'In progress',blocked:'Blocked',done:'Completed',completed:'Completed',cancelled:'Cancelled'};
  for(const x of rows){
    const item=safeEl('article','item');
    const cb=safeEl('input','check');
    cb.type='checkbox';cb.checked=isDone(x);cb.disabled=isCancelled(x)||!canEdit();
    cb.setAttribute('aria-label',isCancelled(x)?'Cancelled commitment: '+x.title:'Mark '+x.title+' completed');
    cb.addEventListener('change',()=>updateStatus(x,cb.checked));

    const main=safeEl('div','item-main');
    const title=safeEl('div','item-title'+(isDone(x)?' done':''),x.title);
    if(x.details)main.append(title,safeEl('div','hint',x.details.slice(0,180)));
    else main.appendChild(title);
    if(x.source_excerpt)main.appendChild(safeEl('div','hint','Source · '+x.source_excerpt.slice(0,140)));
    if(x.source_url){
      try{const source=new URL(x.source_url);if(['https:','http:'].includes(source.protocol)){const link=safeEl('a','module-link',source.hostname+source.pathname);link.href=source.href;link.target='_blank';link.rel='noopener noreferrer';main.appendChild(link)}}catch{}
    }

    const meta=safeEl('div','meta');
    if(x.owner_name)meta.appendChild(safeEl('span','pill','Owner · '+x.owner_name));
    if(x.counterparty)meta.appendChild(safeEl('span','pill','For · '+x.counterparty));
    if(x.project_id){const project=projects.find(p=>p.id===x.project_id);if(project)meta.appendChild(safeEl('span','pill','Project · '+project.name))}
    meta.appendChild(safeEl('span','pill','Priority · '+(x.priority||'normal')));
    meta.appendChild(safeEl('span','pill status-pill status-'+(x.status||'open'),statusLabels[x.status]||x.status||'Open'));
    meta.appendChild(safeEl('span','pill'+(isOverdue(x)?' overdue':(!isDone(x)&&!isCancelled(x)&&x.due_date===today()?' today':'')),isOverdue(x)?'Overdue · '+fmt(x.due_date):'Due · '+fmt(x.due_date)));
    main.appendChild(meta);

    item.append(cb,main);
    if(canEdit()){
      const actions=safeEl('div','item-actions');
      const edit=safeEl('button','secondary','Edit');
      edit.type='button';edit.setAttribute('aria-label','Edit '+x.title);edit.addEventListener('click',()=>editCommitment(x));
      const del=safeEl('button','delete','×');
      del.type='button';del.setAttribute('aria-label','Delete '+x.title);del.addEventListener('click',()=>deleteCommitment(x));
      actions.append(edit,del);
      item.appendChild(actions);
    }
    root.appendChild(item);
  }
}

async function loadProjects(){
  if(!client||!orgId){projects=[];fillCommitmentSelects();renderProjects();return}
  try{const {data,error}=await client.from('cr_projects').select('id,organization_id,name,description,status,created_by,created_at,updated_at').eq('organization_id',orgId).order('created_at',{ascending:false});if(error)throw error;projects=data||[];fillCommitmentSelects();renderProjects()}
  catch(e){show('projectStatus','Could not load projects: '+errText(e),'error');$('projectsList').replaceChildren(safeEl('div','empty','Project data could not be loaded.'))}
}
function renderProjects(){
  const root=$('projectsList');root.replaceChildren();
  if(!projects.length){root.appendChild(safeEl('div','empty','No projects yet. Create one to group related commitments.'));return}
  for(const p of projects){const row=safeEl('article','module-row'),body=safeEl('div','module-row-main'),title=safeEl('strong','module-title',p.name),description=safeEl('p','muted',p.description||'No description'),meta=safeEl('div','meta');meta.appendChild(safeEl('span','pill',p.status));meta.appendChild(safeEl('span','pill',commitments.filter(c=>c.project_id===p.id).length+' commitments'));body.append(title,description,meta);row.appendChild(body);if(canEdit()){const action=safeEl('button','secondary',p.status==='active'?'Archive':'Reactivate');action.type='button';action.addEventListener('click',()=>setProjectStatus(p,p.status==='active'?'archived':'active'));row.appendChild(action)}root.appendChild(row)}
}
async function setProjectStatus(project,status){
  try{const {error}=await client.from('cr_projects').update({status,updated_at:new Date().toISOString()}).eq('id',project.id).eq('organization_id',orgId);if(error)throw error;await loadProjects();await loadCommitments()}
  catch(e){show('projectStatus','Could not update project: '+errText(e),'error')}
}
$('projectForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!orgId||!canEdit()){show('projectStatus','You need an editor or higher role to create projects.','error');return}
  const name=$('projectName').value.trim();if(!name){show('projectStatus','Project name is required.','error');return}
  try{const {error}=await client.from('cr_projects').insert({organization_id:orgId,name,description:$('projectDescription').value.trim(),created_by:user.id});if(error)throw error;$('projectForm').reset();hide('projectStatus');await loadProjects()}
  catch(ex){show('projectStatus','Could not create project: '+errText(ex),'error')}
});
async function loadEvidence(){
  if(!client||!orgId){evidenceItems=[];renderEvidence();return}
  try{const {data,error}=await client.from('cr_evidence').select('id,organization_id,commitment_id,label,url,note,created_by,created_at').eq('organization_id',orgId).order('created_at',{ascending:false});if(error)throw error;evidenceItems=data||[];renderEvidence()}
  catch(e){show('evidenceStatus','Could not load evidence: '+errText(e),'error');$('evidenceList').replaceChildren(safeEl('div','empty','Evidence could not be loaded.'))}
}
function renderEvidence(){
  const root=$('evidenceList');root.replaceChildren();
  if(!evidenceItems.length){root.appendChild(safeEl('div','empty','No evidence linked yet. Add a source or note to a commitment.'));return}
  for(const item of evidenceItems){const row=safeEl('article','module-row'),body=safeEl('div','module-row-main'),title=safeEl('strong','module-title',item.label),commitment=commitments.find(c=>c.id===item.commitment_id);body.append(title,safeEl('div','hint','Commitment · '+(commitment?.title||'Unavailable commitment')),safeEl('p','muted',item.note||'No note'));if(item.url){try{const url=new URL(item.url);if(['https:','http:'].includes(url.protocol)){const link=safeEl('a','module-link',url.hostname+url.pathname);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';body.appendChild(link)}}catch{}}row.appendChild(body);if(canEdit()){const del=safeEl('button','secondary','Delete');del.type='button';del.addEventListener('click',()=>deleteEvidence(item));row.appendChild(del)}root.appendChild(row)}
}
$('evidenceForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!orgId||!canEdit()){show('evidenceStatus','You need an editor or higher role to add evidence.','error');return}
  const commitmentId=$('evidenceCommitmentId').value,label=$('evidenceLabel').value.trim(),url=$('evidenceUrl').value.trim();
  if(!commitmentId||!label){show('evidenceStatus','Choose a commitment and provide an evidence label.','error');return}
  if(url){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))throw new Error('Unsupported URL')}catch{show('evidenceStatus','Enter a valid HTTP or HTTPS URL.','error');return}}
  try{const {error}=await client.from('cr_evidence').insert({organization_id:orgId,commitment_id:commitmentId,label,url,note:$('evidenceNote').value.trim(),created_by:user.id});if(error)throw error;$('evidenceForm').reset();fillCommitmentSelects();hide('evidenceStatus');await loadEvidence()}
  catch(ex){show('evidenceStatus','Could not add evidence: '+errText(ex),'error')}
});
async function deleteEvidence(item){
  if(!confirm('Delete this evidence record?'))return;
  try{const {error}=await client.from('cr_evidence').delete().eq('id',item.id).eq('organization_id',orgId);if(error)throw error;await loadEvidence()}
  catch(e){show('evidenceStatus','Could not delete evidence: '+errText(e),'error')}
}
async function loadReviews(){
  if(!client||!orgId){reviews=[];renderReviews();return}
  try{const {data,error}=await client.from('cr_reviews').select('id,organization_id,commitment_id,status,created_by,reviewed_by,decision_note,created_at,reviewed_at').eq('organization_id',orgId).order('created_at',{ascending:false});if(error)throw error;reviews=data||[];renderReviews()}
  catch(e){show('reviewStatus','Could not load reviews: '+errText(e),'error');$('reviewsList').replaceChildren(safeEl('div','empty','Review queue could not be loaded.'))}
}
function renderReviews(){
  const root=$('reviewsList');root.replaceChildren();
  if(!reviews.length){root.appendChild(safeEl('div','empty','No review requests yet.'));return}
  for(const item of reviews){const row=safeEl('article','module-row'),body=safeEl('div','module-row-main'),commitment=commitments.find(c=>c.id===item.commitment_id);body.append(safeEl('strong','module-title',commitment?.title||'Unavailable commitment'),safeEl('div','meta'),safeEl('p','muted','Status · '+item.status),safeEl('p','muted',item.decision_note||'No decision note'));const meta=body.querySelector('.meta');meta.appendChild(safeEl('span','pill','Requested '+new Date(item.created_at).toLocaleDateString()));row.appendChild(body);
    if(item.status==='pending'&&item.created_by!==user.id&&canEdit()){for(const [status,label] of [['approved','Approve'],['rejected','Reject']]){const button=safeEl('button','secondary',label);button.type='button';button.addEventListener('click',()=>decideReview(item,status));row.appendChild(button)}}
    root.appendChild(row)
  }
}
$('reviewForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!orgId||!canEdit()){show('reviewStatus','You need an editor or higher role to request a review.','error');return}
  const commitmentId=$('reviewCommitmentId').value;if(!commitmentId){show('reviewStatus','Choose a commitment first.','error');return}
  try{const {error}=await client.from('cr_reviews').insert({organization_id:orgId,commitment_id:commitmentId,status:'pending',created_by:user.id,decision_note:''});if(error)throw error;$('reviewForm').reset();fillCommitmentSelects();hide('reviewStatus');await loadReviews()}
  catch(ex){show('reviewStatus','Could not request review: '+errText(ex),'error')}
});
async function decideReview(item,status){
  const note=prompt((status==='approved'?'Approval':'Rejection')+' note (optional):','')||'';
  try{const {error}=await client.from('cr_reviews').update({status,reviewed_by:user.id,reviewed_at:new Date().toISOString(),decision_note:note}).eq('id',item.id).eq('organization_id',orgId).eq('status','pending');if(error)throw error;await loadReviews()}
  catch(e){show('reviewStatus','Could not save review decision: '+errText(e),'error')}
}
async function loadAudit(){
  if(!client||!orgId){auditEvents=[];renderAudit();return}
  try{const {data,error}=await client.from('cr_audit_events').select('id,organization_id,actor_id,entity_type,entity_id,action,metadata,created_at').eq('organization_id',orgId).order('created_at',{ascending:false}).limit(100);if(error)throw error;auditEvents=data||[];renderAudit()}
  catch(e){$('auditList').replaceChildren(safeEl('div','empty','Audit events could not be loaded: '+errText(e)))}
}
function renderAudit(){
  const root=$('auditList');root.replaceChildren();
  if(!auditEvents.length){root.appendChild(safeEl('div','empty','No audit events recorded for this workspace yet.'));return}
  for(const event of auditEvents){const row=safeEl('article','module-row'),body=safeEl('div','module-row-main'),when=new Date(event.created_at).toLocaleString(),metadata=JSON.stringify(event.metadata||{});body.append(safeEl('strong','module-title',event.entity_type+' · '+event.action),safeEl('div','hint',when+' · actor '+(event.actor_id||'system')),safeEl('p','muted','Record ID · '+event.entity_id),safeEl('p','muted',metadata.length>300?metadata.slice(0,297)+'…':metadata));row.appendChild(body);root.appendChild(row)}
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
$('refreshAudit').addEventListener('click',loadAudit);


function dependencyCycle(child,parent){
  const graph=new Map();
  for(const d of dependencies){
    if(!graph.has(d.commitment_id))graph.set(d.commitment_id,[]);
    graph.get(d.commitment_id).push(d.depends_on_commitment_id);
  }
  const stack=[parent],seen=new Set();
  while(stack.length){
    const current=stack.pop();
    if(current===child)return true;
    if(seen.has(current))continue;
    seen.add(current);
    stack.push(...(graph.get(current)||[]));
  }
  return false;
}
async function loadDependencies(){
  if(!client||!orgId){dependencies=[];renderDependencies();return}
  try{
    const {data,error}=await client.from('cr_dependencies').select('id,organization_id,commitment_id,depends_on_commitment_id,created_by,created_at').eq('organization_id',orgId).order('created_at',{ascending:false});
    if(error)throw error;
    dependencies=data||[];
    renderDependencies();
  }catch(e){
    show('dependencyStatus','Could not load dependencies: '+errText(e),'error');
    $('dependenciesList').replaceChildren(safeEl('div','empty','Dependencies could not be loaded.'));
  }
}
function renderDependencies(){
  const root=$('dependenciesList');root.replaceChildren();
  if(!dependencies.length){root.appendChild(safeEl('div','empty','No dependencies recorded for this workspace yet.'));return}
  for(const dependency of dependencies){
    const row=safeEl('article','module-row'),body=safeEl('div','module-row-main');
    const child=commitments.find(c=>c.id===dependency.commitment_id);
    const prerequisite=commitments.find(c=>c.id===dependency.depends_on_commitment_id);
    body.appendChild(safeEl('strong','module-title',(child?.title||'Unavailable commitment')+' depends on '+(prerequisite?.title||'Unavailable prerequisite')));
    body.appendChild(safeEl('div','hint','Both commitments belong to the current workspace.'));
    row.appendChild(body);
    if(canEdit()){
      const remove=safeEl('button','secondary','Remove dependency');
      remove.type='button';
      remove.addEventListener('click',()=>deleteDependency(dependency));
      row.appendChild(remove);
    }
    root.appendChild(row);
  }
}
$('dependencyForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!orgId||!canEdit()){show('dependencyStatus','You need an editor or higher role to manage dependencies.','error');return}
  const child=$('dependencyCommitmentId').value,parent=$('dependsOnCommitmentId').value;
  if(!child||!parent){show('dependencyStatus','Choose both commitments.','error');return}
  if(child===parent){show('dependencyStatus','A commitment cannot depend on itself.','error');return}
  if(dependencies.some(d=>d.commitment_id===child&&d.depends_on_commitment_id===parent)){show('dependencyStatus','That dependency already exists.','error');return}
  if(dependencyCycle(child,parent)){show('dependencyStatus','This dependency would create a circular chain. Choose a different prerequisite.','error');return}
  try{
    const {error}=await client.from('cr_dependencies').insert({organization_id:orgId,commitment_id:child,depends_on_commitment_id:parent,created_by:user.id});
    if(error)throw error;
    $('dependencyForm').reset();
    hide('dependencyStatus');
    await loadDependencies();
  }catch(ex){show('dependencyStatus','Could not add dependency: '+errText(ex),'error')}
});
async function deleteDependency(dependency){
  if(!confirm('Remove this dependency relationship?'))return;
  try{
    const {error}=await client.from('cr_dependencies').delete().eq('id',dependency.id).eq('organization_id',orgId);
    if(error)throw error;
    await loadDependencies();
  }catch(e){show('dependencyStatus','Could not remove dependency: '+errText(e),'error')}
}

async function updateStatus(x,done){if(!canEdit())return;setBusy(true);try{const status=done?'done':'open';const now=new Date().toISOString();const patch={status,completed_at:done?now:null,updated_at:now};const {error}=await client.from('cr_commitments').update(patch).eq('id',x.id).eq('organization_id',orgId);if(error)throw error;await loadCommitments()}catch(e){show('dataStatus','Could not update commitment: '+errText(e),'error');await loadCommitments()}finally{setBusy(false)}}
async function deleteCommitment(x){if(!canEdit()||!confirm('Delete this commitment permanently?'))return;setBusy(true);try{const {error}=await client.from('cr_commitments').delete().eq('id',x.id).eq('organization_id',orgId);if(error)throw error;await loadCommitments()}catch(e){show('dataStatus','Could not delete commitment: '+errText(e),'error')}finally{setBusy(false)}}
$('toggleForm').addEventListener('click',()=>{
  closeCommitForm();
  $('commitFormWrap').classList.add('open');
  $('commitFormTitle').textContent='New commitment';
  $('commitSubmit').textContent='Save commitment';
  $('commitTitle').focus();
});
function closeCommitForm(){
  editingCommitmentId=null;
  $('commitFormWrap').classList.remove('open');
  $('commitForm').reset();
  $('commitFormTitle').textContent='New commitment';
  $('commitSubmit').textContent='Save commitment';
  if($('commitState'))$('commitState').value='open';
  hide('commitStatus');
}
function editCommitment(x){
  if(!canEdit())return;
  editingCommitmentId=x.id;
  $('commitTitle').value=x.title||'';
  $('projectId').value=x.project_id||'';
  $('details').value=x.details||'';
  $('ownerName').value=x.owner_name||'';
  $('counterparty').value=x.counterparty||'';
  $('dueDate').value=x.due_date||'';
  $('priority').value=x.priority||'normal';
  $('confidence').value=x.confidence||'medium';
  $('sourceType').value=x.source_type||'manual';
  $('sourceExcerpt').value=x.source_excerpt||'';
  $('sourceUrl').value=x.source_url||'';
  $('commitState').value=x.status||'open';
  $('commitFormTitle').textContent='Edit commitment';
  $('commitSubmit').textContent='Save changes';
  hide('commitStatus');
  $('commitFormWrap').classList.add('open');
  $('commitTitle').focus();
}
$('cancelCommit').addEventListener('click',closeCommitForm);
$('commitForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!orgId){show('commitStatus','Create or select a workspace first.','error');return}
  if(!canEdit()){show('commitStatus','You need an editor or higher role to change commitments.','error');return}
  const title=$('commitTitle').value.trim();
  if(title.length<2){show('commitStatus','Commitment title must contain at least 2 non-space characters.','error');return}
  const sourceUrl=$('sourceUrl').value.trim();
  if(sourceUrl){
    try{const parsed=new URL(sourceUrl);if(!['https:','http:'].includes(parsed.protocol))throw new Error('Unsupported URL')}
    catch{show('commitStatus','Enter a valid HTTP or HTTPS source URL.','error');return}
  }
  const nextStatus=$('commitState').value;
  const now=new Date().toISOString();
  const fields={
    organization_id:orgId,
    project_id:$('projectId').value||null,
    title,
    details:$('details').value.trim(),
    owner_name:$('ownerName').value.trim(),
    counterparty:$('counterparty').value.trim(),
    due_date:$('dueDate').value||null,
    priority:$('priority').value,
    confidence:$('confidence').value,
    source_type:$('sourceType').value,
    source_excerpt:$('sourceExcerpt').value.trim(),
    source_url:sourceUrl,
    status:nextStatus,
    completed_at:nextStatus==='done'?now:null,
    updated_at:now
  };
  setBusy(true);
  try{
    let error;
    if(editingCommitmentId){
      ({error}=await client.from('cr_commitments').update(fields).eq('id',editingCommitmentId).eq('organization_id',orgId));
    }else{
      ({error}=await client.from('cr_commitments').insert({...fields,created_by:user.id}));
    }
    if(error)throw error;
    closeCommitForm();
    await loadCommitments();
    await loadDependencies();
  }catch(ex){show('commitStatus','Could not save commitment: '+errText(ex),'error')}
  finally{setBusy(false)}
});
$('commitSearch').addEventListener('input',render);
$('commitSort').addEventListener('change',render);

document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()}));
$('signOutBtn').addEventListener('click',async()=>{setBusy(true);try{const {error}=await client.auth.signOut();if(error)throw error;user=null;orgs=[];commitments=[];projects=[];evidenceItems=[];reviews=[];auditEvents=[];dependencies=[];$('workspacePanel').classList.add('hidden');showOnlyAuth()}catch(e){show('globalStatus','Sign out failed: '+errText(e),'error')}finally{setBusy(false)}});

 // Progressive Web App shell. Authentication and API responses are never cached.
let installPromptEvent = null;
const installAppBtn = document.getElementById('installAppBtn');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPromptEvent = event;
  installAppBtn?.classList.remove('hidden');
});
installAppBtn?.addEventListener('click', async () => {
  if (!installPromptEvent) {
    const help = document.getElementById('installHelp');
    if (help) {
      help.textContent = 'Android: open your browser menu and choose Install app or Add to Home screen. iPhone/iPad: open this site in Safari, tap Share, then Add to Home Screen.';
      help.classList.remove('hidden');
    }
    return;
  }
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
