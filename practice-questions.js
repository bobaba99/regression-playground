/* Practice tab, file 3 of 4: question worksheets for theme A (writing the formula) and theme C (switching the reference group). Every question is a
   vignette plus numbered parts. Numeric answers are built from tiles; formulas are typed.
   verify() checks each answer key by an independent route: the true group lines. */
(function(){
'use strict';
const PR=window.PR;
const{T,rint,choice,esc,show,num,fix,lvl,ctx,genModel,nonref,get,coefs,verifyTable,predictTable,cid,idTex,sym,rname,
  tableHTML,eqTerms,termsTex,valsOf,dummyStatic,RSHAPE,rText,tx}=PR;
const st=(tex,why)=>({tex,why});
// An R formula as maths: the ~ must sit outside \\texttt.
const rTex=(M,k)=>rText(M,k).split('~').map(h=>`\\texttt{${h.trim().replace(/_/g,'\\_')}}`).join('\\sim ');

// ---------- token builders for the canonical tile answers ----------
const P=a=>a.length>1?['(',...a,')']:a;
const add=(a,b)=>[...a,'+',...b],sub=(a,b)=>[...a,'-',...P(b)],neg=a=>['-',...P(a)];

// ---------- tiles and fields ----------
const tile=(id,tex,val,note='')=>({id,tex,val,note});
const tk=(pre,key,g)=>[`${pre}.${key}${g??''}`];
const coefTiles=(M,list,pre,note)=>list.map(c=>tile(`${pre}.${c.key}${c.g??''}`,sym(M,c),c.val,note||''));
const ex=(fid,label,ans,canon,short)=>({fid,kind:'expr',label,ans,canon,short:short||fid,tol:1e-6*Math.max(1,Math.abs(ans))});
const coefLabel=(M,c,X)=>`${T(sym(M,c,X))} <code>${esc(rname(M,c,X))}</code>`;
const nTerms=(M,sh)=>2+(sh.main?M.k-1:0)+(sh.inter?M.k-1:0);
const partDummy=(M,ref,fid='d',title='Dummy coding')=>({title,
  note:`R makes one 0/1 column for every group except the reference (${lvl(M,ref)}). Pick each column's dummy, then fill in every cell.`,
  fields:[{fid,kind:'dummy',M,ref,label:`Dummy coding with ${lvl(M,ref)} as the reference`}]});
const partEq=(M,ref,sh,title,fid='e')=>({title,note:'Use the buttons to insert symbols. Join terms with +, and use * for "times".',
  fields:[{fid,kind:'equation',M,ref,shape:sh,label:'Equation'}]});
const dummyStep=(M,r)=>st(nonref(M,r).map(g=>`${idTex('D_'+lvl(M,g))} = 1\\text{ for ${lvl(M,g)}, else }0`).join(',\\quad '),
  `${lvl(M,r)} is the reference: its row has every dummy at 0. With ${M.k} groups R makes ${M.k-1} dummy variable${M.k>2?'s':''}.`);
const eqStep=(M,r,sh)=>st(termsTex(M,eqTerms(M,r,sh)),`Intercept and ${M.sc.X} slope${sh.main?', plus one b × D term per non-reference group (its gap in starting level from the reference)':''}${sh.inter?`, plus one b × (${M.sc.X} × D) term per non-reference group (its difference in slope from the reference)`:''}.`);
const countStep=(M,sh)=>st(`2${sh.main?` + ${M.k-1}`:''}${sh.inter?` + ${M.k-1}`:''} = ${nTerms(M,sh)}`,'Count the b symbols in the equation.');
// Each group's own line, built from a coefficient table whose tiles use prefix pre.
function lineCanon(M,pre,ref,g){
  return{a:g===ref?tk(pre,'b0'):add(tk(pre,'b0'),tk(pre,'bG',g)),s:g===ref||!M.inter?tk(pre,'bX'):add(tk(pre,'bX'),tk(pre,'bI',g))};
}
function partLines(M,pre,ref,title,note){
  const fields=[];M.lv.forEach((l,g)=>{const c=lineCanon(M,pre,ref,g);
    fields.push(ex(`La${g}`,`${l.r}: intercept`,M.lines[g].a,c.a,`${l.r} intercept`),ex(`Ls${g}`,`${l.r}: slope`,M.lines[g].s,c.s,`${l.r} slope`))});
  return{title,note:note||`Each group's line is ${T(`\\widehat{${tx(M.sc.Y)}} = \\text{intercept} + \\text{slope}\\times ${tx(M.sc.X)}`)}. Plug that group's dummies (0 or 1) into the equation.`,fields};
}
const linesStep=(M,list,ref)=>st(M.lv.map((l,g)=>`\\text{${l.r}}: ${num(M.lines[g].a)} ${M.lines[g].s<0?'-':'+'} ${num(Math.abs(M.lines[g].s))}\\,${tx(M.sc.X)}`).join(',\\quad '),
  `Set the dummies for each group. The reference group keeps only b0 and the ${M.sc.X} slope; every other group adds its own terms.`);
const linesOk=(M,fs)=>M.lv.every((_,g)=>{const a=fs.find(f=>f.fid==='La'+g),s=fs.find(f=>f.fid==='Ls'+g);return Math.abs(a.ans-M.lines[g].a)<1e-6&&Math.abs(s.ans-M.lines[g].s)<1e-6});
const given=(M,list,ref,X)=>`<p>R output with <b>${lvl(M,ref)}</b> as the reference group:</p>${tableHTML(M,list,{X})}`;

// ---------- A. writing the formula ----------
function A1(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),sh=RSHAPE[M.inter?'inter':'add'];
  return{title:'From an R formula to the equation',
    intro:ctx(M)+`<p>You fit <code>${esc(rText(M,M.inter?'inter':'add'))}</code> with <b>${lvl(M,r)}</b> as the reference group.</p>`,
    parts:[partDummy(M,r),partEq(M,r,sh,'Write the fitted equation'),{title:'Count the coefficients',fields:[{fid:'n',kind:'count',label:'How many coefficients does R estimate?',ans:nTerms(M,sh)}]}],
    steps:[dummyStep(M,r),eqStep(M,r,sh),countStep(M,sh)]};
}
const SAY={inter:(sc)=>`each ${sc.G} group can have its own starting level <b>and</b> its own ${esc(sc.X)} slope`,
  add:(sc)=>`each ${sc.G} group can have its own starting level, but all groups share <b>one</b> ${esc(sc.X)} slope`,
  slopes:(sc)=>`all ${sc.G} groups start at <b>the same</b> level when ${esc(sc.X)} = 0, but each group can have its own ${esc(sc.X)} slope`};
function A2(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),v=M.inter?choice(['inter','slopes']):'add',sh=RSHAPE[v];
  return{title:'From a description to a model',
    intro:ctx(M)+`<p>You want a model where ${SAY[v](M.sc)}. Use <b>${lvl(M,r)}</b> as the reference group.</p>`,
    parts:[{title:'Write the R formula',fields:[{fid:'f',kind:'rformula',M,key:v,label:'R formula'}]},partEq(M,r,sh,'Write the fitted equation'),
      {title:'Count the coefficients',fields:[{fid:'n',kind:'count',label:'How many coefficients does R estimate?',ans:nTerms(M,sh)}]}],
    steps:[st(`${rTex(M,v)}`,v==='inter'?'* gives both main effects and the interaction.':v==='add'?'+ adds the group terms without an interaction, so the slope is shared.':`${M.sc.X}:${M.sc.G} gives each group its own slope; leaving out ${M.sc.G} on its own forces the same start at 0.`),eqStep(M,r,sh),countStep(M,sh)]};
}
function A3(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),sh=RSHAPE[M.inter?'inter':'add'],X=M.sc.X,fields=[],steps=[dummyStep(M,r)];
  M.lv.forEach((l,g)=>{
    const a=g===r?['b0']:['b0','b_'+l.r],s=g===r||!M.inter?['b_'+X]:['b_'+X,`b_${X}:${l.r}`];
    fields.push({fid:'a'+g,kind:'coefsum',M,want:a,label:`${l.r}: intercept =`},{fid:'s'+g,kind:'coefsum',M,want:s,label:`${l.r}: slope =`});
    steps.push(st(`\\text{${l.r}}: ${a.map(idTex).join(' + ')},\\quad ${s.map(idTex).join(' + ')}`,g===r?'The reference group has every dummy at 0, so only b0 and the slope remain.':`Set ${'D_'+l.r} = 1 and every other dummy to 0, then collect the terms with and without ${X}.`));
  });
  return{title:"Each group's line, in symbols",intro:ctx(M)+`<p>The model, with <b>${lvl(M,r)}</b> as the reference group:</p>${T(termsTex(M,eqTerms(M,r,sh)),true)}`,
    parts:[partDummy(M,r),{title:"Write each group's intercept and slope",note:'Plug in that group\'s dummies, then write which b symbols are left. Join them with +.',fields}],steps};
}
function A4(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),v=M.inter?choice(['inter','slopes']):'add',sh=RSHAPE[v];
  return{title:'From the equation to R',intro:ctx(M)+`<p>Here is a fitted model:</p>${T(termsTex(M,eqTerms(M,r,sh)),true)}`,
    parts:[{title:'Write the R formula that gives this equation',fields:[{fid:'f',kind:'rformula',M,key:v,label:'R formula'}]},
      partDummy(M,r,'d','Dummy coding (which group has no dummy?)')],
    steps:[st(`${rTex(M,v)}`,sh.main?(sh.inter?'There are dummy terms and X × D terms: that is *.':'There are dummy terms but no X × D terms: that is +.'):'There are X × D terms but no dummy terms on their own: that is X + X:G.'),dummyStep(M,r)]};
}
function A5(o){
  const M=genModel(o.sc,o.k,true),r=rint(0,M.k-1);
  return{title:'Add an interaction',
    intro:ctx(M)+`<p>This model has no interaction (reference <b>${lvl(M,r)}</b>):</p><p><code>${esc(rText(M,'add'))}</code></p>${T(termsTex(M,eqTerms(M,r,RSHAPE.add)),true)}<p>You now think ${esc(M.sc.X)} affects ${M.sc.Y} differently in each ${M.sc.G} group.</p>`,
    parts:[{title:'Write the new R formula',fields:[{fid:'f',kind:'rformula',M,key:'inter',label:'R formula'}]},partEq(M,r,RSHAPE.inter,'Write the new equation'),
      {title:'Count',fields:[{fid:'n',kind:'count',label:'How many new coefficients does the interaction add?',ans:M.k-1}]}],
    steps:[st(`${rTex(M,'inter')}`,'* keeps both main effects and adds the interaction.'),eqStep(M,r,RSHAPE.inter),
      st(`${M.k-1}`,`One new ${M.sc.X} × D term per non-reference group. The old dummy terms now mean the gap at ${M.sc.X} = 0 only.`)]};
}

