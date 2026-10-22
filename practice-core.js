/* Practice tab, file 1 of 4: helpers, scenarios, regression models, the parsers for typed
   formulas and equations, and the evaluator for tile-built expressions. Exposes window.PR. */
(function(){
'use strict';
const PR=window.PR=window.PR||{};
const T=(s,d)=>window.katex?katex.renderToString(s,{throwOnError:false,displayMode:!!d}):s;
const rnd=Math.random;
const rint=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const choice=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=rint(0,i);[b[i],b[j]]=[b[j],b[i]]}return b};
const fix=v=>+(+v).toFixed(10);
const grid=(lo,hi,st)=>fix(lo+rint(0,Math.round((hi-lo)/st))*st);
const sgrid=(lo,hi,st)=>fix(grid(lo,hi,st)*(rnd()<.5?-1:1));
const uniq=a=>a.filter((v,i)=>a.indexOf(v)===i);
const cap=s=>s[0].toUpperCase()+s.slice(1);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function decOf(v,max){for(let d=0;d<max;d++)if(Math.abs(v-+v.toFixed(d))<1e-9)return d;return max}
function num(v,d){if(d===undefined)d=decOf(v,4);const s=Math.abs(v).toFixed(d);return(v<0&&+s!==0?'-':'')+s}
const show=(v,d)=>num(v,d).replace('-','−');
const par=(v,d)=>v<0?`(${num(v,d)})`:num(v,d);

// ---------- scenarios: one vignette each, with plausible number ranges ----------
// Group names double as the dummy suffixes students type (D_male, b_age:male).
const SC=[
 {id:'moca',name:'Memory clinic',Y:'moca',X:'age',G:'sex',lv:[{r:'female'},{r:'male'}],
  story:'A memory clinic records each patient\'s MoCA score (<code>moca</code>, out of 30), age in years (<code>age</code>) and sex (<code>sex</code>).',
  xr:[50,85],yb:[15,30],a:[26,45,.5],s:[-.3,-.05,.01],gap:[.5,4,.5],sd:[.02,.15,.01]},
 {id:'hip',name:'Brain imaging',Y:'hippo',X:'age_c',G:'apoe4',lv:[{r:'none'},{r:'one'},{r:'two'}],
  story:'A brain-imaging study measures hippocampal volume in mL (<code>hippo</code>) in older adults with none, one or two copies of the APOE4 gene (<code>apoe4</code>). Age is centered at 70: <code>age_c</code> = age − 70.',
  xr:[-20,15],yb:[2.2,5],a:[3,4.2,.05],s:[-.045,-.01,.005],gap:[.05,.6,.05],sd:[.005,.025,.005]},
 {id:'bdi',name:'Depression trial',Y:'bdi',X:'anxiety',G:'arm',lv:[{r:'placebo'},{r:'CBT'},{r:'SSRI'}],
  story:'A trial randomizes patients to placebo, CBT or an SSRI (<code>arm</code>). It records anxiety at baseline (<code>anxiety</code>) and depression after treatment (<code>bdi</code>).',
  xr:[5,40],yb:[0,63],a:[5,20,.5],s:[.2,.9,.05],gap:[1,8,.5],sd:[.05,.4,.05]},
 {id:'rt',name:'Sleep lab',Y:'rt',X:'sleep',G:'group',lv:[{r:'control'},{r:'insomnia'}],
  story:'A sleep lab records hours slept (<code>sleep</code>) and next-day reaction time in ms (<code>rt</code>) for controls and people with insomnia (<code>group</code>).',
  xr:[4,9],yb:[250,600],a:[450,650,5],s:[-40,-10,1],gap:[10,80,5],sd:[3,20,1]}
];
const lvl=(M,g)=>M.lv[g].r;
function ctx(M){
  const sc=M.sc;
  return`<div class="vig"><p>${sc.story}</p><p class="vars"><span>Outcome <code>${sc.Y}</code></span><span>Continuous <code>${esc(sc.X)}</code></span><span>Groups <code>${sc.G}</code>: ${M.lv.map(l=>l.r).join(', ')}</span></p></div>`;
}

