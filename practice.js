/* Practice tab, file 4 of 4: the page. Pick a theme and whether the model has an interaction;
   each question is a worksheet. Numbers are built from tiles (tap or drag), formulas are typed.
   Open the page with ?selftest to check every question type's answer key. */
(function(){
'use strict';
const PR=window.PR,{T,esc,show,THEMES,W}=PR;
const $=id=>document.getElementById(id);
const S={theme:'C',inter:true};
let q=null;
const OPS=[['+','+'],['-','−'],['*','×'],['/','÷'],['(','('],[')',')'],['^2','x²']];

function newQuestion(){const t=PR.pickType(S.theme,S.inter);q=PR.build(t,PR.resolve(t,S.inter));render()}
function render(){
  let h=`<div class="card qcard"><div class="pqh"><span class="tag">${q.type}</span>${esc(q.title)} · ${esc(q.scName)}</div><div class="given">${q.intro}</div>`;
  if(q.order.length)h+='<div class="bank" id="bank"></div>';
  q.parts.forEach((p,i)=>{h+=`<section class="part"><h3>Part ${i+1}. ${p.title}</h3>${p.note?`<p class="cap">${p.note}</p>`:''}<div class="flds">${p.fields.map(f=>W[f.kind].render(f,q)).join('')}</div>
<div class="btns"><button data-act="check" data-p="${i}">Check part ${i+1}</button></div><div class="sub2" id="pm${i}" aria-live="polite"></div></section>`});
  h+='<div class="btns"><button data-act="sol">Show full solution</button><button data-act="new">New question</button></div><div class="sol" id="sol" hidden></div></div>';
  $('prMain').innerHTML=h;
  paintAll();
}

// ---------- tile bank and answer boxes ----------
function paintBank(){
  const b=$('bank');if(!b)return;const act=q.active?q.fieldMap[q.active].short:'';
  const tileBtn=(id,inner,cls='')=>`<button class="tile ${cls}" data-tile="${esc(id)}" draggable="true">${inner}</button>`;
  // Only boxes the active box may use: earlier ones that already hold something.
  const upto=q.active?q.order.indexOf(q.active):0,filled=q.order.slice(0,upto).filter(fid=>(q.tokens[fid]||[]).length);
  b.innerHTML=`<div class="bankh">Adding to: <b>${esc(act)}</b>. Tap a tile, or drag it into a box.</div>
<div class="tiles">${q.tiles.map(t=>tileBtn(t.id,`<span class="tt">${T(t.tex)}</span><span class="tv">${show(t.val)}</span>${t.note?`<span class="tn">${esc(t.note)}</span>`:''}`)).join('')}</div>
<div class="tiles">${OPS.map(([id,l])=>tileBtn(id,l,'op')).join('')}</div>
${filled.length?`<div class="bankh">Your earlier boxes</div><div class="tiles">${filled.map(fid=>{const v=PR.slotValue(q,fid);return tileBtn('@'+fid,`<span class="tt">${esc(q.fieldMap[fid].short)}</span><span class="tv">${isFinite(v)?show(v,Math.min(4,PR.decOf(v,4))):'…'}</span>`,'box')}).join('')}</div>`:''}`;
}
function paintSlot(fid){
  const el=$('s-'+fid);if(!el)return;const toks=q.tokens[fid]||[];
  el.innerHTML=toks.length?T(PR.tokensTex(q,toks)):'<span class="sx sub2">Tap here, then tap tiles</span>';
  el.classList.toggle('active',fid===q.active);el.setAttribute('aria-pressed',fid===q.active);
  const v=PR.slotValue(q,fid);$('v-'+fid).textContent=toks.length?(isFinite(v)?'= '+show(v,Math.min(4,PR.decOf(v,4))):'incomplete'):'';
}
function paintAll(){q.order.forEach(paintSlot);paintBank()}
// A token must be a tile of this question, an operator, or an earlier box. Anything else (e.g. dragged page text) is ignored.
function append(fid,id){
  if(!fid||!q.order.includes(fid))return;
  if(id[0]==='@'){const src=id.slice(1),i=q.order.indexOf(src);if(i<0)return;if(i>=q.order.indexOf(fid)){$('m-'+fid).textContent='You can only use boxes that come before this one.';return}}
  else if(!q.tileMap[id]&&!PR.OPS.has(id))return;
  setTokens(fid,[...(q.tokens[fid]||[]),id]);
}
// Editing a box makes earlier verdicts on it, and on every later box, out of date.
function setTokens(fid,toks){
  q.tokens={...q.tokens,[fid]:toks};q.active=fid;$('m-'+fid).textContent='';
  q.order.slice(q.order.indexOf(fid)).forEach(f=>{const w=$('w-'+f);if(w)delete w.dataset.state});
  q.parts.forEach((p,i)=>{if(p.fields.some(f=>q.order.indexOf(f.fid)>=q.order.indexOf(fid)))$('pm'+i).textContent=''});
  paintAll();
}
function setActive(fid){q.active=fid;paintAll()}

// ---------- checking and the solution ----------
function checkPart(i){
  let ok=0;const fs=q.parts[i].fields;
  fs.forEach(f=>{const r=W[f.kind].grade(f,q,W[f.kind].read(f,q)),w=$('w-'+f.fid);
    if(w)w.dataset.state=r.ok?'ok':'bad';$('m-'+f.fid).textContent=r.ok?'':r.msg;if(r.ok)ok++});
  $('pm'+i).textContent=`${ok} of ${fs.length} correct.`;
}
function solutionHTML(){
  return q.parts.map((p,i)=>`<div class="sub-h">Part ${i+1}. ${p.title}</div>${p.fields.map(f=>`<div class="ans"><span>${f.label}</span> <b>${W[f.kind].answer(f,q)}</b></div>`).join('')}`).join('')+
    `<div class="sub-h">Why</div>${q.steps.map((s,k)=>`<div class="st"><b>Step ${k+1}.</b>${T(s.tex,true)}<div class="why">${s.why}</div></div>`).join('')}`;
}

// ---------- events ----------
function onClick(e){
  const t=e.target.closest('[data-tile]');if(t){append(q.active||q.order[0],t.dataset.tile);return}
  const s=e.target.closest('[data-slot]');if(s){setActive(s.dataset.slot);return}
  const c=e.target.closest('[data-dcell]');if(c){
    const fid=c.dataset.dcell,key=`${c.dataset.row}|${c.dataset.j}`,cur=((q.dummy[fid]||{}).cells||{})[key]||'',next=cur===''?'0':cur==='0'?'1':'';
    const d=q.dummy[fid]||{heads:[],cells:{}};q.dummy={...q.dummy,[fid]:{...d,cells:{...d.cells,[key]:next}}};
    c.textContent=next||'·';c.dataset.v=next;c.setAttribute('aria-label',`${c.dataset.row}, column ${+c.dataset.j+1}: ${next||'empty'}`);return}
  const ins=e.target.closest('[data-ins]');if(ins){insertText($(ins.dataset.for),ins.dataset.ins);return}
  const b=e.target.closest('button[data-act]');if(!b)return;const a=b.dataset.act,fid=b.dataset.fid;
  if(a==='undo')setTokens(fid,(q.tokens[fid]||[]).slice(0,-1));
  if(a==='clr')setTokens(fid,[]);
  if(a==='check')checkPart(+b.dataset.p);
  if(a==='sol'){const d=$('sol');if(!d.innerHTML)d.innerHTML=solutionHTML();d.hidden=!d.hidden;b.textContent=d.hidden?'Show full solution':'Hide full solution'}
  if(a==='new')newQuestion();
}
function insertText(inp,txt){
  const pad=['+','=','~','*'].includes(txt)?` ${txt} `:txt,s=inp.selectionStart??inp.value.length,e=inp.selectionEnd??inp.value.length;
  inp.setRangeText(pad,s,e,'end');
  // On touch screens focusing would pop up the keyboard on every symbol tap.
  if(!matchMedia('(pointer: coarse)').matches)inp.focus();
  inp.dispatchEvent(new Event('input',{bubbles:true}));
}
function onInput(e){
  const fid=e.target.dataset.tin;if(!fid)return;const f=q.fieldMap[fid],p=$('p-'+fid);
  if(p&&W[f.kind].preview)p.innerHTML=W[f.kind].preview(e.target.value,f.M);
}
function onChange(e){
  const s=e.target.closest('[data-dsel]');if(!s)return;const fid=s.dataset.dsel,d=q.dummy[fid]||{heads:[],cells:{}},heads=d.heads.slice();
  heads[+s.dataset.j]=s.value;q.dummy={...q.dummy,[fid]:{...d,heads}};
}
function onKey(e){const s=e.target.closest('[data-slot]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setActive(s.dataset.slot)}}
function onDragStart(e){const t=e.target.closest('[data-tile]');if(t)e.dataTransfer.setData('text/plain',t.dataset.tile)}
function onDragOver(e){const s=e.target.closest('[data-slot]');if(s){e.preventDefault();s.classList.add('over')}}
function onDragLeave(e){const s=e.target.closest('[data-slot]');if(s&&!s.contains(e.relatedTarget))s.classList.remove('over')}
function onDrop(e){const s=e.target.closest('[data-slot]');if(!s)return;e.preventDefault();s.classList.remove('over');
  const id=e.dataTransfer.getData('text/plain');if(id){q.active=s.dataset.slot;append(s.dataset.slot,id)}}

function init(){
  if(!$('prMain'))return;
  $('prThemes').innerHTML=THEMES.map(t=>`<button data-theme="${t.id}" aria-pressed="${t.id===S.theme}"><b>${t.id}</b> ${esc(t.name)}</button>`).join('');
  $('prThemes').addEventListener('click',e=>{const b=e.target.closest('[data-theme]');if(!b)return;S.theme=b.dataset.theme;
    [...$('prThemes').children].forEach(x=>x.setAttribute('aria-pressed',x===b));newQuestion()});
  $('prInter').addEventListener('change',e=>{S.inter=e.target.checked;newQuestion()});
  $('prNew').addEventListener('click',newQuestion);
  const m=$('prMain');m.addEventListener('click',onClick);m.addEventListener('input',onInput);m.addEventListener('change',onChange);m.addEventListener('keydown',onKey);
  m.addEventListener('dragstart',onDragStart);m.addEventListener('dragover',onDragOver);m.addEventListener('dragleave',onDragLeave);m.addEventListener('drop',onDrop);
  newQuestion();
  if(/selftest/.test(location.search))window.__practiceCurrent=()=>q;
  if(/selftest/.test(location.search))setTimeout(()=>{const out=selftest(400);$('prSelftest').hidden=false;$('prSelftest').textContent=out.join('\n')},50);
}

// ---------- self-test: build many questions of every type and grade them through the widgets ----------
function wrongInputs(f,q){
  const c=W[f.kind].canonical(f,q),M=f.M,out=[];
  if(f.kind==='expr')out.push(['-',...(c.length>1?['(',...c,')']:c)]);
  if(f.kind==='dummy'){const R=PR.lvl(M,f.ref);out.push({heads:[R,...c.heads.slice(1)],cells:c.cells});
    const k0=Object.keys(c.cells)[0];out.push({heads:c.heads,cells:{...c.cells,[k0]:c.cells[k0]==='1'?'0':'1'}})}
  if(f.kind==='equation'){const R=PR.lvl(M,f.ref);out.push(c+` + b_${R}*D_${R}`);
    if(f.shape.inter)out.push(PR.termsText(M,PR.eqTerms(M,f.ref,{main:f.shape.main,inter:false})));else out.push(c+` + b_${M.sc.X}:${PR.lvl(M,PR.nonref(M,f.ref)[0])}*${M.sc.X}*D_${PR.lvl(M,PR.nonref(M,f.ref)[0])}`)}
  if(f.kind==='equation'){const X=M.sc.X,rhs=c.split(' = ')[1];
    out.push(c.replace(`b0 + b_${X}*${X}`,`(b0 + b_${X})*${X}`),'garbage = '+rhs,rhs,`${X} = `+rhs)}
  if(f.kind==='rformula'){['inter','add','slopes'].filter(k=>k!==f.key).forEach(k=>out.push(PR.rText(M,k)));out.push(PR.rText(M,f.key)+' - 1')}
  if(f.kind==='coefsum'&&f.want.length>1)out.push(f.want.slice(0,-1).join(' + '));
  if(f.kind==='count')out.push(String(f.ans+1));
  if(f.kind==='yesno')out.push(!f.correct);
  if(f.kind==='rowpick')out.push((f.correct+1)%f.list.length);
  return out;
}
// Other ways of writing a correct answer that must also be accepted.
function rightInputs(f){
  const M=f.M,sc=M&&M.sc,out=[];
  if(f.kind==='equation'){
    const terms=PR.eqTerms(M,f.ref,f.shape),c=PR.termsText(M,terms),rhs=c.split(' = ')[1];
    const withX=terms.filter(t=>t.preds.includes(sc.X)),rest=terms.filter(t=>!t.preds.includes(sc.X));
    const factored=`${sc.Y} = `+[...rest.map(t=>[t.coef,...t.preds].join('*')),`(${withX.map(t=>[t.coef,...t.preds.filter(p=>p!==sc.X)].join('*')).join(' + ')})*${sc.X}`].join(' + ');
    out.push(factored,'ŷ = '+rhs,c.replace(new RegExp(`b_${sc.X}:(\\w+)`,'g'),`b_$1:${sc.X}`),c.replace(/:/g,' : '));
  }
  if(f.kind==='rformula'){const t=PR.rText(M,f.key),[l,r]=t.split(' ~ ');
    out.push(`${l} ~ (${r})`,`${l} ~ 1 + ${r}`,t.replace(new RegExp(`\\b${sc.G}\\b`),`factor(${sc.G})`));
    if(f.key==='slopes')out.push(`${l} ~ ${sc.X}:${sc.G}`,`${l} ~ ${sc.X} + ${sc.G}:${sc.X}`);
    if(f.key==='inter')out.push(`${l} ~ ${sc.G} * ${sc.X}`)}
  if(f.kind==='coefsum'&&f.want.length>1)out.push(f.want.slice().reverse().join('+'));
  return out;
}
function checkQuestion(q){
  if(q.verify){const v=q.verify();if(v)return'verify: '+v}
  const d=PR.degenerate(q);if(d)return'degenerate: '+d;
  const html=[q.intro,...q.parts.map(p=>p.title+(p.note||'')),...q.fields.map(f=>f.label)].join('');if(html.includes('katex-error'))return'KaTeX error in text';
  for(const s of q.steps)try{katex.renderToString(s.tex,{throwOnError:true})}catch(e){return'KaTeX error in step: '+e.message}
  for(const t of q.tiles)try{katex.renderToString(t.tex,{throwOnError:true})}catch(e){return'KaTeX error in tile '+t.id}
  if(new Set(q.tiles.map(t=>t.id)).size!==q.tiles.length||new Set(q.fields.map(f=>f.fid)).size!==q.fields.length)return'duplicate ids';
  q.order.forEach(fid=>{q.tokens[fid]=q.fieldMap[fid].canon});
  for(const f of q.fields){
    if(f.kind==='expr'){for(const tok of f.canon){if(tok[0]==='@'&&q.order.indexOf(tok.slice(1))>=q.order.indexOf(f.fid))return`${f.fid} uses a later box`;
      if(tok[0]!=='@'&&!PR.OPS.has(tok)&&!q.tileMap[tok])return`${f.fid} uses missing tile ${tok}`}}
    const g=W[f.kind].grade(f,q,W[f.kind].canonical(f,q));if(!g.ok)return`canonical answer rejected for ${f.fid}: ${g.msg}`;
    for(const a of rightInputs(f)){const r=W[f.kind].grade(f,q,a);if(!r.ok)return`correct alternative rejected for ${f.fid}: "${a}" (${r.msg})`}
    for(const w of wrongInputs(f,q)){
      const saved=q.tokens[f.fid];if(f.kind==='expr')q.tokens={...q.tokens,[f.fid]:w};
      const r=W[f.kind].grade(f,q,w);q.tokens={...q.tokens,[f.fid]:saved};
      if(r.ok)return`wrong answer accepted for ${f.fid} (${f.kind}): ${JSON.stringify(w).slice(0,80)}`;
    }
  }
  return null;
}
function selftest(N){
  const out=[];
  THEMES.forEach(th=>th.types.forEach(t=>[true,false].filter(i=>PR.fits(t,i)).forEach(inter=>{
    let fail=0,first='';for(let i=0;i<N;i++){try{const e=checkQuestion(PR.build(t,PR.resolve(t,inter)));if(e){fail++;first=first||e}}catch(x){fail++;first=first||String(x)}}
    out.push(`${t.id} ${inter?'with':'without'} interaction: ${N-fail}/${N} passed${first?'  first failure: '+first:''}`);
  })));
  return out;
}
window.__practiceSelftest=selftest;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
