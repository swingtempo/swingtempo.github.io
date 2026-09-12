/* Page wiring: renders content blocks, navigation and the fact drawer. */
(function(){
'use strict';
const C=window.C, F=window.FACTS;
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};

/* ---------------------------------------------------------- cast */
(function(){
  const host=$('#cast'); if(!host)return;
  host.innerHTML=C.cast.map(c=>
    `<div class="c-item rv"><i>${c.w}</i><b>${esc(c.n)}</b><span>${c.r}</span></div>`).join('');
})();

/* ---------------------------------------------------------- environment */
(function(){
  const host=$('#env'); if(!host)return;
  host.innerHTML=C.env.map(n=>
    `<div class="node ${n.c} rv static"><span class="tag">${n.k}</span>
      <h4>${n.h}</h4><p>${n.p}</p></div>`).join('');
})();

/* ---------------------------------------------------------- chain */
(function(){
  const host=$('#chain'); if(!host)return;
  C.chain.forEach((s,i)=>{
    const d=el('div','step rv');
    d.innerHTML=`<button type="button"><span class="idx">${String(i+1).padStart(2,'0')}</span>
      <span class="hd">${s.h}<br><em>${s.s}</em></span></button>
      <div class="panel">${s.b}</div>`;
    d.querySelector('button').onclick=()=>{
      const open=d.classList.contains('open');
      $$('.step',host).forEach(x=>x.classList.remove('open'));
      if(!open){d.classList.add('open');}
    };
    host.appendChild(d);
    if(i===0)d.classList.add('open');
  });
})();

/* ---------------------------------------------------------- timeline */
(function(){
  const bar=$('#tlbar'), det=$('#tldetail'); if(!bar)return;
  let track='incident', day=null;
  function days(){
    const out=[];
    C.tl[track].forEach(e=>{if(!out.includes(e.d))out.push(e.d);});
    return out;
  }
  // Whether the ruler has days still hidden to the right.
  const sc=bar.closest('.tlscroll');
  const cue=()=>{ if(!sc) return;
    const more=bar.scrollLeft+bar.clientWidth<bar.scrollWidth-8;
    const less=bar.scrollLeft>8;
    sc.toggleAttribute('data-more',more);
    sc.toggleAttribute('data-less',less);
  };
  bar.addEventListener('scroll',cue,{passive:true});
  addEventListener('resize',cue);
  // Measure after layout: the first draw can happen while the column is still
  // finding its width, which would leave the cue wrong until the reader scrolled.
  if(window.ResizeObserver) new ResizeObserver(()=>cue()).observe(bar);
  function draw(){
    const ds=days();
    if(!day||!ds.includes(day)) day=ds[ds.length-1];
    bar.innerHTML='';
    ds.forEach(d=>{
      const evs=C.tl[track].filter(e=>e.d===d);
      const b=el('button','tlday'+(d===day?' on':''));
      b.type='button';
      const lead=evs.length?evs[evs.length-1].h:'';
      b.innerHTML=`<div class="d">${d}</div><div class="t">${lead}</div>
        <div class="pip">${evs.map(()=>'<i></i>').join('')}</div>`;
      b.onclick=()=>{day=d;draw();};
      bar.appendChild(b);
    });
    cue();
    det.innerHTML='';
    C.tl[track].filter(e=>e.d===day).forEach(e=>{
      const d=el('div','tlev'+(e.key?' key':''));
      d.innerHTML=`<div><div class="tm">${e.d}${e.t?' '+e.t:''}</div>
        ${e.who?`<span class="who">${esc(e.who)}</span>`:''}</div>
        <div><h4>${e.h}</h4><p>${e.b}</p></div>`;
      det.appendChild(d);
    });
  }
  const sw=el('div','seg static');
  [['Incident','incident'],['Investigation','investigation']].forEach(([n,v],i)=>{
    const b=el('button',i===0?'on':'',n); b.type='button';
    b.onclick=()=>{track=v;day=null;$$('button',sw).forEach(x=>x.classList.remove('on'));b.classList.add('on');draw();};
    sw.appendChild(b);
  });
  bar.parentElement.insertBefore(sw,bar);
  sw.style.marginBottom='12px';
  draw();
})();

/* ---------------------------------------------------------- message anatomy */
(function(){
  const tabs=$('#msgtabs'), host=$('#msg'), exp=$('#msgexp'); if(!tabs)return;
  let cur=0;
  function draw(){
    [...tabs.children].forEach((b,i)=>b.classList.toggle('on',i===cur));
    const m=C.msgs[cur];
    host.innerHTML=m.parts.map((p,i)=>
      `<span class="tk ${p[0]}" data-i="${i}">${esc(p[1])}</span>`).join('');
    exp.innerHTML=m.hint;
    $$('.tk',host).forEach(s=>{
      const show=()=>{const p=m.parts[+s.dataset.i];
        exp.innerHTML=`<b>${esc(p[1].trim())}</b> — ${p[2]}`;};
      s.onmouseenter=show; s.onclick=show; s.onfocus=show; s.tabIndex=0;
    });
  }
  C.msgs.forEach((m,i)=>{const b=el('button','',m.label);b.type='button';
    b.onclick=()=>{cur=i;draw();};tabs.appendChild(b);});
  draw();
})();

/* ---------------------------------------------------------- belief diagram */
(function(){
  const flow=$('#beliefFlow'), cap=$('#beliefCaption'), tg=$('#beliefToggle'); if(!flow)return;
  function draw(mode){
    const boxes=C.belief[mode];
    flow.innerHTML='';
    boxes.forEach((b,i)=>{
      const d=el('div','bx'+(b.dead?' dead':'')+(!b.dead&&i>=3?' hot':''));
      d.innerHTML=`<h5>${b.h}</h5><b>${b.b}</b><p>${b.p}</p>`;
      flow.appendChild(d);
      if(i<boxes.length-1) flow.appendChild(el('div','arrow','→'));
    });
    cap.innerHTML=C.belief.captions[mode];
    $$('button',tg).forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  }
  tg.onclick=e=>{const b=e.target.closest('button'); if(b)draw(b.dataset.mode);};
  draw('believed');
})();

/* ---------------------------------------------------------- table 1 */
(function(){
  const t=$('#table1'); if(!t)return;
  const m=C.table1;
  t.innerHTML=`<thead><tr>${m.head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${
    m.rows.map(r=>`<tr><td>${r[0]}</td><td class="y">yes</td><td class="${r[2]==='yes'?'y':'n'}">${
      r[2]==='yes'?'yes':r[2]}</td></tr>`).join('')}</tbody>`;
})();

/* ---------------------------------------------------------- content-type bars */
(function(){
  const host=$('#contentTypes'); if(!host)return;
  const rows=[
    ['File chunks',1048169],['Uncategorized',81751],['Information or ideas',37597],
    ['Questions or requests',19327],['Results',6753],['Coordination',3854],
    ['Automated logs',3146]];
  const max=rows[0][1];
  host.innerHTML=rows.map(([l,v])=>
    `<div class="brow"><div class="bl">${l}</div>
      <div class="bt"><i data-w="${Math.max(0.6,Math.sqrt(v/max)*100)}"></i></div>
      <div class="bv">${v.toLocaleString('en-US')}</div></div>`).join('');
})();

/* ---------------------------------------------------------- file types */
(function(){
  const host=$('#fileTypes'); if(!host)return;
  const rows=[['Compressed archives (gzip, xz, zlib)','3,684','1,103'],
    ['Python source','213','4'],['JavaScript source','189','27'],
    ['JSON','165','20'],['Plain text','120','0']];
  host.innerHTML=`<table><thead><tr><th>Recognised type</th><th class="n">Decoded</th>
    <th class="n">Corrupted</th></tr></thead><tbody>${
    rows.map(r=>`<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('')}</tbody></table>`;
})();

/* ---------------------------------------------------------- ladder */
(function(){
  const host=$('#ladder'); if(!host)return;
  C.ladder.forEach(r=>{
    const d=el('div','rung');
    d.innerHTML=`<div class="lv">${r.lv}</div>
      <div><h4>${r.h}</h4><p>${r.p}</p><div class="more">${r.more}</div></div>
      <div class="wh">${r.w}</div>`;
    d.onclick=()=>{const on=d.classList.contains('on');
      $$('.rung',host).forEach(x=>x.classList.remove('on')); if(!on)d.classList.add('on');};
    host.appendChild(d);
  });
  host.children[2].classList.add('on');
})();

/* ---------------------------------------------------------- motives */
(function(){
  const host=$('#motives'); if(!host)return;
  host.innerHTML=C.motives.map(m=>
    `<div class="brow${m.hi?' hi':''}"><div class="bl">${m.l}</div>
      <div class="bt"><i data-w="${m.v}"></i></div>
      <div class="bv">${m.v}<span style="color:var(--ink-3)">/100</span></div></div>`).join('');
})();

/* ---------------------------------------------------------- ethics quotes */
(function(){
  const host=$('#ethicsQuotes'); if(!host)return;
  host.innerHTML=C.ethicsQuotes.map(q=>
    `<figure class="rv"><blockquote>${q.q}</blockquote><figcaption>${q.c}</figcaption></figure>`).join('');
})();

/* ---------------------------------------------------------- conventions */
(function(){
  const host=$('#conventions'); if(!host)return;
  host.innerHTML=C.conv.map(c=>
    `<div class="cv rv"><div class="when">${c.w}</div><h4>${c.h}</h4><p>${c.p}</p>
      <span class="n">${c.n} ${c.u||'entries'}</span></div>`).join('');
})();

/* ---------------------------------------------------------- keys table */
(function(){
  const host=$('#keysTable'); if(!host)return;
  host.innerHTML=`<table><thead><tr><th>Identity</th><th>Key fingerprint</th>
    <th>First seen, 13 Jul</th><th class="n">Signed</th></tr></thead><tbody>${
    C.keys.map(k=>`<tr data-f="signing2"><td>${k[0]}</td><td class="m">${k[1]}</td>
      <td class="m">${k[2]}</td><td class="n">${k[3]}</td></tr>`).join('')}</tbody></table>`;
})();

/* ---------------------------------------------------------- spoof generations + terminal */
(function(){
  const host=$('#gens'); if(!host)return;
  host.innerHTML=C.gens.map(g=>
    `<div class="gen rv"><div class="g">${g.g}</div><h4>${g.h}</h4><p>${g.p}</p>
      <div class="who">${g.w}</div><div class="gap">${g.gap}</div></div>`).join('');

  const tabs=$('#termTabs'), body=$('#termBody'), title=$('#termTitle');
  let cur=0;
  function draw(){
    body.innerHTML=C.terms[cur].body;
    title.textContent=C.terms[cur].t;
    [...tabs.children].forEach((b,i)=>b.classList.toggle('on',i===cur));
  }
  C.terms.forEach((t,i)=>{const b=el('button','','gen '+(i+1));b.type='button';
    b.onclick=()=>{cur=i;draw();};tabs.appendChild(b);});
  draw();
})();

/* ---------------------------------------------------------- projects */
(function(){
  const host=$('#projects'); if(!host)return;
  host.innerHTML=C.projects.map(p=>
    `<div class="pcard rv"><h4>${p.h}</h4><p>${p.p}</p>
      <div class="status ${p.s}"><b>${p.sl}</b>${p.sb}</div></div>`).join('');
})();

/* ---------------------------------------------------------- questions */
(function(){
  const host=$('#questions'); if(!host)return;
  C.questions.forEach((q,i)=>{
    const d=el('div','q rv');
    d.innerHTML=`<button type="button"><span class="qn">Q${i+1}</span><span>${q.q}</span></button>
      <div class="a"><div class="verdict">METR’s answer — ${q.v}</div>${q.a}</div>`;
    d.querySelector('button').onclick=()=>d.classList.toggle('open');
    host.appendChild(d);
  });
  host.children[4].classList.add('open');
})();

/* ---------------------------------------------------------- glossary */
(function(){
  const host=$('#glossary'); if(!host)return;
  host.innerHTML=C.gloss.map(([t,d])=>
    `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('');
})();