// A model is one straight line per group, on the scenario's grid, inside its plausible range.
function genModel(sc,k,inter){
  for(let t=0;t<4000;t++){
    // Distinct intercept gaps, and with an interaction distinct slope gaps, so no two groups share a line, an intercept or a slope.
    const a0=grid(...sc.a),s0=grid(...sc.s),lines=[{a:a0,s:s0}],gaps=[],sds=[];
    for(let g=1;g<k;g++){
      const gap=sgrid(...sc.gap),sd=inter?sgrid(...sc.sd):0;
      if(gaps.includes(gap)||(inter&&sds.includes(sd)))break;gaps.push(gap);sds.push(sd);
      lines.push({a:fix(a0+gap),s:fix(s0+sd)});
    }
    if(lines.length<k)continue;
    // No flat line and no zero intercept: either would let a shortcut (dropping or negating a term) land on the right answer.
    if(lines.some(L=>L.s===0||L.a===0))continue;
    if(lines.every(L=>sc.xr.every(x=>{const y=L.a+L.s*x;return y>=sc.yb[0]&&y<=sc.yb[1]})))
      return{sc,k,inter,lines,lv:sc.lv.slice(0,k)};
  }
  throw new Error('genModel failed: '+sc.id);
}
const lineAt=(M,g,x)=>M.lines[g].a+M.lines[g].s*x;
const nonref=(M,r)=>M.lv.map((_,g)=>g).filter(g=>g!==r);
const get=(list,key,g)=>list.find(c=>c.key===key&&(g===undefined||c.g===g));
// Coefficients with reference r, after replacing X by (X - c) / z.
function coefs(M,r,c=0,z=1){
  const Ls=M.lines.map(L=>({a:fix(L.a+L.s*c),s:fix(L.s*z)})),R=Ls[r];
  const out=[{key:'b0',val:R.a},{key:'bX',val:R.s}];
  nonref(M,r).forEach(g=>out.push({key:'bG',g,val:fix(Ls[g].a-R.a)}));
  if(M.inter)nonref(M,r).forEach(g=>out.push({key:'bI',g,val:fix(Ls[g].s-R.s)}));
  return out;
}
// Reads a coefficient table the way the equation does: b0 + bX x + bG + bI x.
function predictTable(list,g,x){
  return list.reduce((y,c)=>y+(c.key==='b0'?c.val:c.key==='bX'?c.val*x:c.g!==g?0:c.key==='bG'?c.val:c.val*x),0);
}
function verifyTable(M,list,c=0,z=1){
  for(let g=0;g<M.k;g++)for(const x of [M.sc.xr[0],M.sc.xr[1],(M.sc.xr[0]+M.sc.xr[1])/2,0,M.sc.xr[0]+1.3])
    if(Math.abs(predictTable(list,g,(x-c)/z)-lineAt(M,g,x))>1e-6)return`table mismatch for group ${g} at x=${x}`;
  return null;
}

