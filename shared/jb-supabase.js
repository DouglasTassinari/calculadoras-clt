/* ============================================================
   Jornada Brasil — cliente Supabase compartilhado
   Autenticação (Google OAuth) + persistência com RLS.
   Carregue ANTES deste arquivo o SDK:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ============================================================ */
(function () {
  "use strict";

  var SUPABASE_URL = "https://spiiwtqavxjtdxeeqlbf.supabase.co";
  var SUPABASE_KEY = "sb_publishable_YKnz7jwIWESAUT8y1NlC2A_5P-hu0Gu";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[JB] SDK do Supabase não carregou.");
    window.JBAuth = makeStub();
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "jb-auth",
      flowType: "pkce",
    },
  });

  window.jbSupa = client;

  var _user = null;
  var _listeners = [];
  var _resolveReady;
  var _ready = new Promise(function (r) { _resolveReady = r; });

  function notify() {
    _listeners.forEach(function (cb) { try { cb(_user); } catch (e) {} });
  }

  function normalize(session) {
    if (!session || !session.user) return null;
    var u = session.user;
    var m = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email || m.email || "",
      name: m.full_name || m.name || (u.email ? u.email.split("@")[0] : "Usuário"),
      avatar: m.avatar_url || m.picture || "",
      raw: u,
    };
  }

  // Garante uma linha em profiles e atualiza o último acesso.
  function syncProfile(u) {
    if (!u) return;
    client.from("profiles").upsert({
      id: u.id,
      email: u.email,
      full_name: u.name,
      avatar_url: u.avatar,
      last_seen: new Date().toISOString(),
    }, { onConflict: "id" }).then(function (res) {
      if (res && res.error) console.warn("[JB] profile sync:", res.error.message);
    });
  }

  client.auth.getSession().then(function (res) {
    _user = normalize(res && res.data ? res.data.session : null);
    if (_user) syncProfile(_user);
    _resolveReady(_user);
    notify();
  });

  client.auth.onAuthStateChange(function (event, session) {
    var next = normalize(session);
    var changed = (next && next.id) !== (_user && _user.id);
    _user = next;
    if (event === "SIGNED_IN" && _user) syncProfile(_user);
    if (changed || event === "SIGNED_IN" || event === "SIGNED_OUT") notify();
  });

  window.JBAuth = {
    client: client,
    ready: _ready,
    get user() { return _user; },
    isLoggedIn: function () { return !!_user; },
    onChange: function (cb) {
      _listeners.push(cb);
      if (_user !== undefined) { try { cb(_user); } catch (e) {} }
      return function () { _listeners = _listeners.filter(function (f) { return f !== cb; }); };
    },
    signInWithGoogle: function (redirectTo) {
      return client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo || window.location.href,
          queryParams: { prompt: "select_account" },
        },
      });
    },
    signOut: function () {
      return client.auth.signOut().then(function () {
        _user = null; notify();
      });
    },
    // Retorna o usuário se logado; senão dispara o login Google e retorna null.
    requireLogin: function (redirectTo) {
      return _ready.then(function () {
        if (_user) return _user;
        window.JBAuth.signInWithGoogle(redirectTo);
        return null;
      });
    },
  };

  function makeStub() {
    return {
      ready: Promise.resolve(null),
      user: null,
      isLoggedIn: function () { return false; },
      onChange: function (cb) { cb(null); return function () {}; },
      signInWithGoogle: function () { alert("Serviço de login indisponível no momento."); },
      signOut: function () { return Promise.resolve(); },
      requireLogin: function () { return Promise.resolve(null); },
    };
  }
})();
