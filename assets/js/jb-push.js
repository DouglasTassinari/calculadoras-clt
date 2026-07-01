/* ============================================================
   Jornada Brasil — Notificações Web Push (opt-in)
   Banner de autorização + inscrição no PushManager + gravação
   da assinatura no Supabase (REST, com a chave publicável).
   Carregado dinamicamente por pwa.js em todas as páginas.
   Fail-safe: qualquer erro apenas desativa o recurso, sem quebrar a página.
   ============================================================ */
(function () {
  "use strict";

  // Suporte mínimo: SW + Push + Notification (descarta iOS sem PWA, navegadores antigos)
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

  var SUPABASE_URL = "https://spiiwtqavxjtdxeeqlbf.supabase.co";
  var SUPABASE_KEY = "sb_publishable_YKnz7jwIWESAUT8y1NlC2A_5P-hu0Gu";
  // Chave pública VAPID (pode ser exposta). A privada fica só no servidor (Supabase secret).
  var VAPID_PUBLIC = "BKMYr27eSciXa0rCmWXrTJD3Bgd7r2MMaiR2aaRSMFX2Ls9ni3wVv0wyniq7ovoTVNkHuwNJKujoBOgkbh0rOVg";

  var LS_STATE = "jb-push-state";        // 'subscribed' | 'denied'
  var LS_SNOOZE = "jb-push-snooze";      // timestamp (ms) até quando não mostrar
  var SNOOZE_DAYS = 14;
  var ENGAGE_MS = 20000;                 // só pede após 20s de leitura

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Converte a chave VAPID base64url em Uint8Array (formato exigido pelo PushManager)
  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function bufToB64u(buf) {
    var bytes = new Uint8Array(buf);
    var str = "";
    for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Salva (upsert por endpoint) a assinatura no Supabase via REST
  function salvarAssinatura(sub) {
    var json = sub.toJSON ? sub.toJSON() : sub;
    var keys = json.keys || {};
    var body = {
      endpoint: json.endpoint,
      p256dh: keys.p256dh || null,
      auth: keys.auth || null,
      user_agent: (navigator.userAgent || "").slice(0, 300),
      user_id: (window.JBAuth && window.JBAuth.user && window.JBAuth.user.id) || null,
    };
    return fetch(SUPABASE_URL + "/rest/v1/push_subscriptions", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(body),
    });
  }

  function getRegistration() {
    return navigator.serviceWorker.ready;
  }

  // Inscreve no push e persiste. Retorna Promise<boolean sucesso>.
  function inscrever() {
    return getRegistration().then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing;
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      });
    }).then(function (sub) {
      return salvarAssinatura(sub).then(function () {
        lsSet(LS_STATE, "subscribed");
        return true;
      });
    }).catch(function (e) {
      console.warn("[JB push] falha ao inscrever:", e && e.message);
      return false;
    });
  }

  function desinscrever() {
    return getRegistration().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) { lsSet(LS_STATE, ""); return true; }
      var endpoint = sub.endpoint;
      return sub.unsubscribe().then(function () {
        lsSet(LS_STATE, "");
        // Remove do servidor (best-effort)
        return fetch(SUPABASE_URL + "/rest/v1/push_subscriptions?endpoint=eq." + encodeURIComponent(endpoint), {
          method: "DELETE",
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY },
        }).catch(function () {}).then(function () { return true; });
      });
    }).catch(function () { return false; });
  }

  /* ---------- UI do banner ---------- */
  function injetarEstilos() {
    if (document.getElementById("jb-push-style")) return;
    var css =
      "#jb-push-banner{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9998;" +
      "display:flex;align-items:center;gap:14px;max-width:min(560px,calc(100vw - 24px));" +
      "background:#fff;color:#1F2937;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;" +
      "box-shadow:0 8px 28px -8px rgba(0,0,0,.25);font-family:Inter,system-ui,sans-serif;animation:jbPushIn .25s ease}" +
      "@keyframes jbPushIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}" +
      "#jb-push-banner .jb-push-ic{flex-shrink:0;width:40px;height:40px;border-radius:10px;background:#FFEDD5;" +
      "display:flex;align-items:center;justify-content:center}" +
      "#jb-push-banner .jb-push-ic svg{width:22px;height:22px;stroke:#B45309}" +
      "#jb-push-banner .jb-push-tx{flex:1;min-width:0}" +
      "#jb-push-banner .jb-push-tx strong{display:block;font-size:.92rem;font-weight:700;margin-bottom:2px}" +
      "#jb-push-banner .jb-push-tx span{font-size:.8rem;color:#4B5563;line-height:1.4}" +
      "#jb-push-banner .jb-push-btns{display:flex;gap:8px;flex-shrink:0}" +
      "#jb-push-banner button{font-family:inherit;font-weight:600;font-size:.82rem;border-radius:9px;padding:9px 14px;cursor:pointer;border:none}" +
      "#jb-push-banner .jb-push-yes{background:#B45309;color:#fff}" +
      "#jb-push-banner .jb-push-yes:hover{background:#EA580C}" +
      "#jb-push-banner .jb-push-no{background:transparent;color:#4B5563;border:1px solid #E5E7EB}" +
      "#jb-push-banner .jb-push-no:hover{background:#F9FAFB}" +
      "@media(max-width:520px){#jb-push-banner{flex-wrap:wrap}#jb-push-banner .jb-push-btns{width:100%}#jb-push-banner .jb-push-btns button{flex:1}}" +
      "@media(prefers-color-scheme:dark){#jb-push-banner{background:#111827;color:#F9FAFB;border-color:#283447}" +
      "#jb-push-banner .jb-push-tx span{color:#9CA3AF}#jb-push-banner .jb-push-ic{background:#431407}" +
      "#jb-push-banner .jb-push-ic svg{stroke:#FB923C}#jb-push-banner .jb-push-no{color:#9CA3AF;border-color:#283447}" +
      "#jb-push-banner .jb-push-no:hover{background:#0F172A}}";
    var st = document.createElement("style");
    st.id = "jb-push-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function mostrarBanner() {
    if (document.getElementById("jb-push-banner")) return;
    injetarEstilos();
    var b = document.createElement("div");
    b.id = "jb-push-banner";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-label", "Receber novidades por notificação");
    b.innerHTML =
      '<div class="jb-push-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>' +
      '<div class="jb-push-tx"><strong>Receba as novidades do Jornada Brasil</strong>' +
      '<span>Avisamos quando sair um novo artigo, calculadora ou atualização importante. Sem spam — só o que importa.</span></div>' +
      '<div class="jb-push-btns">' +
      '<button class="jb-push-no" id="jb-push-no">Agora não</button>' +
      '<button class="jb-push-yes" id="jb-push-yes">Ativar</button>' +
      '</div>';
    document.body.appendChild(b);

    document.getElementById("jb-push-yes").addEventListener("click", function () {
      if (typeof gtag !== "undefined") gtag("event", "push_optin_click", { action: "ativar" });
      Notification.requestPermission().then(function (perm) {
        if (perm === "granted") {
          inscrever();
        } else {
          lsSet(LS_STATE, "denied");
        }
        b.remove();
      });
    });
    document.getElementById("jb-push-no").addEventListener("click", function () {
      if (typeof gtag !== "undefined") gtag("event", "push_optin_click", { action: "agora_nao" });
      lsSet(LS_SNOOZE, String(Date.now() + SNOOZE_DAYS * 86400000));
      b.remove();
    });
  }

  function devePerguntar() {
    if (Notification.permission !== "default") return false;       // já concedeu/negou no navegador
    if (lsGet(LS_STATE) === "subscribed" || lsGet(LS_STATE) === "denied") return false;
    var snooze = parseInt(lsGet(LS_SNOOZE) || "0", 10);
    if (snooze && Date.now() < snooze) return false;               // ainda dentro do "agora não"
    return true;
  }

  function agendar() {
    if (!devePerguntar()) return;
    var disparado = false;
    function go() {
      if (disparado) return;
      disparado = true;
      if (devePerguntar()) mostrarBanner();
      window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      var h = document.documentElement;
      var pct = (h.scrollTop) / Math.max(1, h.scrollHeight - h.clientHeight);
      if (pct > 0.45) go();
    }
    setTimeout(go, ENGAGE_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Re-sincroniza: se o usuário já concedeu permissão antes, garante que a assinatura
  // está salva no servidor (cobre limpeza de cache/troca de chave).
  function ressincronizar() {
    if (Notification.permission !== "granted") return;
    getRegistration().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (sub) salvarAssinatura(sub).then(function () { lsSet(LS_STATE, "subscribed"); });
      else if (lsGet(LS_STATE) !== "denied") inscrever();
    }).catch(function () {});
  }

  // API pública para um futuro painel "Gerenciar notificações"
  window.JBPush = {
    isSupported: true,
    permission: function () { return Notification.permission; },
    subscribe: function () { return Notification.requestPermission().then(function (p) { return p === "granted" ? inscrever() : false; }); },
    unsubscribe: desinscrever,
    prompt: mostrarBanner,
  };

  ressincronizar();
  agendar();
})();