// ---------- names: one identifier per symbol, typed and rendered the same way ----------
const tx=s=>`\\text{${String(s).replace(/_/g,'\\_')}}`;
function cid(M,c,X){X=X||M.sc.X;if(c.key==='b0')return'b0';if(c.key==='bX')return'b_'+X;const r=lvl(M,c.g);return c.key==='bG'?'b_'+r:`b_${X}:${r}`}
function idTex(id){
  if(id==='b0')return'b_0';
  let m=id.match(/^b_(.+):(.+)$/);if(m)return`b_{${tx(m[1])}\\times ${tx(m[2])}}`;
  m=id.match(/^b_(.+)$/);if(m)return`b_{${tx(m[1])}}`;
  m=id.match(/^D_(.+)$/);if(m)return`D_{${tx(m[1])}}`;
  return tx(id);
}
const sym=(M,c,X)=>idTex(cid(M,c,X));
function rname(M,c,X){X=X||M.sc.X;if(c.key==='b0')return'(Intercept)';if(c.key==='bX')return X;const d=M.sc.G+lvl(M,c.g);return c.key==='bG'?d:X+':'+d}
function tableHTML(M,list,o={}){
  let h='<table class="ct"><thead><tr><th>R prints</th><th>Symbol</th><th>Estimate</th></tr></thead><tbody>';
  list.forEach(c=>{const k=c.key+(c.g??'');h+=`<tr><td><code>${esc(rname(M,c,o.X))}</code></td><td>${T(sym(M,c,o.X))}</td><td>${o.hide&&o.hide.includes(k)?'<b>?</b>':show(c.val)}</td></tr>`});
  return h+'</tbody></table>';
}
// shape: {main, inter}. Predictors are listed continuous first, then the dummy.
function eqTerms(M,ref,shape){
  const X=M.sc.X,t=[{coef:'b0',preds:[]},{coef:'b_'+X,preds:[X]}],gs=nonref(M,ref);
  if(shape.main)gs.forEach(g=>t.push({coef:'b_'+lvl(M,g),preds:['D_'+lvl(M,g)]}));
  if(shape.inter)gs.forEach(g=>t.push({coef:`b_${X}:${lvl(M,g)}`,preds:[X,'D_'+lvl(M,g)]}));
  return t;
}
const termsText=(M,terms)=>`${M.sc.Y} = `+terms.map(t=>[t.coef,...t.preds].join('*')).join(' + ');
function termsTex(M,terms,vals){
  const pr=p=>p.length===0?'':p.length===1?`\\,${idTex(p[0])}`:`\\,(${p.map(idTex).join('\\times ')})`;
  return`\\widehat{${tx(M.sc.Y)}} = `+terms.map((t,i)=>{
    if(!vals)return`${i?'+ ':''}${idTex(t.coef)}${pr(t.preds)}`;
    const v=vals[t.coef];return`${i?(v<0?'- ':'+ '):(v<0?'-':'')}${num(Math.abs(v))}${pr(t.preds)}`;
  }).join(' ');
}
const valsOf=(M,list)=>Object.fromEntries(list.map(c=>[cid(M,c),c.val]));
function dummyStatic(M,ref){
  const gs=nonref(M,ref);
  return`<table class="ct dt"><thead><tr><th>Group</th>${gs.map(g=>`<th>${T(idTex('D_'+lvl(M,g)))}</th>`).join('')}</tr></thead><tbody>${
    M.lv.map((l,i)=>`<tr><td>${l.r}${i===ref?' <span class="sub2">(reference)</span>':''}</td>${gs.map(g=>`<td>${g===i?1:0}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// ---------- typed answers ----------
function knownIds(M){
  const X=M.sc.X,m=new Map(),add=(id,kind,alias)=>m.set((alias||id).toLowerCase(),{id,kind});
  add('b0','coef');add('b0','coef','b_0');add('b_'+X,'coef');add(X,'pred');
  M.lv.forEach(l=>{add('b_'+l.r,'coef');add(`b_${X}:${l.r}`,'coef');add(`b_${X}:${l.r}`,'coef',`b_${l.r}:${X}`);add('D_'+l.r,'pred')});
  return m;
}
const normText=s=>s.replace(/[×·∗]/g,'*').replace(/[−–‒]/g,'-').replace(/\s*:\s*/g,':').replace(/\s+/g,' ').trim();
// Multiplies out brackets: (a + b)*c becomes a*c + b*c. Returns a list of products, or throws a message.
function expandProducts(toks){
  let i=0;
  const atom=()=>{const t=toks[i];if(t==='('){i++;const e=sum();if(toks[i]!==')')throw'A bracket is not closed.';i++;return e}
    if(t===undefined||t==='+'||t==='*'||t===')')throw'There is an empty term or a stray + or *.';i++;return[[t]]};
  const prod=()=>{let terms=atom();while(i<toks.length&&toks[i]!=='+'&&toks[i]!==')'){if(toks[i]==='*')i++;const b=atom();terms=terms.flatMap(x=>b.map(y=>x.concat(y)))}return terms};
  function sum(){let terms=prod();while(toks[i]==='+'){i++;terms=terms.concat(prod())}return terms}
  const out=sum();if(i!==toks.length)throw'Check the brackets.';return out;
}
const lhsOk=(lhs,Y)=>{const s=lhs.toLowerCase().replace(/\s/g,'').replace('ŷ','y').replace(/hat$/,'').replace(/^hat/,'');return s===Y.toLowerCase()||s==='y'};
function parseEquation(text,M){
  const s=normText(text);if(!s)return{error:'Write the equation first.'};
  const sides=s.split('=');if(sides.length>2)return{error:'Use only one = sign.'};
  if(sides.length<2||!lhsOk(sides[0],M.sc.Y))return{error:`Start with ${M.sc.Y} = on the left.`};
  const rhs=sides[1];
  if(/-/.test(rhs))return{error:'Join every term with +. The coefficients carry their own sign.'};
  const known=knownIds(M),toks=rhs.match(/[A-Za-z_][A-Za-z0-9_]*(?::[A-Za-z_][A-Za-z0-9_]*)?|[+*()]|\S/g)||[];
  for(let j=0;j<toks.length;j++){if('+*()'.includes(toks[j]))continue;const k=known.get(toks[j].toLowerCase());
    if(!k)return{error:`I don't recognise "${toks[j]}". Use the buttons to insert symbols.`};toks[j]=k}
  let prods;try{prods=expandProducts(toks)}catch(e){return{error:e}}
  const terms=[];
  for(const p of prods){
    const coefs=p.filter(k=>k.kind==='coef').map(k=>k.id),preds=p.filter(k=>k.kind==='pred').map(k=>k.id);
    if(coefs.length!==1)return{error:`Each term needs exactly one coefficient (a b). After multiplying out any brackets, check ${p.map(k=>k.id).join('*')}.`};
    terms.push({coef:coefs[0],preds});
  }
  return{terms};
}
const predKey=p=>p.map(x=>x.toLowerCase()).sort().join('*');
function gradeEquation(text,M,ref,shape){
  const p=parseEquation(text,M);if(p.error)return{ok:false,msg:p.error};
  const X=M.sc.X,R=lvl(M,ref),want=new Map(eqTerms(M,ref,shape).map(t=>[t.coef,t.preds])),got=new Map();
  for(const t of p.terms){if(got.has(t.coef))return{ok:false,msg:`${t.coef} appears twice.`};got.set(t.coef,t.preds)}
  const msgs=[],what=c=>c==='b0'?'the intercept b0':c==='b_'+X?`the ${X} slope term`:c.includes(':')?`the interaction term for ${c.split(':')[1]}`:`the dummy term for ${c.slice(2)}`;
  for(const[c,pr]of want){
    if(!got.has(c))msgs.push(`Missing ${what(c)}.`);
    else if(predKey(got.get(c))!==predKey(pr))msgs.push(`${c} should multiply ${pr.length?pr.join(' × '):'nothing (it is the intercept)'}.`);
  }
  for(const c of got.keys())if(!want.has(c)){
    if(c==='b_'+R||c===`b_${X}:${R}`)msgs.push(`${R} is the reference group, so it gets no dummy and no term of its own.`);
    else if(c.includes(':'))msgs.push('This model has no interaction terms.');
    else msgs.push(`This model has no dummy term for ${c.slice(2)} on its own.`);
  }
  return msgs.length?{ok:false,msg:uniq(msgs).join(' ')}:{ok:true};
}
// R formulas: '*' expands to both main effects plus their interaction.
const RSHAPE={inter:{main:true,inter:true},add:{main:true,inter:false},slopes:{main:false,inter:true}};
function rText(M,key){const s=M.sc;return key==='inter'?`${s.Y} ~ ${s.X} * ${s.G}`:key==='add'?`${s.Y} ~ ${s.X} + ${s.G}`:`${s.Y} ~ ${s.X} + ${s.X}:${s.G}`}
function parseRFormula(text,M){
  const s=normText(text).replace(/\s/g,''),sides=s.split('~');
  if(sides.length!==2||!sides[0]||!sides[1])return{error:'Write it as outcome ~ predictors.'};
  let rhs=sides[1].replace(/factor\(([^()]*)\)/gi,'$1');
  while(/^\(.*\)$/.test(rhs))rhs=rhs.slice(1,-1);
  if(/-/.test(rhs))return{error:'Write only the terms you want, joined with + (no minus).'};
  if(/[()]/.test(rhs))return{error:'Leave out the brackets.'};
  const names=new Map([[M.sc.X.toLowerCase(),M.sc.X],[M.sc.G.toLowerCase(),M.sc.G]]),terms=new Set();
  for(const t of rhs.split('+')){
    if(!t)return{error:'There is an empty term.'};
    if(t==='1')continue;
    if(t==='0')return{error:'Keep the intercept: leave out the 0.'};
    if(t.includes('*')&&t.includes(':'))return{error:'Use either * or : in a term, not both.'};
    const op=t.includes('*')?'*':t.includes(':')?':':null,fs=op?t.split(op):[t],ok=fs.map(f=>names.get(f.toLowerCase()));
    const bad=fs.find((f,i)=>!ok[i]);if(bad!==undefined)return{error:`I don't recognise "${bad}". Use ${M.sc.X} and ${M.sc.G}.`};
    if(fs.length>2||(fs.length===2&&ok[0]===ok[1]))return{error:`Check the term "${t}".`};
    if(op==='*'){terms.add(ok[0]);terms.add(ok[1])}
    if(op)terms.add(ok.slice().sort().join(':'));else terms.add(ok[0]);
  }
  return{lhs:sides[0],terms};
}
function gradeRFormula(text,M,key){
  const p=parseRFormula(text,M);if(p.error)return{ok:false,msg:p.error};
  const sc=M.sc,sh=RSHAPE[key],ix=[sc.X,sc.G].sort().join(':'),msgs=[];
  if(p.lhs.toLowerCase()!==sc.Y.toLowerCase())msgs.push(`The outcome on the left should be ${sc.Y}.`);
  // In R, X:G on its own fits one shared intercept and a slope per group: the same model as X + X:G.
  if(key==='slopes'&&p.terms.size===1&&p.terms.has(ix))return msgs.length?{ok:false,msg:msgs[0]}:{ok:true};
  if(!p.terms.has(sc.X))msgs.push(`${sc.X} is missing.`);
  if(sh.main&&!p.terms.has(sc.G))msgs.push(`Each group needs its own starting level, so ${sc.G} needs its own term.`);
  if(!sh.main&&p.terms.has(sc.G))msgs.push(`All groups start at the same level, so leave out ${sc.G} on its own.`);
  if(sh.inter&&!p.terms.has(ix))msgs.push(`Each group needs its own ${sc.X} slope, so add the interaction.`);
  if(!sh.inter&&p.terms.has(ix))msgs.push(`All groups share one ${sc.X} slope, so there is no interaction.`);
  return msgs.length?{ok:false,msg:msgs.join(' ')}:{ok:true};
}
// A sum of coefficient symbols, e.g. b0 + b_male.
function gradeCoefSum(text,M,want){
  const s=normText(text);if(!s)return{ok:false,msg:'Write the sum of coefficients.'};
  if(/-/.test(s))return{ok:false,msg:'Join the coefficients with +.'};
  const known=knownIds(M),got=[];
  for(const p of s.split('+').map(x=>x.trim())){
    if(!p)return{ok:false,msg:'There is an empty term.'};
    const k=known.get(p.toLowerCase());if(!k||k.kind!=='coef')return{ok:false,msg:`"${p}" is not a coefficient. Use the b buttons.`};got.push(k.id);
  }
  const msgs=[];want.forEach(c=>{if(!got.includes(c))msgs.push(`Missing ${c}.`)});got.forEach(c=>{if(!want.includes(c))msgs.push(`${c} does not belong here.`)});
  if(uniq(got).length!==got.length)msgs.push('A coefficient appears twice.');
  return msgs.length?{ok:false,msg:msgs.join(' ')}:{ok:true};
}

// ---------- tile expressions: + - * / ( ) and ^2, unary minus allowed ----------
const OPS=new Set(['+','-','*','/','(',')','^2']);
function evalExpr(tokens,val){
  let i=0;const peek=()=>tokens[i];
  const primary=()=>{const t=tokens[i];if(t==='('){i++;const v=expr();if(tokens[i]!==')')throw 0;i++;return v}
    if(t===undefined||OPS.has(t))throw 0;i++;const v=val(t);if(!isFinite(v))throw 0;return v};
  const factor=()=>{if(peek()==='-'){i++;return-factor()}let v=primary();while(peek()==='^2'){i++;v*=v}return v};
  const term=()=>{let v=factor();while(peek()==='*'||peek()==='/'){const o=tokens[i++],w=factor();v=o==='*'?v*w:v/w}return v};
  function expr(){let v=term();while(peek()==='+'||peek()==='-'){const o=tokens[i++],w=term();v=o==='+'?v+w:v-w}return v}
  try{if(!tokens.length)return NaN;const v=expr();return i===tokens.length&&isFinite(v)?v:NaN}catch(e){return NaN}
}

Object.assign(PR,{T,rnd,rint,choice,shuffle,fix,grid,sgrid,uniq,cap,esc,decOf,num,show,par,SC,lvl,ctx,genModel,lineAt,nonref,get,coefs,
  predictTable,verifyTable,tx,cid,idTex,sym,rname,tableHTML,eqTerms,termsText,termsTex,valsOf,dummyStatic,knownIds,parseEquation,gradeEquation,
  RSHAPE,rText,parseRFormula,gradeRFormula,gradeCoefSum,OPS,evalExpr});
})();
