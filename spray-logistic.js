/* Logistic regression for the spray-paint tab: maximum-likelihood fit by Newton–Raphson,
   standard errors, Wald and likelihood-ratio tests, McFadden pseudo-R², and preset patterns.
   Exposes window.SPL. The fit is checked against R's glm(family = binomial). */
(function(){
'use strict';
// erfc to near machine precision: power series for small x, continued fraction (Lentz) for large x.
function erfc(x){
  if(x<0)return 2-erfc(-x);
  if(x<2.5){let sum=x,term=x;const x2=x*x;
    for(let n=1;n<300;n++){term*=-x2/n;const t=term/(2*n+1);sum+=t;if(Math.abs(t)<1e-17*Math.abs(sum))break}
    return 1-2/Math.sqrt(Math.PI)*sum}
  let f=x,C=x,D=0;
  for(let n=1;n<500;n++){const a=n/2;D=x+a*D;D=1/D;C=x+a/C;const d=C*D;f*=d;if(Math.abs(d-1)<1e-16)break}
  return Math.exp(-x*x)/(Math.sqrt(Math.PI)*f);
}
const pNormal2=z=>erfc(Math.abs(z)/Math.SQRT2);      // two-sided p for a z statistic
const pChisq1=x=>x<=0?1:erfc(Math.sqrt(x/2));        // upper tail of chi-square with 1 df
const log1pexp=e=>e>35?e:Math.log1p(Math.exp(e));
const prob=(b0,b1,x)=>1/(1+Math.exp(-(b0+b1*x)));

function fit(xs,ys){
  if(!ys.every(y=>y===0||y===1))return{status:'badY',n:xs.length,n1:0};
  const n=xs.length,n1=ys.reduce((a,b)=>a+b,0),n0=n-n1;
  if(n<3)return{status:'few',n,n1};
  if(n1===0||n0===0)return{status:'oneclass',n,n1};
  const m=xs.reduce((a,b)=>a+b,0)/n,xc=xs.map(x=>x-m);
  if(xc.every(v=>Math.abs(v)<1e-9))return{status:'novar',n,n1};
  // Separation: every 0 lies on one side of every 1 (quasi: they meet only at tied X values).
  // Either way the likelihood keeps rising as the slope grows, so there is no finite estimate.
  let max0=-Infinity,min0=Infinity,max1=-Infinity,min1=Infinity;
  xs.forEach((x,i)=>{if(ys[i]){max1=Math.max(max1,x);min1=Math.min(min1,x)}else{max0=Math.max(max0,x);min0=Math.min(min0,x)}});
  if(max0<=min1)return{status:'separated',n,n1,dir:1,lo:max0,hi:min1,quasi:max0===min1};
  if(max1<=min0)return{status:'separated',n,n1,dir:-1,lo:max1,hi:min0,quasi:max1===min0};
  const xmin=Math.min(...xs),xmax=Math.max(...xs);
  // Fit on centred x for stability, then convert back.
  const ll=(a,b)=>xc.reduce((s,x,i)=>{const e=a+b*x;return s-(ys[i]?log1pexp(-e):log1pexp(e))},0);
  const hess=(a,b)=>{let h00=0,h01=0,h11=0;for(let i=0;i<n;i++){const p=1/(1+Math.exp(-(a+b*xc[i]))),w=p*(1-p);h00+=w;h01+=w*xc[i];h11+=w*xc[i]*xc[i]}return[h00,h01,h11]};
  let a=Math.log(n1/n0),b=0,cur=ll(a,b),it=0,conv=false;
  for(;it<100;it++){
    let g0=0,g1=0;for(let i=0;i<n;i++){const r=ys[i]-1/(1+Math.exp(-(a+b*xc[i])));g0+=r;g1+=r*xc[i]}
    const[h00,h01,h11]=hess(a,b),det=h00*h11-h01*h01;if(!(det>0))break;
    const da=(h11*g0-h01*g1)/det,db=(h00*g1-h01*g0)/det;let t=1,na,nb,nl;
    do{na=a+t*da;nb=b+t*db;nl=ll(na,nb);t/=2}while(nl<cur-1e-12&&t>1e-10);   // step-halving keeps the likelihood from falling
    const step=Math.abs(na-a)+Math.abs(nb-b);a=na;b=nb;cur=nl;
    if(step<1e-10*(1+Math.abs(a)+Math.abs(b))){conv=true;it++;break}
  }
  if(Math.abs(b)*(xmax-xmin)<1e-10)b=0;   // a slope that is only rounding noise is exactly flat
  const[h00,h01,h11]=hess(a,b),det=h00*h11-h01*h01;
  if(!conv||!(det>0))return{status:'noconv',n,n1,iter:it};
  const v00=h11/det,v01=-h01/det,v11=h00/det,b1=b,b0=a-b*m;
  const se1=Math.sqrt(v11),se0=Math.sqrt(v00+m*m*v11-2*m*v01);
  const ll0=n1*Math.log(n1/n)+n0*Math.log(n0/n),lr=2*(cur-ll0),z=b1/se1;
  return{status:'ok',n,n1,b0,b1,se0,se1,z,pz:pNormal2(z),ll:cur,ll0,lr,plr:pChisq1(lr),r2:1-cur/ll0,x50:b1===0?null:-b0/b1,xmin,xmax,or10:Math.exp(10*b1),iter:it};
}

// Preset patterns: points are [x, y] with y exactly 0 or 1.
function presets(rnd){
  const u=(a,b)=>a+(b-a)*rnd(),bern=p=>rnd()<p?1:0,lg=v=>1/(1+Math.exp(-v));
  const make=(n,pf)=>Array.from({length:n},()=>{const x=u(2,98);return[x,bern(pf(x))]});
  return{
    'Sharp threshold':()=>make(200,x=>lg((x-50)/4)),
    'Gradual':()=>make(200,x=>lg((x-50)/15)),
    'Decreasing':()=>make(200,x=>lg((55-x)/8)),
    'No relation':()=>make(200,()=>.5),
    'Rare outcome':()=>make(200,x=>lg((x-85)/6)),
    'Middle only':()=>make(200,x=>Math.exp(-(((x-50)/14)**2))),
    'Perfect separation':()=>make(150,x=>x>55?1:0)
  };
}
window.SPL={fit,prob,presets,erfc,pNormal2,pChisq1};
})();
