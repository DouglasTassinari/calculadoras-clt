/* =====================================================================
   Jornada Brasil — Widget flutuante "Contato e sugestões"
   Botão fixo (canto inferior direito) que abre um formulário e envia
   via Web3Forms. O e-mail de destino fica configurado no painel do
   Web3Forms (atrelado à access key) e NUNCA aparece no site.
   ===================================================================== */
(function () {
  'use strict';

  // ---- Configuração -------------------------------------------------
  // Access Key do Web3Forms (https://web3forms.com). O e-mail de destino
  // fica configurado apenas no painel do Web3Forms, nunca no código.
  var ACCESS_KEY = 'a7571e9e-1c28-47ff-9718-7093fae76d6e';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var CONFIGURED = ACCESS_KEY.indexOf('__WEB3FORMS') === -1;

  if (document.getElementById('jb-contact-btn')) return; // evita duplicar

  // ---- Estilos (usam os tokens do design system → dark mode automático)
  var css = '' +
    '#jb-contact-btn{position:fixed;right:20px;bottom:20px;z-index:9990;display:inline-flex;align-items:center;gap:8px;' +
      'background:var(--primary,#F97316);color:#fff;border:none;border-radius:999px;padding:13px 20px;font-family:var(--font,system-ui,sans-serif);' +
      'font-size:.92rem;font-weight:600;cursor:pointer;box-shadow:0 6px 20px -6px rgba(0,0,0,.4);transition:transform .15s,background .15s}' +
    '#jb-contact-btn:hover{background:var(--primary-dark,#EA580C);transform:translateY(-2px)}' +
    '#jb-contact-btn svg{width:20px;height:20px;flex:none}' +
    '#jb-contact-btn .jb-cb-label{white-space:nowrap}' +
    '@media(max-width:480px){#jb-contact-btn{padding:13px;right:16px;bottom:16px}#jb-contact-btn .jb-cb-label{display:none}}' +
    '#jb-contact-panel{position:fixed;right:20px;bottom:84px;z-index:9991;width:360px;max-width:calc(100vw - 32px);' +
      'background:var(--surface,#fff);color:var(--text,#1F2937);border:1px solid var(--border,#E5E7EB);border-radius:16px;' +
      'box-shadow:0 16px 48px -12px rgba(0,0,0,.5);overflow:hidden;font-family:var(--font,system-ui,sans-serif);' +
      'opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s,transform .18s}' +
    '#jb-contact-panel.jb-open{opacity:1;transform:none;pointer-events:auto}' +
    '@media(max-width:480px){#jb-contact-panel{right:16px;left:16px;bottom:80px;width:auto}}' +
    '.jb-cp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;' +
      'background:var(--primary-bg,#FFEDD5);border-bottom:1px solid var(--border,#E5E7EB)}' +
    '.jb-cp-head h2{font-size:1.02rem;font-weight:700;margin:0;color:var(--badge-text,#7C2D12)}' +
    '.jb-cp-head p{font-size:.78rem;margin:2px 0 0;color:var(--text-2,#4B5563)}' +
    '.jb-cp-close{background:none;border:none;cursor:pointer;color:var(--text-2,#4B5563);padding:4px;line-height:0;border-radius:8px}' +
    '.jb-cp-close:hover{background:rgba(0,0,0,.06);color:var(--text,#1F2937)}' +
    '.jb-cp-body{padding:16px 18px;max-height:min(70vh,560px);overflow-y:auto}' +
    '.jb-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}' +
    '.jb-field label{font-size:.8rem;font-weight:600;color:var(--text,#1F2937)}' +
    '.jb-field .jb-opt{font-weight:400;color:var(--text-3,#5B6370)}' +
    '.jb-field input,.jb-field select,.jb-field textarea{font-family:inherit;font-size:.92rem;color:var(--text,#1F2937);' +
      'background:var(--surface,#fff);border:1px solid var(--border,#E5E7EB);border-radius:10px;padding:10px 12px;width:100%;outline:none;transition:.14s}' +
    '.jb-field textarea{resize:vertical;min-height:96px}' +
    '.jb-field input:focus,.jb-field select:focus,.jb-field textarea:focus{border-color:var(--primary,#F97316);box-shadow:0 0 0 3px var(--primary-bg,#FFEDD5)}' +
    '.jb-hp{position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.jb-submit{width:100%;background:var(--primary,#F97316);color:#fff;border:none;border-radius:10px;padding:12px;' +
      'font-family:inherit;font-size:.95rem;font-weight:600;cursor:pointer;transition:.15s;margin-top:4px}' +
    '.jb-submit:hover{background:var(--primary-dark,#EA580C)}' +
    '.jb-submit:disabled{opacity:.6;cursor:not-allowed}' +
    '.jb-note{font-size:.72rem;color:var(--text-3,#5B6370);margin:10px 0 0;line-height:1.5}' +
    '.jb-msg{padding:14px 16px;border-radius:10px;font-size:.88rem;line-height:1.5;margin:0}' +
    '.jb-msg.ok{background:var(--green-bg,#EAF5EF);color:var(--green-text,#14593a);border:1px solid var(--green-border,#bfe3cf)}' +
    '.jb-msg.err{background:var(--red-bg,#FAEDEB);color:var(--red-text,#8f2d1f);border:1px solid var(--red-border,#eccac4)}' +
    '.jb-result{text-align:center;padding:8px 0}' +
    '.jb-result svg{width:44px;height:44px;margin-bottom:10px}' +
    '.jb-result h3{font-size:1.05rem;margin:0 0 6px}' +
    '.jb-result p{font-size:.88rem;color:var(--text-2,#4B5563);margin:0 0 16px;line-height:1.5}' +
    '.jb-result .jb-submit{width:auto;padding:10px 20px}';

  var style = document.createElement('style');
  style.id = 'jb-contact-style';
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Marcação -----------------------------------------------------
  var btn = document.createElement('button');
  btn.id = 'jb-contact-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'jb-contact-panel');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<span class="jb-cb-label">Contato e sugestões</span>';

  var panel = document.createElement('div');
  panel.id = 'jb-contact-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'jb-cp-title');
  panel.hidden = true;
  panel.innerHTML =
    '<div class="jb-cp-head">' +
      '<div>' +
        '<h2 id="jb-cp-title">Contato e sugestões</h2>' +
        '<p>Reporte um erro de cálculo ou envie uma sugestão.</p>' +
      '</div>' +
      '<button type="button" class="jb-cp-close" aria-label="Fechar">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="jb-cp-body">' +
      '<form id="jb-contact-form" novalidate>' +
        '<div class="jb-field">' +
          '<label for="jb-name">Nome <span class="jb-opt">(opcional)</span></label>' +
          '<input id="jb-name" name="nome" type="text" autocomplete="name" maxlength="100">' +
        '</div>' +
        '<div class="jb-field">' +
          '<label for="jb-email">E-mail para resposta <span class="jb-opt">(opcional)</span></label>' +
          '<input id="jb-email" name="email" type="email" autocomplete="email" maxlength="120" placeholder="voce@exemplo.com">' +
        '</div>' +
        '<div class="jb-field">' +
          '<label for="jb-subject">Assunto</label>' +
          '<select id="jb-subject" name="assunto">' +
            '<option value="Sugestão">Sugestão</option>' +
            '<option value="Erro de cálculo">Erro de cálculo</option>' +
            '<option value="Privacidade e dados">Privacidade e dados</option>' +
            '<option value="Outro">Outro</option>' +
          '</select>' +
        '</div>' +
        '<div class="jb-field">' +
          '<label for="jb-message">Mensagem</label>' +
          '<textarea id="jb-message" name="mensagem" maxlength="2000" required placeholder="Descreva sua sugestão ou o erro encontrado..."></textarea>' +
        '</div>' +
        '<input type="checkbox" name="botcheck" class="jb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<p class="jb-msg err" id="jb-form-error" hidden></p>' +
        '<button type="submit" class="jb-submit">Enviar mensagem</button>' +
        '<p class="jb-note">Seus dados são usados apenas para responder este contato. Não compartilhamos com terceiros.</p>' +
      '</form>' +
    '</div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ---- Comportamento ------------------------------------------------
  var form = panel.querySelector('#jb-contact-form');
  var errBox = panel.querySelector('#jb-form-error');
  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    // força reflow para a transição
    void panel.offsetWidth;
    panel.classList.add('jb-open');
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    var first = panel.querySelector('#jb-name');
    if (first) first.focus();
  }
  function close() {
    panel.classList.remove('jb-open');
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { panel.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function toggle() { panel.classList.contains('jb-open') ? close() : open(); }
  function onKey(e) { if (e.key === 'Escape') close(); }

  btn.addEventListener('click', toggle);
  panel.querySelector('.jb-cp-close').addEventListener('click', close);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var message = form.mensagem.value.trim();
    if (!message) {
      errBox.textContent = 'Por favor, escreva sua mensagem.';
      errBox.hidden = false;
      form.mensagem.focus();
      return;
    }
    var email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errBox.textContent = 'O e-mail informado parece inválido.';
      errBox.hidden = false;
      form.email.focus();
      return;
    }
    if (form.botcheck.checked) return; // honeypot: bot detectado

    if (!CONFIGURED) {
      errBox.textContent = 'Formulário em configuração. Tente novamente em instantes.';
      errBox.hidden = false;
      return;
    }

    var submitBtn = form.querySelector('.jb-submit');
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...';

    var assunto = form.assunto.value;
    var nome = form.nome.value.trim();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: 'Jornada Brasil — ' + assunto + (nome ? ' (' + nome + ')' : ''),
        from_name: nome || 'Visitante Jornada Brasil',
        // Campos enviados no corpo do e-mail:
        Nome: nome || '(não informado)',
        'E-mail para resposta': email || '(não informado)',
        Assunto: assunto,
        Mensagem: message,
        'Página': location.href
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success) {
          showResult(true);
        } else {
          throw new Error((data && data.message) || 'falha');
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        errBox.textContent = 'Não foi possível enviar agora. Verifique sua conexão e tente novamente.';
        errBox.hidden = false;
      });
  });

  function showResult(ok) {
    var body = panel.querySelector('.jb-cp-body');
    if (ok) {
      body.innerHTML =
        '<div class="jb-result">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="var(--green,#157A4C)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/></svg>' +
          '<h3>Mensagem enviada!</h3>' +
          '<p>Obrigado pelo contato. Se você informou um e-mail, responderemos por lá.</p>' +
          '<button type="button" class="jb-submit" id="jb-close-ok">Fechar</button>' +
        '</div>';
      var c = panel.querySelector('#jb-close-ok');
      if (c) c.addEventListener('click', close);
    }
  }

  // API pública para CTAs nas páginas (ex.: botão "Abrir formulário")
  window.JBContact = { open: open, close: close, toggle: toggle };
})();
