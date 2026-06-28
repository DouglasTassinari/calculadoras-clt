/* ============================================================
   Jornada Brasil — controle de conta no header (reutilizável)
   Injeta automaticamente em .main-nav (portal) ou .jb-nav (apps).
   Estados: visitante (botão Entrar) / autenticado (foto + nome + menu).
   Depende de window.JBAuth (jb-supabase.js).
   ============================================================ */
(function () {
  "use strict";

  function init() {
    if (!window.JBAuth) { setTimeout(init, 120); return; }
    var nav = document.querySelector(".site-header .main-nav") ||
              document.querySelector(".jb-header .jb-nav") ||
              document.querySelector(".main-nav") ||
              document.querySelector(".jb-nav");
    if (!nav) return;
    if (nav.querySelector(".jb-acct")) return;

    var wrap = document.createElement("div");
    wrap.className = "jb-acct";
    wrap.innerHTML =
      '<button type="button" class="jb-acct-enter" aria-label="Entrar com Google">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8a6 6 0 010-12 5.3 5.3 0 013.8 1.5l2.6-2.5A9 9 0 1012 21c5.2 0 8.7-3.7 8.7-8.9 0-.6-.07-1-.16-1.6H12z"/></svg>' +
        '<span>Entrar</span>' +
      '</button>' +
      '<div class="jb-acct-user" hidden>' +
        '<button type="button" class="jb-acct-trigger" aria-haspopup="true" aria-expanded="false">' +
          '<span class="jb-acct-avatar is-letter"></span>' +
          '<span class="jb-acct-name"></span>' +
          '<svg class="jb-acct-caret" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5z"/></svg>' +
        '</button>' +
        '<div class="jb-acct-menu" role="menu" hidden>' +
          '<div class="jb-acct-menu-head">' +
            '<span class="jb-acct-menu-avatar is-letter"></span>' +
            '<div><div class="jb-acct-menu-name"></div><div class="jb-acct-menu-email"></div></div>' +
          '</div>' +
          '<a class="jb-acct-menu-item" href="/conta/" role="menuitem">Minha conta</a>' +
          '<a class="jb-acct-menu-item" href="/calcular-preco/" role="menuitem">Meus orçamentos</a>' +
          '<a class="jb-acct-menu-item" href="/meu-lucro/" role="menuitem">Meu Lucro</a>' +
          '<button type="button" class="jb-acct-menu-item jb-acct-signout" role="menuitem">Sair</button>' +
        '</div>' +
      '</div>';
    nav.appendChild(wrap);

    var enterBtn = wrap.querySelector(".jb-acct-enter");
    var userBox = wrap.querySelector(".jb-acct-user");
    var trigger = wrap.querySelector(".jb-acct-trigger");
    var menu = wrap.querySelector(".jb-acct-menu");
    var avatar = wrap.querySelector(".jb-acct-avatar");
    var nameEl = wrap.querySelector(".jb-acct-name");
    var mAvatar = wrap.querySelector(".jb-acct-menu-avatar");
    var mName = wrap.querySelector(".jb-acct-menu-name");
    var mEmail = wrap.querySelector(".jb-acct-menu-email");
    var signout = wrap.querySelector(".jb-acct-signout");

    function initials(name) {
      return (name || "U").trim().slice(0, 1).toUpperCase();
    }
    function paintAvatar(el, u) {
      el.dataset.letter = initials(u.name);
      el.classList.add("is-letter");
      el.style.backgroundImage = "";
      if (u.avatar) {
        var probe = new Image();
        probe.referrerPolicy = "no-referrer";
        probe.onload = function () {
          el.style.backgroundImage = 'url("' + u.avatar + '")';
          el.classList.remove("is-letter");
        };
        probe.src = u.avatar;
      }
    }

    enterBtn.addEventListener("click", function () {
      enterBtn.disabled = true;
      enterBtn.querySelector("span").textContent = "Abrindo…";
      window.JBAuth.signInWithGoogle(window.location.href);
    });
    signout.addEventListener("click", function () {
      closeMenu();
      window.JBAuth.signOut().then(function () { window.location.reload(); });
    });
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !menu.hidden;
      if (open) closeMenu(); else openMenu();
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    function openMenu() { menu.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
    function closeMenu() { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }

    function render(u) {
      if (u) {
        enterBtn.hidden = true;
        userBox.hidden = false;
        nameEl.textContent = u.name;
        mName.textContent = u.name;
        mEmail.textContent = u.email || "";
        paintAvatar(avatar, u);
        paintAvatar(mAvatar, u);
      } else {
        userBox.hidden = true;
        enterBtn.hidden = false;
        enterBtn.disabled = false;
        enterBtn.querySelector("span").textContent = "Entrar";
        closeMenu();
      }
    }

    window.JBAuth.onChange(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