/* ---------------------------------------------------------- numbers table */
(function(){
  const host=$('#numbersTable'); if(!host)return;
  host.innerHTML=`<table><thead><tr><th>Figure</th><th>Value</th><th>Where it comes from</th>
    </tr></thead><tbody>${C.numbers.map(r=>
    `<tr data-f="${r[2]}"><td>${r[0]}</td><td class="n" style="text-align:left">${r[1]}</td>
      <td class="m">${r[3]==='derived'?'derived on this page':(F[r[2]]?esc(F[r[2]].srcname):'METR post')}</td></tr>`).join('')}</tbody></table>`;
})();

/* ---------------------------------------------------------- funnel + charts */
window.addEventListener('DOMContentLoaded',()=>{
  const CH=window.CHARTS;
  const go=()=>{
    if($('#boardField')) CH.boardField($('#boardField'));
    if($('#wsChart')) CH.workstreamChart($('#wsChart'));
    if($('#atChart')) CH.lifelines($('#atChart'));
    if($('#rampChart')) CH.rampChart($('#rampChart'));
    if($('#hfChart')) CH.hfChart($('#hfChart'));
    if($('#purposeChart')) CH.purposeChart($('#purposeChart'));
    if($('#tsChart')) CH.tsChart($('#tsChart'));
    if($('#funnel')) CH.funnel($('#funnel'));
    if(CH.initFlagFlow) CH.initFlagFlow();
    if(CH.initFlagGrid) CH.initFlagGrid();
  };
  try{go();}catch(e){console.error(e);}
  initNav(); initFacts(); initReveal(); initPaint(); initBars(); initTicker();
});

