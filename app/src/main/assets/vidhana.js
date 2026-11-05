/* Renders the Sandhyāvandana vidhāna and the Āśauca guide below the main page.
   Uses the page's own globals: state, store, t, nm, toKn, toTe, translit, TA_VOW, TA_SIGN,
   isDevLetter, scriptFont, sankalpaText, renderSankalpa, renderAll, toast. */
(function(){
  if (typeof VD_STEPS === 'undefined') return;

  /* ---------- Tamil for Vedic text: superscript numbers mark aspirate and voiced stops ---------- */
  const TAV = {'क':['க',''],'ख':['க','²'],'ग':['க','³'],'घ':['க','⁴'],'ङ':['ங',''],
    'च':['ச',''],'छ':['ச','²'],'ज':['ஜ',''],'झ':['ஜ','²'],'ञ':['ஞ',''],
    'ट':['ட',''],'ठ':['ட','²'],'ड':['ட','³'],'ढ':['ட','⁴'],'ण':['ண',''],
    'त':['த',''],'थ':['த','²'],'द':['த','³'],'ध':['த','⁴'],'न':['ந',''],
    'प':['ப',''],'फ':['ப','²'],'ब':['ப','³'],'भ':['ப','⁴'],'म':['ம',''],
    'य':['ய',''],'र':['ர',''],'ल':['ல',''],'ळ':['ள',''],'व':['வ',''],
    'श':['ஶ',''],'ष':['ஷ',''],'स':['ஸ',''],'ह':['ஹ','']};
  function toTaV(s){
    const ch = Array.from(s); let o = '';
    for (let i = 0; i < ch.length; i++){
      const c = ch[i], n = ch[i+1];
      if (TAV[c]){
        let [b, sup] = TAV[c];
        if (c === 'न' && isDevLetter(ch[i-1]) && !(n === '्' && 'तथदध'.includes(ch[i+2] || ''))) b = 'ன';
        o += b;
        if (n === '्'){ o += '்' + sup; i++; }
        else if (n === 'ृ'){ o += '்' + sup + 'ரு'; i++; }
        else if (n === 'ॄ'){ o += '்' + sup + 'ரூ'; i++; }
        else if (TA_SIGN[n]){ o += TA_SIGN[n] + sup; i++; }
        else o += sup;
      } else if (TA_VOW[c]) o += TA_VOW[c];
      else if (c === 'ं' || c === 'ँ') o += 'ம்';
      else if (c === 'ः') o += ':';
      else if (c === 'ऽ') o += "'";
      else o += c;
    }
    return o;
  }

  /* Devanagari mantra in the reader's script */
  function vScript(dev){
    if (state.lang === 'hi') return dev;
    const d = dev.replace(/ॐ/g, 'ओं');
    switch (state.lang){
      case 'kn': return toKn(d);
      case 'te': return toTe(d);
      case 'ta': return toTaV(d);
      default: return translit(d, state.eng === 'iast' ? 'iast' : 'simple');
    }
  }
  const tx = o => (o && (o[state.lang] || o.en)) || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const V = { mode: store.get('vdMode', 'reg'), open: new Set(), openAsh: new Set(), count: 0, target: 108, sig: '', sigA: '' };
  const SESS = ['pratah', 'madhya', 'sayam'];
  const inK = blk => !blk.k || blk.k.includes(state.session);

  /* ---------- styles (the page's Tailwind is precompiled, so new pieces get their own CSS) ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .vd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
  .vd-h{font-weight:600;font-size:1.125rem;line-height:1.4}
  .vd-sub{font-size:.75rem;color:rgb(100 116 139);margin-top:.15rem}
  .dark .vd-sub{color:rgb(148 163 184)}
  .vd-tools{display:grid;gap:.5rem;margin-top:.75rem}
  .vd-link{font-size:.8rem;font-weight:600;color:rgb(180 83 9);padding:.35rem .25rem;background:none;border:0;cursor:pointer}
  .dark .vd-link{color:rgb(252 211 77)}
  .vd-banner{margin-top:.75rem;border-radius:1rem;padding:.75rem .9rem;font-size:.85rem;line-height:1.55;background:rgb(255 241 242);color:rgb(136 19 55);border:1px solid rgb(254 205 211)}
  .dark .vd-banner{background:rgb(244 63 94 / .1);color:rgb(253 164 175);border-color:rgb(244 63 94 / .25)}
  .vd-note{font-size:.75rem;line-height:1.5;color:rgb(100 116 139);margin-top:.6rem}
  .dark .vd-note{color:rgb(148 163 184)}
  .vd-list{margin-top:.5rem}
  .vd-step{border-top:1px solid rgb(231 229 228 / .9)}
  .dark .vd-step{border-color:rgb(30 41 59)}
  .vd-sum{display:flex;align-items:center;gap:.65rem;padding:.8rem .15rem;cursor:pointer;-webkit-user-select:none;user-select:none}
  .vd-sum:focus-visible{outline:2px solid rgb(251 191 36);outline-offset:2px;border-radius:.5rem}
  .vd-num{flex:none;width:1.8rem;height:1.8rem;border-radius:9999px;display:grid;place-items:center;font-size:.75rem;font-weight:600;font-variant-numeric:tabular-nums;background:rgb(254 243 199);color:rgb(180 83 9)}
  .dark .vd-num{background:rgb(245 158 11 / .15);color:rgb(252 211 77)}
  .vd-title{flex:1;min-width:0;font-weight:600;line-height:1.35}
  .vd-chev{flex:none;width:1rem;height:1rem;color:rgb(148 163 184);transition:transform .15s}
  details[open] > .vd-sum .vd-chev{transform:rotate(90deg)}
  .vd-badges{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}
  .vd-b{font-size:.68rem;font-weight:600;line-height:1;padding:.3rem .5rem;border-radius:9999px;white-space:nowrap}
  .vd-b-opt{background:rgb(245 245 244);color:rgb(87 83 78)} .dark .vd-b-opt{background:rgb(30 41 59);color:rgb(203 213 225)}
  .vd-b-late{background:rgb(255 237 213);color:rgb(194 65 12)} .dark .vd-b-late{background:rgb(249 115 22 / .15);color:rgb(253 186 116)}
  .vd-b-do{background:rgb(209 250 229);color:rgb(4 120 87)} .dark .vd-b-do{background:rgb(16 185 129 / .15);color:rgb(110 231 183)}
  .vd-b-mental{background:rgb(224 231 255);color:rgb(67 56 202)} .dark .vd-b-mental{background:rgb(99 102 241 / .18);color:rgb(165 180 252)}
  .vd-b-breath{background:rgb(224 242 254);color:rgb(3 105 161)} .dark .vd-b-breath{background:rgb(14 165 233 / .15);color:rgb(125 211 252)}
  .vd-b-skip{background:rgb(241 245 249);color:rgb(100 116 139)} .dark .vd-b-skip{background:rgb(30 41 59);color:rgb(148 163 184)}
  .vd-skipped .vd-title,.vd-skipped .vd-num{opacity:.5}
  .vd-body{display:grid;gap:.65rem;padding:0 .15rem 1rem 2.45rem}
  .vd-how{font-size:.875rem;line-height:1.6;color:rgb(51 65 85)} .dark .vd-how{color:rgb(203 213 225)}
  .vd-mantra{border-radius:1rem;background:rgb(255 251 235 / .75);border:1px solid rgb(253 230 138 / .6);padding:.8rem 1rem;line-height:2;white-space:pre-line;word-break:break-word;color:rgb(30 41 59)}
  .dark .vd-mantra{background:rgb(245 158 11 / .05);border-color:rgb(251 191 36 / .12);color:rgb(255 251 235 / .92)}
  .vd-mlabel{display:block;font-family:Inter,system-ui,sans-serif;font-size:.68rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;line-height:1.4;color:rgb(180 83 9);margin-bottom:.3rem}
  .dark .vd-mlabel{color:rgb(252 211 77)}
  .vd-mean{font-size:.85rem;line-height:1.6;color:rgb(71 85 105)} .dark .vd-mean{color:rgb(148 163 184)}
  .vd-mean b{color:rgb(51 65 85);font-weight:600} .dark .vd-mean b{color:rgb(226 232 240)}
  .vd-counter{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem}
  .vd-countbtn{flex:1 1 12rem;min-height:4.5rem;border-radius:1rem;border:0;cursor:pointer;background:rgb(245 158 11);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.1rem;font-variant-numeric:tabular-nums;touch-action:manipulation}
  .dark .vd-countbtn{color:rgb(2 6 23)}
  .vd-countbtn:active{transform:scale(.98)}
  .vd-countbtn.vd-done{background:rgb(16 185 129)}
  .vd-cn{font-size:1.75rem;font-weight:700;line-height:1}
  .vd-cl{font-size:.72rem;opacity:.9}
  .vd-ol{display:grid;gap:.45rem;padding-left:1.25rem;margin:.4rem 0 0;list-style:decimal;font-size:.875rem;line-height:1.6;color:rgb(51 65 85)}
  .dark .vd-ol{color:rgb(203 213 225)}
  .vd-ul{list-style:disc}
  .vd-sec{padding:0 .15rem 1rem .4rem;display:grid;gap:.65rem}
  .vd-vstep{display:grid;gap:.5rem;padding:.6rem 0;border-top:1px dashed rgb(231 229 228)}
  .dark .vd-vstep{border-color:rgb(51 65 85)}
  .vd-vstep:first-child{border-top:0}
  .vd-vnum{font-size:.72rem;font-weight:700;color:rgb(180 83 9)} .dark .vd-vnum{color:rgb(252 211 77)}
  `;
  document.head.appendChild(css);

  const CHEV = '<svg class="vd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  const sec = document.createElement('section');
  sec.className = 'card p-4 mt-4';
  sec.id = 'vidhanaCard';
  const secA = document.createElement('section');
  secA.className = 'card p-4 mt-4';
  secA.id = 'ashauchaCard';
  const footer = document.querySelector('footer');
  footer.parentNode.insertBefore(sec, footer);
  footer.parentNode.insertBefore(secA, footer);

  function mantraHTML(text, label, scripted){
    const body = scripted ? text : vScript(text);
    const fs = Math.max(14, state.fs - 1);
    return `<div class="vd-mantra ${scriptFont()}" style="font-size:${fs}px">${label ? `<span class="vd-mlabel">${esc(label)}</span>` : ''}${esc(body)}</div>`;
  }
  const badge = (cls, label) => `<span class="vd-b vd-b-${cls}">${esc(label)}</span>`;

  function stepHTML(s, i){
    const ash = V.mode === 'ash';
    const parts = [];
    let how = tx(s.how);
    if (s.howK && s.howK[state.session]) how += ' ' + tx(s.howK[state.session]);
    parts.push(`<p class="vd-how">${esc(how)}</p>`);
    for (const b of s.m){
      if (!inK(b)) continue;
      const label = b.opt ? tx(VD_UI.opt) : b.tamil ? tx(VD_UI.tamil) : '';
      parts.push(mantraHTML(b.d, label));
    }
    if (s.sankalpa && typeof sankalpaText === 'function'){
      try { parts.push(mantraHTML(sankalpaText(state.session), tx(VD_UI.withPanchanga), true)); } catch(e){}
    }
    if (s.counter) parts.push(counterHTML());
    const mean = s.meanK ? s.meanK[state.session] : s.mean;
    if (mean) parts.push(`<p class="vd-mean"><b>${esc(tx(VD_UI.mean))}:</b> ${esc(tx(mean))}</p>`);

    const badges = [];
    if (s.opt) badges.push(badge('opt', tx(VD_UI.opt)));
    if (s.late) badges.push(badge('late', tx(VD_UI.late)));
    if (ash) badges.push(badge(s.ash, tx(VD_UI[s.ash])));
    const skipped = ash && s.ash === 'skip';
    return `<details class="vd-step${skipped ? ' vd-skipped' : ''}" data-step="${s.id}"${V.open.has(s.id) ? ' open' : ''}>
      <summary class="vd-sum"><span class="vd-num">${i + 1}</span><span class="vd-title ${scriptFont()}">${esc(nm(s.t))}</span><span class="vd-badges">${badges.join('')}</span>${CHEV}</summary>
      <div class="vd-body">${parts.join('')}</div></details>`;
  }

  function counterHTML(){
    const done = V.count >= V.target;
    return `<div class="vd-counter">
      <button type="button" class="vd-countbtn${done ? ' vd-done' : ''}" data-vd="count" aria-live="polite">
        <span class="vd-cn">${V.count} / ${V.target}</span><span class="vd-cl">${esc(done ? tx(VD_UI.countDone) : tx(VD_UI.count))}</span></button>
      <div class="seg" role="group" aria-label="Japa count" style="flex:1 1 9rem">
        ${[108, 28, 10].map(n => `<button type="button" data-vd="target" data-n="${n}" aria-pressed="${V.target === n}">${n}</button>`).join('')}
      </div>
      <button type="button" class="btn-ghost" data-vd="reset">${esc(tx(VD_UI.reset))}</button>
    </div>`;
  }

  function renderVidhana(force){
    let sk = '';
    try { sk = sankalpaText(state.session); } catch(e){}
    const sig = [state.lang, state.eng, state.session, V.mode, state.fs, sk].join('|');
    if (!force && sig === V.sig) return;
    V.sig = sig;
    const ash = V.mode === 'ash';
    sec.innerHTML = `
      <div class="vd-head">
        <div class="min-w-0"><h2 class="vd-h ${scriptFont()}">${esc(tx(VD_UI.title))}</h2><p class="vd-sub">${esc(tx(VD_UI.sub))}</p></div>
        <div><button type="button" class="vd-link" data-vd="openall">${esc(tx(VD_UI.openAll))}</button><button type="button" class="vd-link" data-vd="closeall">${esc(tx(VD_UI.closeAll))}</button></div>
      </div>
      <div class="vd-tools">
        <div class="seg" role="group" aria-label="Sandhya session">${SESS.map(s => `<button type="button" data-vd="sess" data-s="${s}" aria-pressed="${state.session === s}">${esc(t(s))}</button>`).join('')}</div>
        <div class="seg" role="group" aria-label="Mode">
          <button type="button" data-vd="mode" data-m="reg" aria-pressed="${!ash}">${esc(tx(VD_UI.regular))}</button>
          <button type="button" data-vd="mode" data-m="ash" aria-pressed="${ash}">${esc(tx(VD_UI.ashMode))}</button>
        </div>
      </div>
      ${ash ? `<p class="vd-banner">${esc(tx(VD_UI.ashBanner))}</p>` : ''}
      <div class="vd-list">${VD_STEPS.map(stepHTML).join('')}</div>
      <p class="vd-note">${esc(tx(VD_UI.varies))}</p>`;
  }

  function renderAsh(force){
    const sig = [state.lang, state.eng, state.fs].join('|');
    if (!force && sig === V.sigA) return;
    V.sigA = sig;
    const A = VD_ASH;
    const secHTML = s => {
      const parts = [];
      if (s.p) parts.push(`<p class="vd-how">${esc(tx(s.p))}</p>`);
      if (s.list) parts.push(`<ol class="vd-ol${s.id === 'when' ? ' vd-ul' : ''}">${s.list.map(x => `<li>${esc(tx(x))}</li>`).join('')}</ol>`);
      if (s.steps) parts.push(s.steps.map((st, i) => `<div class="vd-vstep"><span class="vd-vnum">${i + 1}</span><p class="vd-how">${esc(tx(st.p))}</p>${st.d ? mantraHTML(st.d) : ''}${st.mean ? `<p class="vd-mean"><b>${esc(tx(VD_UI.mean))}:</b> ${esc(tx(st.mean))}</p>` : ''}</div>`).join(''));
      if (s.m) for (const b of s.m){
        parts.push(mantraHTML(b.d, b.label ? tx(b.label) : ''));
        if (b.mean) parts.push(`<p class="vd-mean"><b>${esc(tx(VD_UI.mean))}:</b> ${esc(tx(b.mean))}</p>`);
      }
      if (s.note) parts.push(`<p class="vd-note">${esc(tx(s.note))}</p>`);
      return `<details class="vd-step" data-ash="${s.id}"${V.openAsh.has(s.id) ? ' open' : ''}>
        <summary class="vd-sum"><span class="vd-title">${esc(tx(s.h))}</span>${CHEV}</summary>
        <div class="vd-sec">${parts.join('')}</div></details>`;
    };
    secA.innerHTML = `
      <div class="vd-head"><div class="min-w-0"><h2 class="vd-h ${scriptFont()}">${esc(tx(A.title))}</h2><p class="vd-sub">${esc(tx(A.sub))}</p></div></div>
      <div class="vd-list">${A.sections.map(secHTML).join('')}</div>
      <p class="vd-note">${esc(tx(VD_UI.varies))}</p>`;
  }

  function updateCounter(){
    const btn = sec.querySelector('[data-vd="count"]');
    if (!btn) return;
    const done = V.count >= V.target;
    btn.classList.toggle('vd-done', done);
    btn.querySelector('.vd-cn').textContent = `${V.count} / ${V.target}`;
    btn.querySelector('.vd-cl').textContent = done ? tx(VD_UI.countDone) : tx(VD_UI.count);
    sec.querySelectorAll('[data-vd="target"]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === V.target)));
  }

  /* Keep open/closed state across re-renders */
  sec.addEventListener('toggle', e => {
    const d = e.target; if (!d.dataset || !d.dataset.step) return;
    d.open ? V.open.add(d.dataset.step) : V.open.delete(d.dataset.step);
  }, true);
  secA.addEventListener('toggle', e => {
    const d = e.target; if (!d.dataset || !d.dataset.ash) return;
    d.open ? V.openAsh.add(d.dataset.ash) : V.openAsh.delete(d.dataset.ash);
  }, true);

  sec.addEventListener('click', e => {
    const b = e.target.closest('[data-vd]'); if (!b) return;
    switch (b.dataset.vd){
      case 'sess':
        state.session = b.dataset.s; state.sessionManual = true; renderAll(false); break;
      case 'mode':
        V.mode = b.dataset.m; store.set('vdMode', V.mode);
        V.target = V.mode === 'ash' ? 10 : 108; V.count = 0;
        renderVidhana(true); break;
      case 'openall':
        VD_STEPS.forEach(s => V.open.add(s.id)); renderVidhana(true); break;
      case 'closeall':
        V.open.clear(); renderVidhana(true); break;
      case 'count':
        if (V.count < V.target){
          V.count++;
          if (V.count === V.target){
            try { navigator.vibrate && navigator.vibrate([60, 60, 60]); } catch(err){}
            toast(tx(VD_UI.countDone));
          }
        }
        updateCounter(); break;
      case 'target':
        V.target = +b.dataset.n; updateCounter(); break;
      case 'reset':
        V.count = 0; updateCounter(); break;
    }
  });

  if (V.mode === 'ash') V.target = 10;

  /* Re-render with the rest of the page: language, session, script style and text size all flow through renderSankalpa */
  const baseRenderSankalpa = renderSankalpa;
  renderSankalpa = function(){
    baseRenderSankalpa.apply(this, arguments);
    try { renderVidhana(false); renderAsh(false); } catch(e){ console.error(e); }
  };
  renderVidhana(true);
  renderAsh(true);
})();
