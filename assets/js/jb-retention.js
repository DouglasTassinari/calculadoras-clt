/* =====================================================================
   JORNADA BRASIL — Retenção local (Passo 11) + camada de dados (Passo 12).
   Sem dependências, sem backend, sem Firebase. Tudo é fail-safe: qualquer
   erro é engolido para nunca afetar as calculadoras.

   JBStore é a CAMADA DE DADOS (seam) preparada para sincronização futura:
   hoje grava em localStorage; um backend de nuvem pode ser plugado em
   JBStore.backend sem alterar o resto do código (ver ARQUITETURA-CONTA.md).
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- Camada de dados (JBStore) ---------------- */
  var localBackend = {
    get: function (k) {
      try { return JSON.parse(localStorage.getItem('jb:' + k)); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem('jb:' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    remove: function (k) { try { localStorage.removeItem('jb:' + k); } catch (e) {} }
  };

  var JBStore = window.JBStore || {
    backend: localBackend,
    get: function (k) { try { return this.backend.get(k); } catch (e) { return null; } },
    set: function (k, v) { try { return this.backend.set(k, v); } catch (e) { return false; } },
    remove: function (k) { try { return this.backend.remove(k); } catch (e) {} },
    // Pontos de extensão para o Passo 14 (sincronização):
    setBackend: function (b) { if (b && b.get && b.set) this.backend = b; },
    exportAll: function () {
      var out = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('jb:') === 0) out[key.slice(3)] = JSON.parse(localStorage.getItem(key));
        }
      } catch (e) {}
      return out;
    },
    // Passo 12/14: migra um lote de dados (ex.: do dispositivo para a conta no 1o login).
    importAll: function (obj) {
      if (!obj) return;
      try { for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) this.set(k, obj[k]); } } catch (e) {}
    }
  };
  window.JBStore = JBStore;

  /* ---------------- Catálogo de ferramentas ---------------- */
  var TOOLS = {
    liquido: { t: 'Salário Líquido', u: '/salario-liquido/' },
    rescisao: { t: 'Rescisão', u: '/rescisao/' },
    ferias: { t: 'Férias', u: '/ferias/' },
    decimo: { t: '13º Salário', u: '/decimo-terceiro/' },
    horas: { t: 'Horas Extras', u: '/horas-extras/' },
    noturno: { t: 'Adicional Noturno', u: '/adicional-noturno/' },
    seguro: { t: 'Seguro-Desemprego', u: '/seguro-desemprego/' },
    auxilio: { t: 'Auxílio-Doença', u: '/auxilio-doenca/' },
    maternidade: { t: 'Salário-Maternidade', u: '/salario-maternidade/' },
    ir: { t: 'Imposto de Renda', u: '/imposto-de-renda/' },
    pj: { t: 'PJ vs CLT', u: '/pj-vs-clt/' }
  };
  var KEY_RECENT = 'recentTools';
  var KEY_SNAP = 'calcSnap:';

  function recordRecent(calc) {
    if (!TOOLS[calc]) return;
    var list = JBStore.get(KEY_RECENT) || [];
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (x) { return x && x.c !== calc; });
    list.unshift({ c: calc, t: TOOLS[calc].t, u: TOOLS[calc].u, ts: Date.now() });
    JBStore.set(KEY_RECENT, list.slice(0, 6));
  }

  /* ---------------- "Continue de onde parou" (home/qualquer página com #jb-continue) ---------------- */
  function renderContinue(currentCalc) {
    var cont = document.getElementById('jb-continue');
    if (!cont) return;
    var list = JBStore.get(KEY_RECENT) || [];
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (x) { return x && x.c !== currentCalc && TOOLS[x.c]; });
    if (!list.length) return;
    var cards = list.map(function (x) {
      return '<a class="related-card" href="' + x.u + '" onclick="typeof gtag!==\'undefined\'&&gtag(\'event\',\'journey_click\',{from:\'continue\',to:\'' + x.c + '\'})">' + x.t + '</a>';
    }).join('');
    cont.innerHTML = '<div class="container"><h2 class="section-h2">Continue de onde parou</h2>' +
      '<p style="color:var(--text-2);margin:-6px 0 14px;font-size:.92rem">Ferramentas que você usou recentemente neste dispositivo.</p>' +
      '<div class="related-calcs-grid">' + cards + '</div></div>';
    cont.hidden = false;
  }

  /* ---------------- "Retomar último cálculo" (páginas de calculadora) ---------------- */
  function setupResume(calc) {
    var form = document.getElementById('calc-form');
    if (!form) return;

    // captura passiva do estado a cada digitação
    form.addEventListener('input', function () {
      try {
        var snap = {};
        var els = form.querySelectorAll('input, select');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (!el.id) continue;
          snap[el.id] = (el.type === 'checkbox') ? el.checked : el.value;
        }
        JBStore.set(KEY_SNAP + calc, { v: snap, ts: Date.now() });
      } catch (e) {}
    });

    // oferta de retomada, se houver snapshot
    var saved = JBStore.get(KEY_SNAP + calc);
    if (!saved || !saved.v) return;
    var keys = [];
    try { keys = Object.keys(saved.v); } catch (e) { return; }
    if (!keys.length) return;

    try {
      var bar = document.createElement('div');
      bar.setAttribute('style', 'margin:0 0 14px;padding:10px 14px;border:1px solid var(--primary-border,#FED7AA);background:var(--primary-bg,#FFEDD5);border-radius:var(--radius-sm,10px);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:.9rem;color:var(--text,#1F2937)');
      var span = document.createElement('span');
      span.textContent = 'Você tem um cálculo salvo neste dispositivo.';
      bar.appendChild(span);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-primary';
      btn.textContent = 'Retomar último cálculo';
      btn.addEventListener('click', function () {
        try {
          keys.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = !!saved.v[id];
            else el.value = saved.v[id];
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        } catch (e) {}
        if (bar.parentNode) bar.parentNode.removeChild(bar);
        if (typeof gtag !== 'undefined') { try { gtag('event', 'calc_resumed', { calc_name: calc }); } catch (e) {} }
      });
      bar.appendChild(btn);
      form.parentNode.insertBefore(bar, form);
    } catch (e) {}
  }

  /* ---------------- Boot ---------------- */
  function main() {
    try {
      var mainEl = document.getElementById('main-content');
      var calc = mainEl ? mainEl.getAttribute('data-calc') : null;
      if (calc) { recordRecent(calc); setupResume(calc); }
      renderContinue(calc);
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
