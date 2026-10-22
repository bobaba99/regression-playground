/* Practice tab, file 2 of 4: answer widgets. Each kind can render itself, read the student's
   input, grade it, give the canonical input (used by the self-test) and show the answer. */
(function(){
'use strict';
const PR=window.PR;
const{T,esc,show,num,idTex,termsText,termsTex,eqTerms,dummyStatic,nonref,lvl,rText,gradeEquation,gradeRFormula,gradeCoefSum,evalExpr}=PR;
const $=id=>document.getElementById(id);
const OPTEX={'+':'+','-':'-','*':'\\times','/':'\\div','(':'(',')':')','^2':'^{2}'};

// ---------- tile expressions ----------
function slotValue(q,fid,depth=0){
  if(depth>60)return NaN;
  return evalExpr(q.tokens[fid]||[],id=>id[0]==='@'?slotValue(q,id.slice(1),depth+1):q.tileMap[id]?q.tileMap[id].val:NaN);
}
function tokensTex(q,toks){
  return toks.map(t=>t in OPTEX?OPTEX[t]:t[0]==='@'?(q.fieldMap[t.slice(1)]&&q.fieldMap[t.slice(1)].short?`\\boxed{\\text{${q.fieldMap[t.slice(1)].short.replace(/[{}\\$&#%^~_]/g,' ')}}}`:'?'):q.tileMap[t]?q.tileMap[t].tex:'?').join(' ')
    .replace(/ \^\{2\}/g,'^{2}');
}
// Evaluates a canonical token list, resolving slot references through their own canonical lists.
function canonValue(q,toks,depth=0){
  if(depth>60)return NaN;
  return evalExpr(toks,id=>id[0]==='@'?canonValue(q,q.fieldMap[id.slice(1)].canon,depth+1):q.tileMap[id]?q.tileMap[id].val:NaN);
}

const W={};
W.expr={
  render:f=>`<div class="fld slotw" id="w-${f.fid}"><div class="slab">${f.label}</div>
<div class="slot" id="s-${f.fid}" data-slot="${f.fid}" role="button" tabindex="0" aria-label="Answer box: ${esc(f.short)}"><span class="sx sub2">Tap here, then tap tiles</span></div>
<div class="srow"><span class="sval" id="v-${f.fid}" aria-live="polite"></span><span class="sbtn"><button data-act="undo" data-fid="${f.fid}" aria-label="Remove last tile">⌫</button><button data-act="clr" data-fid="${f.fid}">Clear</button></span></div>
<div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></div>`,
  read:(f,q)=>q.tokens[f.fid]||[],
  grade:(f,q,toks)=>{
    if(!toks.length)return{ok:false,msg:'Build an answer from the tiles.'};
    const v=evalExpr(toks,id=>id[0]==='@'?slotValue(q,id.slice(1)):q.tileMap[id]?q.tileMap[id].val:NaN);
    if(!isFinite(v)){
      // Same expression with every number set to 1: if that works, the shape is fine and the problem is a value.
      if(!isFinite(evalExpr(toks,()=>1)))return{ok:false,msg:'This is not a complete calculation yet. Check the brackets and operators.'};
      if(toks.some(t=>t[0]==='@'&&!isFinite(slotValue(q,t.slice(1)))))return{ok:false,msg:'An earlier box you used is empty or incomplete.'};
      return{ok:false,msg:'This divides by zero.'};
    }
    return Math.abs(v-f.ans)<=f.tol?{ok:true}:{ok:false,msg:`Not yet: this gives ${show(v,Math.min(4,PR.decOf(v,4)))}.`};
  },
  canonical:f=>f.canon,
  answer:(f,q)=>`${T(tokensTex(q,f.canon))} <span class="sub2">= ${show(f.ans,PR.decOf(f.ans,4))}</span>`
};

// ---------- dummy coding table: choose each column's dummy, fill each cell with 0 or 1 ----------
W.dummy={
  render:f=>{const M=f.M,cols=M.k-1;
    return`<div class="fld wide" id="w-${f.fid}"><div class="slab">${f.label}</div><table class="ct dt"><thead><tr><th>Group</th>${
      Array.from({length:cols},(_,j)=>`<th><select data-dsel="${f.fid}" data-j="${j}" aria-label="Dummy for column ${j+1}"><option value="">choose</option>${M.lv.map(l=>`<option value="${esc(l.r)}">D_${esc(l.r)}</option>`).join('')}</select></th>`).join('')}</tr></thead><tbody>${
      M.lv.map(l=>`<tr><td>${esc(l.r)}</td>${Array.from({length:cols},(_,j)=>`<td><button class="dc" data-dcell="${f.fid}" data-row="${esc(l.r)}" data-j="${j}" aria-label="${esc(l.r)}, column ${j+1}">·</button></td>`).join('')}</tr>`).join('')}</tbody></table>
<div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></div>`},
  read:(f,q)=>q.dummy[f.fid]||{heads:[],cells:{}},
  grade:(f,q,st)=>{
    const M=f.M,R=lvl(M,f.ref),need=nonref(M,f.ref).map(g=>lvl(M,g)),heads=Array.from({length:M.k-1},(_,j)=>st.heads[j]||'');
    if(heads.some(h=>!h))return{ok:false,msg:'Choose a dummy for every column.'};
    if(new Set(heads).size!==heads.length)return{ok:false,msg:'Each column needs a different dummy.'};
    if(heads.includes(R))return{ok:false,msg:`${R} is the reference group, so it gets no dummy column. It is the row with every dummy 0.`};
    if(!need.every(n=>heads.includes(n)))return{ok:false,msg:'One of the groups is missing a column.'};
    const wrong=[];
    M.lv.forEach(l=>heads.forEach((h,j)=>{const v=st.cells[`${l.r}|${j}`],want=l.r===h?'1':'0';
      if(v===undefined||v==='')wrong.push(null);else if(v!==want)wrong.push(`row ${l.r}, column D_${h} should be ${want}`)}));
    if(wrong.includes(null))return{ok:false,msg:'Fill every cell with 0 or 1.'};
    return wrong.length?{ok:false,msg:`Check ${wrong.slice(0,2).join('; ')}.`}:{ok:true};
  },
  canonical:f=>{const M=f.M,heads=nonref(M,f.ref).map(g=>lvl(M,g)),cells={};
    M.lv.forEach(l=>heads.forEach((h,j)=>{cells[`${l.r}|${j}`]=l.r===h?'1':'0'}));return{heads,cells}},
  answer:f=>dummyStatic(f.M,f.ref)
};

// ---------- typed formulas with symbol buttons ----------
function textField(f,buttons,preview){
  return`<div class="fld wide" id="w-${f.fid}"><label class="slab" for="t-${f.fid}">${f.label}</label>
<input type="text" id="t-${f.fid}" class="tin" data-tin="${f.fid}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(f.placeholder||'')}">
<div class="symrow">${buttons.map(b=>`<button class="sym" data-ins="${esc(b)}" data-for="t-${f.fid}">${esc(b)}</button>`).join('')}</div>
${preview?`<div class="prev" id="p-${f.fid}"></div>`:''}<div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></div>`;
}
const readText=f=>($('t-'+f.fid)||{value:''}).value;
function eqButtons(M){
  const X=M.sc.X,b=[M.sc.Y,'=','b0','b_'+X,X];
  M.lv.forEach(l=>b.push('D_'+l.r,'b_'+l.r,`b_${X}:${l.r}`));
  return b.concat(['+','*']);
}
// Shows what the student typed as rendered maths, symbol by symbol.
function eqPreview(text,M){
  const known=PR.knownIds(M),Y=M.sc.Y.toLowerCase();
  // One pass over the typed text; only characters a formula can contain survive, so no TeX can be injected.
  const tex=text.replace(/[^A-Za-z0-9_:+=*()·×∗.\s-]/g,'').replace(/([A-Za-z_][A-Za-z0-9_:]*)|([×·∗*])/g,(m,w,op)=>{
    if(op)return' \\cdot ';
    const k=known.get(w.toLowerCase());if(k)return' '+idTex(k.id)+' ';
    return w.toLowerCase()===Y?`\\widehat{${PR.tx(M.sc.Y)}}`:`\\text{${w.replace(/_/g,'\\_')}}`});
  return T(tex);
}
W.equation={
  render:f=>textField({...f,placeholder:`${f.M.sc.Y} = b0 + ...`},eqButtons(f.M),true),
  read:readText,
  grade:(f,q,text)=>gradeEquation(text,f.M,f.ref,f.shape),
  canonical:f=>termsText(f.M,eqTerms(f.M,f.ref,f.shape)),
  answer:f=>`${T(termsTex(f.M,eqTerms(f.M,f.ref,f.shape)))}<div class="sub2"><code>${esc(termsText(f.M,eqTerms(f.M,f.ref,f.shape)))}</code></div>`,
  preview:eqPreview
};
W.rformula={
  render:f=>textField({...f,placeholder:`${f.M.sc.Y} ~ ...`},[f.M.sc.Y,'~',f.M.sc.X,f.M.sc.G,'+','*',':'],false),
  read:readText,
  grade:(f,q,text)=>gradeRFormula(text,f.M,f.key),
  canonical:f=>rText(f.M,f.key),
  answer:f=>`<code>${esc(rText(f.M,f.key))}</code>`
};
W.coefsum={
  render:f=>{const X=f.M.sc.X,b=['b0','b_'+X];f.M.lv.forEach(l=>b.push('b_'+l.r,`b_${X}:${l.r}`));return textField({...f,placeholder:'b0 + ...'},b.concat(['+']),true)},
  read:readText,
  grade:(f,q,text)=>gradeCoefSum(text,f.M,f.want),
  canonical:f=>f.want.join(' + '),
  answer:f=>T(f.want.map(idTex).join(' + ')),
  preview:eqPreview
};
W.count={
  render:f=>`<div class="fld" id="w-${f.fid}"><label class="slab" for="t-${f.fid}">${f.label}</label><input type="text" id="t-${f.fid}" class="tin" inputmode="numeric" autocomplete="off"><div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></div>`,
  read:readText,
  grade:(f,q,text)=>{const v=text.trim();if(!/^\d+$/.test(v))return{ok:false,msg:'Write a whole number.'};return+v===f.ans?{ok:true}:{ok:false,msg:'Not yet. Count the intercept, the slope, and one term per dummy (and per interaction).'}},
  canonical:f=>String(f.ans),
  answer:f=>String(f.ans)
};

// ---------- choices ----------
const choices=(f,type,opts)=>`<fieldset class="fld wide" id="w-${f.fid}"><legend class="slab">${f.label}</legend>${opts.map((o,k)=>`<label class="opt"><input type="${type}" name="c-${f.fid}" value="${k}"><span>${o}</span></label>`).join('')}<div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></fieldset>`;
const picked=f=>[...document.querySelectorAll(`input[name="c-${f.fid}"]:checked`)].map(e=>+e.value);
W.yesno={
  render:f=>choices(f,'radio',['Yes','No']),
  read:f=>{const p=picked(f);return p.length?p[0]===0:null},
  grade:(f,q,v)=>v===null?{ok:false,msg:'Choose yes or no.'}:v===f.correct?{ok:true}:{ok:false,msg:'Not yet. Compare the crossing point with the range of the data.'},
  canonical:f=>f.correct,
  answer:f=>f.correct?'Yes':'No'
};
W.multi={
  render:f=>choices(f,'checkbox',f.options),
  read:picked,
  grade:(f,q,sel)=>sel.length===f.correct.length&&f.correct.every(k=>sel.includes(k))?{ok:true}:{ok:false,msg:`Not yet. ${f.correct.length} of these change.`},
  canonical:f=>f.correct.slice(),
  answer:f=>f.correct.map(k=>f.options[k]).join('; ')
};
W.rowpick={
  render:f=>`<fieldset class="fld wide" id="w-${f.fid}"><legend class="slab">${f.label}</legend><table class="ct"><thead><tr><th></th><th>R prints</th><th>Symbol</th><th>Estimate</th></tr></thead><tbody>${
    f.list.map((c,k)=>`<tr><td><input type="radio" name="c-${f.fid}" value="${k}" aria-label="Row ${esc(PR.rname(f.M,c))}"></td><td><code>${esc(PR.rname(f.M,c))}</code></td><td>${T(PR.sym(f.M,c))}</td><td>${show(c.val)}</td></tr>`).join('')}</tbody></table><div class="fmsg" id="m-${f.fid}" aria-live="polite"></div></fieldset>`,
  read:f=>{const p=picked(f);return p.length?p[0]:null},
  grade:(f,q,v)=>v===null?{ok:false,msg:'Click the row you think is wrong.'}:v===f.correct?{ok:true}:{ok:false,msg:'That row is right. Rebuild each value from the group lines.'},
  canonical:f=>f.correct,
  answer:f=>`<code>${esc(PR.rname(f.M,f.list[f.correct]))}</code>`
};

Object.assign(PR,{W,slotValue,tokensTex,canonValue});
})();
