// Inflation tab: effect sizes selected for significance are inflated.
// Simulates many two-group studies (Welch t), keeps the "published" ones, and
// compares the actual vs reported distribution of the observed mean difference.
// Uses globals from the sim tab: $, mulberry, gauss, ib, lg, ticks, ft, f3, fp.
(function(){
  const SLI=[
    ['grp','True effect'],
    ['ifDiff','True mean difference (μ₂ − μ₁)',-1,1.5,0.05,0.2],
    ['ifSd','SD in each group (σ)',0.5,3,0.1,1],
    ['grp','Each study'],
    ['ifN1','n group 1',5,300,1,50],
    ['ifN2','n group 2',5,300,1,75],
    ['grp','How many studies'],
    ['ifK','Studies simulated',500,20000,500,5000]
  ];
  const dec=s=>{const t=String(s);return t.includes('.')?t.split('.')[1].length:0};
  let h='';
  SLI.forEach(s=>{
    if(s[0]==='grp'){h+=`<div class="grp">${s[1]}</div>`;return}
    const[id,label,min,max,step,val]=s;
    h+=`<div class="sl"><label for="${id}">${label}<b id="v_${id}">${val.toFixed(dec(step))}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  });
  $('ifControls').innerHTML=h;

  let seed=630,queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})};
  SLI.forEach(s=>{if(s[0]!=='grp')$(s[0]).addEventListener('input',schedule)});
  ['ifAlpha','ifRule'].forEach(id=>$(id).addEventListener('change',schedule));
  $('ifNew').addEventListener('click',()=>{seed=(seed*7919+13)>>>0;update()});
  $('ifReset').addEventListener('click',()=>{SLI.forEach(s=>{if(s[0]!=='grp')$(s[0]).value=s[5]});$('ifAlpha').value='0.05';$('ifRule').value='dir';seed=630;update()});

  // t distribution helpers (ib, lg come from the sim tab)
  const tUpper=(t,df)=>t<0?1-tUpper(-t,df):0.5*ib(df/(df+t*t),df/2,0.5);
  const tCdf=(t,df)=>1-tUpper(t,df);
  const tPdf=(t,df)=>Math.exp(lg((df+1)/2)-lg(df/2)-0.5*Math.log(df*Math.PI)-((df+1)/2)*Math.log(1+t*t/df));
  function tQ(p,df){let lo=-60,hi=60;for(let i=0;i<120;i++){const m=(lo+hi)/2;if(tCdf(m,df)<p)lo=m;else hi=m}return(lo+hi)/2}

  function read(){
    const P={};
    SLI.forEach(s=>{if(s[0]!=='grp'){P[s[0]]=parseFloat($(s[0]).value);$('v_'+s[0]).textContent=P[s[0]].toFixed(dec(s[4]))}});
    P.alpha=parseFloat($('ifAlpha').value);P.rule=$('ifRule').value;
    return P;
  }

  function simulate(P,sd0){
    const r=mulberry(sd0),{ifDiff:mu,ifSd:sd,ifN1:n1,ifN2:n2,ifK:K,alpha}=P;
    const est=new Float64Array(K),pub=new Uint8Array(K);
    let nSig=0;
    for(let k=0;k<K;k++){
      let s1=0,q1=0,s2=0,q2=0;
      for(let i=0;i<n1;i++){const x=sd*gauss(r);s1+=x;q1+=x*x}
      for(let i=0;i<n2;i++){const y=mu+sd*gauss(r);s2+=y;q2+=y*y}
      const m1=s1/n1,m2=s2/n2,v1=(q1-n1*m1*m1)/(n1-1),v2=(q2-n2*m2*m2)/(n2-1);
      const a=v1/n1,b=v2/n2,se=Math.sqrt(a+b),t=(m2-m1)/se;
      const df=(a+b)*(a+b)/(a*a/(n1-1)+b*b/(n2-1));
      const p=ib(df/(df+t*t),df/2,0.5);
      est[k]=m2-m1;
      const sig=p<alpha;if(sig)nSig++;
      pub[k]=sig&&(P.rule==='two'||est[k]>0)?1:0;
    }
    return{est,pub,nSig};
  }

  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  function five(a){
    const s=Float64Array.from(a).sort(),q=p=>{const i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)};
    const q1=q(.25),q3=q(.75),iqr=q3-q1;
    let wl=s[0],wh=s[s.length-1];
    for(const v of s){if(v>=q1-1.5*iqr){wl=v;break}}
    for(let i=s.length-1;i>=0;i--){if(s[i]<=q3+1.5*iqr){wh=s[i];break}}
    return{q1,med:q(.5),q3,wl,wh};
  }

  function update(){
    const P=read(),S=simulate(P,seed),S0=simulate({...P,ifDiff:0},(seed^0x9e3779b9)>>>0);
    const {ifDiff:mu,ifSd:sd,ifN1:n1,ifN2:n2,alpha}=P;
    const df=n1+n2-2,se=sd*Math.sqrt(1/n1+1/n2),tc=tQ(1-alpha/2,df),crit=tc*se;
    const all=Array.from(S.est),rep=all.filter((_,k)=>S.pub[k]);
    const all0=Array.from(S0.est),rep0=all0.filter((_,k)=>S0.pub[k]);
    const powSim=S.nSig/all.length;
    const powTh=tUpper(tc-mu/se,df)+tCdf(-tc-mu/se,df);
    const mAll=mean(all),mRep=rep.length?mean(rep):NaN;
    const exag=rep.length&&Math.abs(mu)>1e-9?mean(rep.map(Math.abs))/Math.abs(mu):NaN;
    const typeS=rep.length&&Math.abs(mu)>1e-9?rep.filter(v=>Math.sign(v)!==Math.sign(mu)).length/rep.length:NaN;
    const lo=Math.min(-crit*1.6,mu-4.2*se,...(rep.length?[Math.min(...rep)]:[])),hi=Math.max(crit*1.6,mu+4.2*se,...(rep.length?[Math.max(...rep)]:[]));
    const C={P,S,all,rep,all0,rep0,mu,sd,se,crit,df,lo,hi,mAll,mRep,powSim};
    drawStats({P,mu,sd,crit,powSim,powTh,mAll,mRep,exag,typeS,nRep:rep.length,nAll:all.length});
    drawError(C);drawActual(C);drawReported(C);drawPerceived(C);
  }

  const fmt=v=>isFinite(v)?f3(v):'—';
  function drawStats(o){
    const row=(l,v)=>`<div class="row"><span>${l}</span><b>${v}</b></div>`;
    $('ifStats').innerHTML=
      row('True mean difference',fmt(o.mu))+
      row('True Cohen\'s d = difference / σ',fmt(o.mu/o.sd))+
      row(`≈ critical difference (smallest significant, α = ${o.P.alpha})`,fmt(o.crit))+
      row('Power, simulated',`${fmt(o.powSim)} <span class="sub2">(theory ≈ ${fmt(o.powTh)})</span>`)+
      row('Studies published',`${o.nRep} of ${o.nAll}`)+
      row('Mean difference, all studies',fmt(o.mAll))+
      row('Mean difference, published studies',`<span style="color:var(--red)">${fmt(o.mRep)}</span>`)+
      row('Exaggeration: mean |published| / |true|',isFinite(o.exag)?f3(o.exag)+'×':'— (true difference is 0)')+
      row('Published with the wrong sign',isFinite(o.typeS)?(100*o.typeS).toFixed(1)+'%':'—');
  }

  // ---- plotting helpers ----
  const W=640,m={l:88,r:14,t:12,b:36};
  function frame(H,lo,hi,ymax,xlab,boxH){
    const top=m.t+(boxH||0);
    const px=x=>m.l+(x-lo)/(hi-lo)*(W-m.l-m.r),py=y=>H-m.b-Math.min(y,ymax)/ymax*(H-top-m.b);
    let s='';
    ticks(lo,hi,8).forEach(v=>{s+=`<line class="grid" x1="${px(v)}" y1="${m.t}" x2="${px(v)}" y2="${H-m.b}"/><text class="tk" x="${px(v)}" y="${H-m.b+15}" text-anchor="middle">${ft(v)}</text>`});
    s+=`<line x1="${m.l}" y1="${H-m.b}" x2="${W-m.r}" y2="${H-m.b}" stroke="var(--mut)" stroke-width=".8"/>`;
    s+=`<text class="ax" x="${(m.l+W-m.r)/2}" y="${H-4}" text-anchor="middle">${xlab}</text>`;
    return{px,py,s,top};
  }
  const vline=(px,x,y1,y2,col,w,dash)=>`<line x1="${px(x)}" y1="${y1}" x2="${px(x)}" y2="${y2}" stroke="${col}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
  // side: 'L' = text left of the line, 'R' = right of it, undefined = whichever side has room
  const label=(px,x,y,txt,col,lo,hi,side)=>{const left=side?side==='L':(x-lo)/(hi-lo)>0.6;return`<text x="${px(x)+(left?-5:5)}" y="${y}" text-anchor="${left?'end':'start'}" style="fill:${col};font-size:12px">${txt}</text>`};
  function box(px,a,y,h,col,name){
    if(!a.length)return'';
    const b=five(a),mid=y+h/2;
    return`<line x1="${px(b.wl)}" y1="${mid}" x2="${px(b.q1)}" y2="${mid}" stroke="${col}" stroke-width="1.5"/>`+
      `<line x1="${px(b.q3)}" y1="${mid}" x2="${px(b.wh)}" y2="${mid}" stroke="${col}" stroke-width="1.5"/>`+
      `<rect x="${px(b.q1)}" y="${y}" width="${Math.max(px(b.q3)-px(b.q1),1)}" height="${h}" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="1.5"/>`+
      `<line x1="${px(b.med)}" y1="${y}" x2="${px(b.med)}" y2="${y+h}" stroke="${col}" stroke-width="2.5"/>`+
      `<text x="${m.l-4}" y="${mid+4}" text-anchor="end" class="tk">${name}</text>`;
  }
  function bins(lo,hi,n){const w=(hi-lo)/n;return{w,idx:v=>Math.min(n-1,Math.max(0,Math.floor((v-lo)/w)))}}
  const svg=(id,H,s,lab)=>{$(id).innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${lab}">${s}</svg>`};

  function drawError({mu,se,crit,df,lo,hi,powSim}){
    const H=260,dens=(x,c)=>tPdf((x-c)/se,df)/se,ymax=dens(0,0)*1.12;
    const F=frame(H,lo,hi,ymax,'observed mean difference'),{px,py}=F;let s=F.s;
    const area=(a,b,c,col,op)=>{if(b<=a)return'';let d=`M${px(a)},${py(0)}`;for(let x=a;x<=b+1e-12;x+=(b-a)/200)d+=`L${px(x).toFixed(1)},${py(dens(x,c)).toFixed(1)}`;return`<path d="${d}L${px(b)},${py(0)}Z" fill="${col}" opacity="${op}"/>`};
    s+=area(-crit,crit,mu,'var(--amber)',.22);
    s+=area(crit,hi,mu,'var(--blue)',.3)+area(lo,-crit,mu,'var(--blue)',.3);
    s+=area(crit,hi,0,'var(--red)',.5)+area(lo,-crit,0,'var(--red)',.5);
    const curve=(c,col)=>{let d='';for(let i=0;i<=300;i++){const x=lo+(hi-lo)*i/300;d+=(d?'L':'M')+px(x).toFixed(1)+','+py(dens(x,c)).toFixed(1)}return`<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`};
    s+=curve(0,'var(--gray)')+curve(mu,'var(--blue)');
    s+=vline(px,crit,m.t,H-m.b,'var(--ink)',1,'5 3')+vline(px,-crit,m.t,H-m.b,'var(--ink)',1,'5 3');
    svg('ifErr',H,s,'H0 and H1 sampling distributions');
    $('ifErrNote').innerHTML=`Gray = H0 (no difference), blue = H1 (your true difference). Dashed lines = ±${f3(crit)}. <span style="color:var(--red)">Red</span> = α, <span style="color:var(--amber)">amber</span> = β, <span style="color:var(--blue)">blue</span> = power ≈ ${f3(powSim)}.`;
  }

  // histogram as an outline only, so it can sit over filled bars
  function stepPath(px,py,lo,w,c,col){
    let d=`M${px(lo)},${py(0)}`;
    c.forEach((k,i)=>{d+=`L${px(lo+i*w).toFixed(1)},${py(k).toFixed(1)}L${px(lo+(i+1)*w).toFixed(1)},${py(k).toFixed(1)}`});
    return`<path d="${d}L${px(lo+c.length*w)},${py(0)}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
  }
  const barsOf=(px,py,lo,w,c,col,op,H)=>c.map((k,i)=>k?`<rect x="${px(lo+i*w)+.5}" y="${py(k)}" width="${px(w)-px(0)-1}" height="${H-m.b-py(k)}" fill="${col}" opacity="${op}"/>`:'').join('');

  function drawActual({all,rep,all0,mu,crit,lo,hi,mAll,P}){
    const H=340,BX=80,n=70,B=bins(lo,hi,n),cA=new Array(n).fill(0),cR=new Array(n).fill(0),c0=new Array(n).fill(0);
    all.forEach(v=>cA[B.idx(v)]++);rep.forEach(v=>cR[B.idx(v)]++);all0.forEach(v=>c0[B.idx(v)]++);
    const F=frame(H,lo,hi,Math.max(...cA,...c0)*1.08,'observed mean difference',BX),{px,py}=F;let s=F.s;
    s+=box(px,all0,m.t+4,14,'var(--gray)','H0 all')+box(px,all,m.t+26,14,'var(--blue)','H1 all')+box(px,rep,m.t+48,14,'var(--blue)','H1 published');
    s+=barsOf(px,py,lo,B.w,cA,'var(--blue)',.22,H)+barsOf(px,py,lo,B.w,cR,'var(--blue)',.8,H)+stepPath(px,py,lo,B.w,c0,'var(--gray)');
    s+=vline(px,mu,F.top,H-m.b,'var(--green)',2.5)+vline(px,crit,F.top,H-m.b,'var(--ink)',1,'5 3');
    if(P.rule==='two')s+=vline(px,-crit,F.top,H-m.b,'var(--ink)',1,'5 3');
    s+=label(px,mu,F.top+14,`true ${f3(mu)}`,'var(--green)',lo,hi);
    svg('ifAct',H,s,'All studies under H0 and H1, published ones highlighted');
    $('ifActNote').innerHTML=`<span style="color:var(--gray)">Gray outline</span> = the null world (true difference 0). Pale blue = every study in your world; mean ${f3(mAll)}, right on the truth. Dark blue = the ones that get published.`;
  }

  function drawReported({rep,rep0,all0,mu,lo,hi,mRep,P}){
    const H=340,BX=58,n=70,B=bins(lo,hi,n),c=new Array(n).fill(0),c0=new Array(n).fill(0);
    rep.forEach(v=>c[B.idx(v)]++);rep0.forEach(v=>c0[B.idx(v)]++);
    const F=frame(H,lo,hi,Math.max(1,...c,...c0)*1.08,'observed mean difference',BX),{px,py}=F;let s=F.s;
    s+=box(px,rep0,m.t+4,14,'var(--red)','H0 published')+box(px,rep,m.t+26,14,'var(--blue)','H1 published');
    s+=barsOf(px,py,lo,B.w,c,'var(--blue)',.8,H)+barsOf(px,py,lo,B.w,c0,'var(--red)',.55,H);
    s+=vline(px,mu,F.top,H-m.b,'var(--green)',2.5);
    const repRight=!rep.length||mRep>=mu;
    if(rep.length)s+=vline(px,mRep,F.top,H-m.b,'var(--red)',2.5)+label(px,mRep,F.top+14,`published mean ${f3(mRep)}`,'var(--red)',lo,hi,repRight?'R':'L');
    s+=label(px,mu,F.top+14,`true ${f3(mu)}`,'var(--green)',lo,hi,repRight?'L':'R');
    svg('ifRep',H,s,'Published studies only, from H1 and from H0');
    $('ifRepNote').innerHTML=(rep.length?`Blue = published from your world: ${rep.length} of ${P.ifK}.`:'Nothing from your world reached significance.')+
      ` <span style="color:var(--red)">Red</span> = published from the null world (false positives): ${rep0.length} of ${all0.length} = ${(100*rep0.length/all0.length).toFixed(1)}%.`;
  }

  function drawPerceived({mu,se,df,lo,hi,mRep}){
    const H=260,dens=(x,c)=>tPdf((x-c)/se,df)/se,ymax=dens(0,0)*1.12;
    const F=frame(H,lo,hi,ymax,'mean difference'),{px,py}=F;let s=F.s;
    const curve=(c,col,dash)=>{let d='';for(let i=0;i<=300;i++){const x=lo+(hi-lo)*i/300;d+=(d?'L':'M')+px(x).toFixed(1)+','+py(dens(x,c)).toFixed(1)}return`<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5"${dash?' stroke-dasharray="7 4"':''}/>`};
    s+=curve(mu,'var(--green)');
    if(isFinite(mRep))s+=curve(mRep,'var(--red)',1);
    svg('ifPer',H,s,'Perceived versus actual');
    $('ifPerNote').innerHTML=`<span style="color:var(--green)">Solid</span> = reality, centred on ${f3(mu)}. <span style="color:var(--red)">Dashed</span> = what a reader of the literature believes, centred on ${isFinite(mRep)?f3(mRep):'—'}.`;
  }

  update();
})();