/* ---------------------------------------------------------- nav */
function initNav(){
  const secs=$$('section[data-title]'), toc=$('#toc'), prog=$('#progress');
  toc.innerHTML=secs.map(s=>`<li><a href="#${s.id}">${s.dataset.title}</a></li>`).join('');
  const links=$$('#toc a');
  const io=new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){
      const i=secs.indexOf(e.target);
      links.forEach((a,j)=>a.classList.toggle('on',j===i));
      const cur=$('#ticker'); if(cur){$('#tickerText').innerHTML=
        `<b>${String(i+1).padStart(2,'0')} / ${String(secs.length).padStart(2,'0')}</b> &nbsp; ${e.target.dataset.title}`;}
    }});
  },{rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(s=>io.observe(s));
  const spine=(h)=>document.documentElement.style.setProperty('--spine',
    (h.scrollTop/(h.scrollHeight-innerHeight)*100).toFixed(2)+'%');
  addEventListener('scroll',()=>{
    const h=document.documentElement,p=h.scrollTop/(h.scrollHeight-innerHeight)*100;
    prog.style.width=p+'%';spine(h);
  },{passive:true});
}

/* ---------------------------------------------------------- facts drawer */
function initFacts(){
  const drawer=$('#drawer'), body=$('#drawerBody');
  const order=[];                        // ids as visited, for prev/next
  const nw=t=>String(t).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
    .replace(/[\u2013\u2014]/g,' ').replace(/\u2026/g,' ').replace(/[*_`]/g,'')
    .replace(/\s+/g,' ').trim().toLowerCase();
  function phraseTier(phrase,f){
    if(!phrase||f.kind==='derived'||!f.quote)return '';
    const p=nw(phrase), q=nw(f.quote);
    return (q.includes(p)||p.includes(q))?'own':'short';
  }
  function nav(f,id){
    const i=order.indexOf(id);
    const bar=el('div','src dnav');
    // The ledger id sits with the controls, so the row a reader can page through
    // is the same row the drawer is showing.
    bar.innerHTML=`<span class="fact-id">#${esc(id)}</span>
      <span class="grow"></span>
      <button class="chip" type="button" data-nav="prev" ${i<1?'disabled':''}>&larr; prev</button>
      <button class="chip" type="button" data-nav="next" ${i<0||i>=order.length-1?'disabled':''}>next &rarr;</button>
      <a class="arrow" href="${f.src}" target="_blank" rel="noopener">open the source &uarr;</a>`;
    bar.querySelector('[data-nav=prev]').onclick=()=>{if(i>0)open(order[i-1]);};
    bar.querySelector('[data-nav=next]').onclick=()=>{if(i>=0&&i<order.length-1)open(order[i+1]);};
    body.appendChild(bar);
  }
  function open(id, phrase){
    const f=F[id]; if(!f)return;
    if(!order.includes(id))order.push(id);
    body.innerHTML='';
    // The provenance line states the tier; the source travels in the header chip
    // and the ledger id travels with the controls at the foot of the drawer.
    const kind=el('div','kind');
    kind.innerHTML=`<span>${f.kind==='derived'?'Derived on this page':
      f.kind==='table'?'From METR’s table':f.quote?'Quoted, unchanged':'Ledger note, no quote'}</span>`;
    body.appendChild(kind);
    const chip=$('#drawerSrc');
    chip.hidden=false;chip.textContent=f.srcname;
    chip.className='src-chip '+(/openai/i.test(f.srcname)?'openai':
      /metr/i.test(f.srcname)?'metr':'other');
    if(f.quote){
      const q=el('div','quotewrap');
      q.innerHTML=`<p>“${esc(f.quote)}”</p>`;
      body.appendChild(q);
    }
    const tier=phraseTier(phrase,f);
    if(tier)body.appendChild(el('p','src',tier==='own'
      ? 'The phrase you clicked is the document&rsquo;s own wording.'
      : 'The phrase you clicked is this page&rsquo;s shorthand; the wording above is the document&rsquo;s, unchanged.'));
    body.appendChild(el('p','lbl','What it means here'));
    body.appendChild(el('p','exp',esc(f.note)));
    body.appendChild(el('p','src',
      `Verified word-for-word against the scraped ${f.srcname} text at build time. Full ledger: FACTS.md.`));
    nav(f,id);
    $('#drawerTitle').textContent=f.label;
    drawer.hidden=false; show();
    requestAnimationFrame(()=>drawer.classList.add('show'));
  }
  const scrim=$('#scrim');
  function show(){scrim.hidden=false;requestAnimationFrame(()=>scrim.classList.add('show'));}
  function close(){drawer.classList.remove('show');scrim.classList.remove('show');
    setTimeout(()=>{drawer.hidden=true;scrim.hidden=true;},240);}
  scrim.onclick=close;
  document.addEventListener('click',e=>{
    const t=e.target.closest('.f,[data-f]');
    if(t&&t.dataset.f){e.preventDefault();open(t.dataset.f,t.textContent);return;}
    if(e.target.closest('#closeDrawer'))close();
  });
  addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  $('#openFacts').onclick=()=>{
    const ids=Object.keys(F);
    body.innerHTML='';
    body.appendChild(el('p','exp',`${ids.length} claims are cited on this page. The drawer shows each one in the wording of the document it came from, with the caveat that belongs beside it, drawn from METR's post or OpenAI's technical report. Every quote in the drawer is checked word-for-word against that document when the site is built, so wording that drifted breaks the build. Where the underlined phrase on the page is a compressed version rather than the document's words, the drawer says so.`));
    body.appendChild(el('div','kind','Ledger'));
    const t=el('div','minitable');
    t.innerHTML=`<table><tbody>${ids.map(id=>
      `<tr><td>${esc(F[id].label)}</td><td class="m" style="width:52px">${F[id].srcname.split(' ')[0]}</td><td class="m" style="width:66px">${F[id].kind}</td></tr>`).join('')}</tbody></table>`;
    body.appendChild(t);
    ids.forEach((id,i)=>{t.querySelectorAll('tr')[i].onclick=()=>open(id);});
    $('#drawerTitle').textContent='Fact ledger';
    drawer.hidden=false; show(); requestAnimationFrame(()=>drawer.classList.add('show'));
  };
}

/* ---------------------------------------------------------- reveal + bars */
/* Entrance motion for two kinds of static surface: the stat row, whose figures
   rise behind a mask, and published chart images and pull quotes, which wipe in
   from the left. Nothing here is interactive, and nothing here rewrites text:
   the DOM always holds the final value, so a gate reading the page reads the
   same thing a reader eventually sees. Automated checks get the settled page. */
function initPaint(){
  if(!('IntersectionObserver' in window)||navigator.webdriver) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return;
    e.target.classList.add(e.target.classList.contains('stats')?'draw':'paint');
    io.unobserve(e.target);
  }),{rootMargin:'0px 0px -10% 0px'});
  $$('.stats, .quotes, .fig-embed').forEach(e=>io.observe(e));
}