// ---------- C. switching the reference group ----------
function newCoefsFromLines(M,r2,N){
  return N.map(c=>{const canon=c.key==='b0'?[`@La${r2}`]:c.key==='bX'?[`@Ls${r2}`]:c.key==='bG'?sub([`@La${c.g}`],[`@La${r2}`]):sub([`@Ls${c.g}`],[`@Ls${r2}`]);
    return ex('N'+c.key+(c.g??''),coefLabel(M,c),c.val,canon,'new '+cid(M,c))});
}
function C1(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),r2=choice(nonref(M,r)),O=coefs(M,r),N=coefs(M,r2),sh=RSHAPE[M.inter?'inter':'add'];
  const q={title:'Switch the reference group',tiles:coefTiles(M,O,'o','old'),
    intro:ctx(M)+given(M,O,r)+`<p>The dummy coding and equation behind this output:</p>${dummyStatic(M,r)}${T(termsTex(M,eqTerms(M,r,sh),valsOf(M,O)),true)}<p class="task">Now make <b>${lvl(M,r2)}</b> the reference group.</p>`,
    parts:[partDummy(M,r2,'d',`Recode the dummies for ${lvl(M,r2)} as the reference`),
      partEq(M,r2,sh,'Write the new equation (symbols only)'),
      partLines(M,'o',r,"Write each group's line from the old output",'Switching the reference does not change the model, so every group keeps its line. Build each line from the old coefficients.'),
      {title:'Read off the new coefficients',note:`The new intercept and slope are ${lvl(M,r2)}'s own line. Every other term is a difference from ${lvl(M,r2)}. You can use your line boxes as tiles.`,fields:newCoefsFromLines(M,r2,N)}],
    steps:[dummyStep(M,r2),eqStep(M,r2,sh),linesStep(M,O,r),...switchSteps(M,r2,N)]};
  q.verify=()=>verifyTable(M,N)||(linesOk(M,q.parts[2].fields)?null:'C1 lines');
  // Common shortcuts (copy the old value, or just flip its sign) must not give the right new value.
  q.degenerate=()=>{for(const c of N){if(c.key==='b0'||c.key==='bX'||c.g===r)continue;const old=get(O,c.key,c.g).val;
    if(Math.abs(c.val-old)<1e-9||Math.abs(c.val+old)<1e-9)return'a shortcut would give the right new value'}return null};
  return q;
}
function switchSteps(M,r2,N){
  const X=M.sc.X,R2=lvl(M,r2),out=[st(`b_0^{\\text{new}} = a_{\\text{${R2}}} = ${num(get(N,'b0').val)},\\quad b_{${tx(X)}}^{\\text{new}} = s_{\\text{${R2}}} = ${num(get(N,'bX').val)}`,`${R2}'s own line gives the new intercept and slope.`)];
  nonref(M,r2).forEach(h=>{const H=lvl(M,h);out.push(st(`${idTex('b_'+H)}^{\\text{new}} = a_{\\text{${H}}} - a_{\\text{${R2}}} = ${num(get(N,'bG',h).val)}${M.inter?`,\\quad ${idTex(`b_${X}:${H}`)}^{\\text{new}} = s_{\\text{${H}}} - s_{\\text{${R2}}} = ${num(get(N,'bI',h).val)}`:''}`,
    `Every other group's terms are differences from ${R2}: intercept minus intercept${M.inter?', slope minus slope':''}.`))});
  return out;
}
function C4(o){
  const M=genModel(o.sc,2,true),A=coefs(M,0),B=coefs(M,1),l0=lvl(M,0),l1=lvl(M,1);
  const tiles=[tile('A.b0','b_0',get(A,'b0').val,`table 1`),tile('A.bX',`b_{${tx(M.sc.X)}}`,get(A,'bX').val,'table 1'),tile('B.b0','b_0',get(B,'b0').val,'table 2'),tile('B.bX',`b_{${tx(M.sc.X)}}`,get(B,'bX').val,'table 2')];
  const fields=[ex('g1',`Table 1: ${coefLabel(M,get(A,'bG',1))}`,get(A,'bG',1).val,sub(['B.b0'],['A.b0']),'table 1 group term'),ex('i1',`Table 1: ${coefLabel(M,get(A,'bI',1))}`,get(A,'bI',1).val,sub(['B.bX'],['A.bX']),'table 1 interaction'),
    ex('g0',`Table 2: ${coefLabel(M,get(B,'bG',0))}`,get(B,'bG',0).val,sub(['A.b0'],['B.b0']),'table 2 group term'),ex('i0',`Table 2: ${coefLabel(M,get(B,'bI',0))}`,get(B,'bI',0).val,sub(['A.bX'],['B.bX']),'table 2 interaction')];
  return{title:'Fill the gaps',tiles,intro:ctx(M)+`<p>Two people fit the same model with different reference groups. Some numbers are missing.</p><p>Table 1, reference <b>${l0}</b>:</p>${tableHTML(M,A,{hide:['bG1','bI1']})}<p>Table 2, reference <b>${l1}</b>:</p>${tableHTML(M,B,{hide:['bG0','bI0']})}`,
    parts:[{title:'Fill in the missing values',note:"Each table's intercept and slope are its reference group's own line, so the two tables give you both lines.",fields}],
    steps:[st(`a_{\\text{${l0}}} = ${num(M.lines[0].a)},\\ s_{\\text{${l0}}} = ${num(M.lines[0].s)};\\quad a_{\\text{${l1}}} = ${num(M.lines[1].a)},\\ s_{\\text{${l1}}} = ${num(M.lines[1].s)}`,'Read both lines off the two tables.'),
      st(`${idTex('b_'+l1)} = a_{\\text{${l1}}} - a_{\\text{${l0}}},\\quad ${idTex('b_'+l0)} = a_{\\text{${l0}}} - a_{\\text{${l1}}}`,'Each gap is measured from that table\'s reference group, so the two are opposite in sign. The slope differences work the same way.')],
    verify:()=>verifyTable(M,A)||verifyTable(M,B)};
}
function C5(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),N=coefs(M,r),X=M.sc.X;
  const tiles=[];M.lv.forEach((l,g)=>tiles.push(tile(`L.a${g}`,`a_{\\text{${l.r}}}`,M.lines[g].a,'intercept'),tile(`L.s${g}`,`s_{\\text{${l.r}}}`,M.lines[g].s,'slope')));
  const fields=N.map(c=>ex('N'+c.key+(c.g??''),coefLabel(M,c),c.val,c.key==='b0'?[`L.a${r}`]:c.key==='bX'?[`L.s${r}`]:c.key==='bG'?sub([`L.a${c.g}`],[`L.a${r}`]):sub([`L.s${c.g}`],[`L.s${r}`]),cid(M,c)));
  return{title:'Build the output from group lines',tiles,
    intro:ctx(M)+`<p>Each group's fitted line:</p>${M.lv.map((l,g)=>T(`\\text{${l.r}}: \\widehat{${tx(M.sc.Y)}} = ${num(M.lines[g].a)} ${M.lines[g].s<0?'-':'+'} ${num(Math.abs(M.lines[g].s))}\\,${tx(X)}`,true)).join('')}<p class="task">Write what R prints for <code>${esc(rText(M,M.inter?'inter':'add'))}</code> with <b>${lvl(M,r)}</b> as the reference group.</p>`,
    parts:[partDummy(M,r),{title:'Write the coefficients',note:`The reference group's line gives the intercept and slope. Every other term is a difference from ${lvl(M,r)}.`,fields}],
    steps:[dummyStep(M,r),...switchSteps(M,r,N)],verify:()=>verifyTable(M,N)};
}
function C6(o){
  const M=genModel(o.sc,o.k,o.inter),sc=M.sc,r=rint(0,M.k-1),r2=choice(nonref(M,r)),O=coefs(M,r),N=coefs(M,r2);
  const items=[['The intercept',true],[`The ${sc.X} slope`,M.inter],[`The ${sc.G} coefficients`,true]];
  if(M.inter)items.push(['The interaction coefficients',true]);
  items.push(['The fitted values',false],['R²',false],['The residuals',false],[`The p-value for the ${sc.X} slope`,M.inter],['The overall F test',false]);
  return{title:'What changes when you switch?',intro:ctx(M)+given(M,O,r)+`<p class="task">You refit the same model with <b>${lvl(M,r2)}</b> as the reference group.</p>`,
    parts:[{title:'Which of these change?',fields:[{fid:'m',kind:'multi',label:'Tick all that apply.',options:items.map(i=>i[0]),correct:items.map((it,i)=>it[1]?i:-1).filter(i=>i>=0)}]}],
    steps:[st('\\text{same lines, new labels}','Every group keeps its line, so fitted values, residuals, R² and the overall F stay the same.'),
      st(M.inter?`b_0,\\ b_{${tx(sc.X)}},\\ b_{G},\\ b_{${tx(sc.X)}\\times G}`:'b_0,\\ b_{G}',`The intercept and group terms now describe ${lvl(M,r2)} and gaps from it.${M.inter?` With an interaction the ${sc.X} slope is the reference group's own slope, so it and its p-value change too.`:` Without an interaction every group shares the ${sc.X} slope, so it stays.`}`)],
    verify:()=>{if(get(O,'b0').val===get(N,'b0').val)return'C6 b0';if((get(O,'bX').val!==get(N,'bX').val)!==M.inter)return'C6 slope';
      for(let g=0;g<M.k;g++)if(Math.abs(predictTable(O,g,7)-predictTable(N,g,7))>1e-6)return'C6 fitted';return null}};
}
function C7(o){
  const M=genModel(o.sc,o.k,o.inter),r=rint(0,M.k-1),r2=choice(nonref(M,r)),O=coefs(M,r),N=coefs(M,r2);
  // Each mistake is a wrong calculation, never a value copied from the old output (copies are spotted by matching numbers).
  const kinds=['subInt','negInt'];if(M.inter)kinds.push('subSlope','negSlope');if(M.k===3)kinds.push('reversed');
  const kind=choice(kinds),Wt=N.map(c=>({...c})),ov=(k,g)=>get(O,k,g).val;let bad,canon;
  if(kind==='subInt'){bad=get(Wt,'b0');bad.val=fix(ov('b0')-ov('bG',r2));canon=add(tk('o','b0'),tk('o','bG',r2))}
  if(kind==='negInt'){bad=get(Wt,'bG',r);bad.val=fix(-(ov('b0')+ov('bG',r2)));canon=neg(tk('o','bG',r2))}
  if(kind==='subSlope'){bad=get(Wt,'bX');bad.val=fix(ov('bX')-ov('bI',r2));canon=add(tk('o','bX'),tk('o','bI',r2))}
  if(kind==='negSlope'){bad=get(Wt,'bI',r);bad.val=fix(-(ov('bX')+ov('bI',r2)));canon=neg(tk('o','bI',r2))}
  if(kind==='reversed'){const h=nonref(M,r).find(g=>g!==r2);bad=get(Wt,'bG',h);bad.val=fix(ov('bG',r2)-ov('bG',h));canon=sub(tk('o','bG',h),tk('o','bG',r2))}
  const right=get(N,bad.key,bad.g).val;
  return{title:'Spot the mistake',tiles:coefTiles(M,O,'o','old'),intro:ctx(M)+given(M,O,r)+`<p class="task">A student switched the reference to <b>${lvl(M,r2)}</b> by hand. One row of their output is wrong.</p>`,
    parts:[{title:'Click the wrong row',fields:[{fid:'row',kind:'rowpick',label:'Student\'s output',M,list:Wt,correct:Wt.indexOf(bad)}]},
      {title:'Rebuild that value from the old output',fields:[ex('fix','Correct value',right,canon,'correct value')]}],
    steps:[linesStep(M,O,r),...switchSteps(M,r2,N)],
    // Reject when the wrong number could be found by matching numbers instead of reasoning.
    degenerate:()=>Math.abs(bad.val-right)<1e-9||O.some(c=>Math.abs(c.val-bad.val)<1e-9)||Wt.some(c=>c!==bad&&Math.abs(c.val-bad.val)<1e-9)?'wrong row matches another number':null,
    verify:()=>verifyTable(M,N)||(verifyTable(M,Wt)?null:'C7 corrupted table still fits')};
}

// ---------- registry: themes, and which questions fit the interaction setting ----------
const THEMES=[
  {id:'A',name:'Writing the formula',types:[{id:'A1',gen:A1},{id:'A2',gen:A2},{id:'A3',gen:A3},{id:'A4',gen:A4},{id:'A5',gen:A5,inter:true}]},
  {id:'C',name:'Switching the reference group',types:[{id:'C1',gen:C1,w:4},{id:'C4',gen:C4,inter:true,k:2},{id:'C5',gen:C5},{id:'C6',gen:C6},{id:'C7',gen:C7}]}
];
const fits=(t,inter)=>t.inter===undefined||t.inter===inter;
function pickType(themeId,inter){
  const pool=THEMES.find(t=>t.id===themeId).types.filter(t=>fits(t,inter)).flatMap(t=>Array(t.w||1).fill(t));
  return choice(pool);
}
// The scenario and the number of groups are random; the user only sets the interaction.
function resolve(t,inter){const k=t.k||(PR.rnd()<.5?2:3),pool=PR.SC.filter(s=>s.lv.length>=k);return{sc:choice(pool),k,inter,coin:PR.rnd()<.5}}  // coin: tossed once per question, so retries cannot undo a rebalance

// One rejection rule for every question: a near-zero answer (a sign slip would pass) or a type's own shortcut.
function degenerate(q){
  for(const p of q.parts)for(const f of p.fields)if(f.kind==='expr'&&Math.abs(f.ans)<=1e-9)return'answer is 0';
  return q.degenerate?q.degenerate():null;
}
function build(t,o){
  for(let i=0;i<400;i++){
    const q=t.gen(o);if(degenerate(q))continue;
    q.type=t.id;q.scName=o.sc.name;q.tiles=q.tiles||[];q.fields=q.parts.flatMap(p=>p.fields);
    q.fieldMap=Object.fromEntries(q.fields.map(f=>[f.fid,f]));q.tileMap=Object.fromEntries(q.tiles.map(x=>[x.id,x]));
    q.order=q.fields.filter(f=>f.kind==='expr').map(f=>f.fid);q.tokens={};q.dummy={};q.active=q.order[0]||null;
    return q;
  }
  throw new Error('no usable question for '+t.id);
}
Object.assign(PR,{THEMES,pickType,resolve,build,fits,degenerate});
})();
