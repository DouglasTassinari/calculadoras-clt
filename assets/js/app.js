/* =====================================================================
   RÉGUA CLT — app.js
   Framework de renderização das calculadoras
   ===================================================================== */

(function(){
  'use strict';

  // Aguardar engine carregar
  if (typeof window.RCEngine === 'undefined') {
    console.error('RCEngine not loaded');
    return;
  }

  const { CALCS, BRL, PCT, r2, nz } = window.RCEngine;

  // Detectar qual calculadora renderizar
  const mainEl = document.getElementById('main-content');
  if (!mainEl) return;
  const calcName = mainEl.getAttribute('data-calc');
  if (!calcName || !CALCS[calcName]) return;

  const calcFormEl = document.getElementById('calc-form');
  const calcDemoEl = document.getElementById('calc-demo');
  if (!calcFormEl || !calcDemoEl) return;

  const calc = CALCS[calcName];
  let estado = {};

  // Rastrear evento de uso
  function trackCalcUsed() {
    if (typeof gtag === 'function' && window.RC && window.RC.getConsent && window.RC.getConsent()?.analytics) {
      try { gtag('event', 'calc_used', { calc_name: calcName }); } catch(e) {}
    }
  }

  /* ---- Máscara de moeda ---- */
  function aplicarMascara(input) {
    let d = input.value.replace(/\D/g, '');
    if (d === '') { input.value = ''; return; }
    d = d.replace(/^0+/, '') || '0';
    const cents = parseInt(d, 10);
    input.value = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseMoeda(str) {
    if (!str) return 0;
    const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  /* ---- Criar campo ---- */
  function criarCampo(campo, wraps) {
    if (campo.tipo === 'secao') {
      const sec = document.createElement('div');
      sec.className = 'secao-sep';
      sec.textContent = campo.rot;
      wraps[campo.id] = sec;
      return sec;
    }

    const wrap = document.createElement('div');
    wrap.className = 'campo' + (campo.meia ? ' meia' : '');
    wraps[campo.id] = wrap;

    if (campo.tipo === 'check') {
      const lab = document.createElement('label');
      lab.className = 'check';
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.id = 'f_' + campo.id;
      inp.checked = estado[campo.id] ?? false;
      inp.addEventListener('change', () => { estado[campo.id] = inp.checked; recalcular(); });
      const sp = document.createElement('span');
      sp.textContent = campo.rot;
      lab.appendChild(inp);
      lab.appendChild(sp);
      wrap.appendChild(lab);
      return wrap;
    }

    const lab = document.createElement('label');
    lab.className = 'rot';
    lab.setAttribute('for', 'f_' + campo.id);
    lab.textContent = campo.rot;
    if (campo.dica) {
      const d = document.createElement('span');
      d.className = 'dica';
      d.textContent = '· ' + campo.dica;
      lab.appendChild(d);
    }
    wrap.appendChild(lab);

    if (campo.tipo === 'moeda') {
      const grp = document.createElement('div');
      grp.className = 'grp';
      const pre = document.createElement('span');
      pre.className = 'prefixo';
      pre.textContent = 'R$';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.id = 'f_' + campo.id;
      inp.placeholder = '0,00';
      inp.className = 'mono';
      inp.value = estado[campo.id] ?? (campo.def || '');
      inp.addEventListener('input', () => { aplicarMascara(inp); estado[campo.id] = inp.value; recalcular(); });
      grp.appendChild(pre);
      grp.appendChild(inp);
      wrap.appendChild(grp);
    } else if (campo.tipo === 'numero') {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.id = 'f_' + campo.id;
      if (campo.min != null) inp.min = campo.min;
      if (campo.max != null) inp.max = campo.max;
      inp.step = campo.passo || '1';
      inp.inputMode = 'decimal';
      inp.value = estado[campo.id] ?? (campo.def || '');
      inp.placeholder = campo.def || '0';
      inp.addEventListener('input', () => { estado[campo.id] = inp.value; recalcular(); });
      wrap.appendChild(inp);
    } else if (campo.tipo === 'data') {
      const inp = document.createElement('input');
      inp.type = 'date';
      inp.id = 'f_' + campo.id;
      inp.value = estado[campo.id] ?? '';
      inp.className = 'mono';
      inp.addEventListener('input', () => { estado[campo.id] = inp.value; recalcular(); });
      inp.addEventListener('change', () => { estado[campo.id] = inp.value; recalcular(); });
      wrap.appendChild(inp);
    } else if (campo.tipo === 'select') {
      const sel = document.createElement('select');
      sel.id = 'f_' + campo.id;
      campo.opcoes.forEach(o => {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      });
      sel.value = estado[campo.id] ?? campo.def;
      sel.addEventListener('change', () => { estado[campo.id] = sel.value; recalcular(); });
      wrap.appendChild(sel);
    }

    return wrap;
  }

  /* ---- Coletar valores ---- */
  function coletarValores() {
    const v = {};
    calc.campos.forEach(campo => {
      if (campo.tipo === 'secao') return;
      const raw = estado[campo.id];
      if (campo.tipo === 'moeda') v[campo.id] = parseMoeda(raw);
      else if (campo.tipo === 'numero') v[campo.id] = raw === '' || raw == null ? (campo.def != null ? Number(campo.def) : 0) : Number(raw);
      else if (campo.tipo === 'check') v[campo.id] = raw ?? false;
      else v[campo.id] = raw ?? (campo.def ?? '');
    });
    return v;
  }

  /* ---- Visibilidade condicional ---- */
  function atualizarVisibilidade(v, wraps) {
    calc.campos.forEach(campo => {
      if (campo.showIf && wraps[campo.id]) {
        wraps[campo.id].classList.toggle('oculto', !campo.showIf(v));
      }
    });
  }

  /* ---- Item de linha no demonstrativo ---- */
  function linhaItem(it, tipo) {
    const sinal = tipo === 'prov' ? '+' : '−';
    return `<div class="item ${tipo}"><span class="nome">${it.nome}</span><span class="val mono"><span class="sinal">${sinal}</span>${BRL(it.valor)}</span></div>`;
  }

  /* ---- Renderizar demonstrativo ---- */
  function renderDemo(r) {
    if (!r || r.vazio) {
      calcDemoEl.innerHTML = `<div class="vazio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
        <p>Preencha os campos ao lado para ver o demonstrativo detalhado.</p>
      </div>`;
      return;
    }
    if (r.erro) {
      calcDemoEl.innerHTML = `<div class="demo-corpo"><div class="erro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
        <span>${r.erro}</span></div></div>`;
      return;
    }

    let h = '<div class="demo-corpo">';

    if (r.proventos && r.proventos.length) {
      h += '<div class="grupo-tit">Proventos</div>';
      r.proventos.forEach(p => h += linhaItem(p, 'prov'));
      if (r.descontos && r.descontos.length) {
        const tot = r.proventos.reduce((s, p) => s + p.valor, 0);
        h += `<div class="sub"><span class="nome">Total de proventos</span><span class="val mono">${BRL(tot)}</span></div>`;
      }
    }
    if (r.descontos && r.descontos.length) {
      h += '<div class="grupo-tit">Descontos</div>';
      r.descontos.forEach(d => h += linhaItem(d, 'desc'));
      const tot = r.descontos.reduce((s, d) => s + d.valor, 0);
      h += `<div class="sub"><span class="nome">Total de descontos</span><span class="val mono">−${BRL(tot)}</span></div>`;
    }

    if (r.blocos && r.blocos.length) {
      h += '<div class="blocos">';
      r.blocos.forEach(b => {
        h += `<div class="bloco"><div class="bloco-tit">${b.titulo}</div>`;
        b.linhas.forEach(l => h += `<div class="lin ${l.pos ? 'pos' : ''}"><span>${l.nome}</span><span class="v mono">${l.pos ? '+ ' : ''}${BRL(l.valor)}</span></div>`);
        h += '</div>';
      });
      h += '</div>';
    }

    h += `<div class="total"><div class="lbl"><b>${r.destaque.label}</b>${r.destaque.sub ? `<small>${r.destaque.sub}</small>` : ''}</div><span class="grande">${BRL(r.destaque.valor)}</span></div>`;
    h += '</div>';

    if (r.avisos && r.avisos.length) {
      h += '<div class="demo-corpo"><div class="avisos">';
      r.avisos.forEach(a => {
        const cls = (a.tipo === 'info' || a.tipo === 'success') ? a.tipo : '';
        let icon;
        if (a.tipo === 'success')
          icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
        else if (a.tipo === 'info')
          icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
        else
          icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
        h += `<div class="aviso ${cls}">${icon}<span>${a.txt}</span></div>`;
      });
      h += '</div></div>';
    }

    const mem = (r.memoria || []).filter(Boolean);
    if (mem.length) {
      h += `<details class="memoria"><summary>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        Memória de cálculo
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </summary><div class="memoria-corpo"><ol>`;
      mem.forEach(m => h += `<li>${m}</li>`);
      h += '</ol></div></details>';
    }

    calcDemoEl.innerHTML = h;
  }

  /* ---- Recalcular ---- */
  let _tracked = false;
  function recalcular() {
    const v = coletarValores();
    atualizarVisibilidade(v, calcFormEl._wraps || {});
    const r = calc.calcular(v);
    renderDemo(r);
    if (!_tracked && r && !r.vazio && !r.erro) {
      _tracked = true;
      trackCalcUsed();
    }
  }

  /* ---- Montar formulário ---- */
  function montar() {
    calcFormEl.innerHTML = '';
    const wraps = {};
    const campos = calc.campos;
    let i = 0;
    while (i < campos.length) {
      const campo = campos[i];
      if (campo.meia && campos[i + 1] && campos[i + 1].meia) {
        const linha = document.createElement('div');
        linha.className = 'linha-campos';
        linha.appendChild(criarCampo(campo, wraps));
        linha.appendChild(criarCampo(campos[i + 1], wraps));
        calcFormEl.appendChild(linha);
        i += 2;
      } else {
        calcFormEl.appendChild(criarCampo(campo, wraps));
        i++;
      }
    }

    // Botão calcular
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h2M8 18h2M14 14h2v4h-2z"/></svg> Calcular';
    btn.addEventListener('click', () => {
      recalcular();
      if (window.matchMedia('(max-width:860px)').matches) {
        const res = document.querySelector('.calc-result-panel');
        if (res) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    calcFormEl.appendChild(btn);

    calcFormEl._wraps = wraps;
    recalcular();
  }

  // Inicializar
  montar();

})();