function initReveal(){
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),
    {rootMargin:'0px 0px -8% 0px'});
  $$('.rv').forEach((e,i)=>{e.style.transitionDelay=Math.min(i%6,5)*40+'ms';io.observe(e);});
  $$('section').forEach(s=>{
    const kids=$$('.lede p, h3, .aside-box, .figure, .split, .pullq',s);
    kids.forEach(k=>{k.classList.add('rv');io.observe(k);});
  });
  // The observer only fires on intersection changes, so a fast scroll or an anchor
  // jump can leave a block invisible until the reader scrolls back up. A pass on
  // scroll catches anything the observer skipped.
  let raf=0;
  const sweep=()=>{raf=0;
    $$('.rv:not(.in)').forEach(e=>{
      const r=e.getBoundingClientRect();
      // Hidden blocks (closed accordions, inactive tabs) cannot animate an entrance,
      // so mark them revealed now; otherwise they show blank when opened.
      if((r.width===0&&r.height===0)||r.top<innerHeight*0.95){e.classList.add('in');io.unobserve(e);}});
  };
  const queue=()=>{if(!raf)raf=requestAnimationFrame(sweep);};
  addEventListener('scroll',queue,{passive:true});
  addEventListener('click',queue,{passive:true});
  sweep();
}
function initBars(){
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){
      $$('.bt i',e.target).forEach((i,k)=>setTimeout(()=>i.style.width=i.dataset.w+'%',k*45));
      io.unobserve(e.target);}
  }),{threshold:.25});
  $$('.barmatrix').forEach(h=>io.observe(h));
}
function initTicker(){
  const bar=$('#ticker'), hero=$('.masthead');
  const io=new IntersectionObserver(es=>es.forEach(e=>{bar.hidden=e.isIntersecting;}),
    {rootMargin:'-30% 0px 0px 0px'});
  io.observe(hero);
}
})();
