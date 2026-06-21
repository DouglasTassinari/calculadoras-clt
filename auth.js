/* ============================================================
   Meu Lucro — integração Firebase (Auth + Firestore)

   Este arquivo só INICIALIZA o Firebase e expõe ações de
   autenticação em window.FB. A lógica de dados/UI fica no
   script.js, que consome window.FB.

   Se as chaves não estiverem configuradas (config.js ausente
   ou com valores de exemplo), o app roda em "modo local"
   usando apenas o LocalStorage.
   ============================================================ */

(function () {
  // Estado padrão: Firebase desligado (modo local).
  window.FB = {
    enabled: false,
    auth: null,
    db: null,
    get uid() {
      return this.auth && this.auth.currentUser ? this.auth.currentUser.uid : null;
    },
  };

  const cfg = window.firebaseConfig;

  // Detecta configuração ausente ou ainda com valores de exemplo.
  const looksFake =
    !cfg ||
    !cfg.apiKey ||
    !cfg.projectId ||
    /SUA_|SEU_|COLE_|XXXX|exemplo|example/i.test(String(cfg.apiKey) + String(cfg.projectId));

  if (typeof firebase === "undefined") {
    console.warn("[Meu Lucro] SDK do Firebase não carregou — rodando em modo local.");
    return;
  }
  if (looksFake) {
    console.warn("[Meu Lucro] Firebase não configurado — rodando em modo local. Edite config.js.");
    return;
  }

  // ---- Inicialização ----
  try {
    firebase.initializeApp(cfg);
  } catch (e) {
    console.error("[Meu Lucro] Falha ao iniciar o Firebase:", e);
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // Mantém a sessão entre acessos (padrão em navegadores: LOCAL).
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  // Cache offline do Firestore (funciona sem internet após o 1º acesso).
  db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    // failed-precondition (várias abas) ou unimplemented (navegador) — ok ignorar.
    console.warn("[Meu Lucro] Persistência offline do Firestore indisponível:", err && err.code);
  });

  // ---- Ações expostas ----
  window.FB = {
    enabled: true,
    auth,
    db,
    get uid() {
      return auth.currentUser ? auth.currentUser.uid : null;
    },
    // Cadastro: cria usuário e grava o nome no perfil.
    signup(name, email, password) {
      return auth
        .createUserWithEmailAndPassword(email, password)
        .then((cred) => cred.user.updateProfile({ displayName: name }).then(() => cred.user));
    },
    login(email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },
    logout() {
      return auth.signOut();
    },
    resetPassword(email) {
      return auth.sendPasswordResetEmail(email);
    },
  };

  // Traduz os códigos de erro do Firebase para mensagens claras.
  window.FB_ERROR = function (error) {
    const code = (error && error.code) || "";
    const map = {
      "auth/invalid-email": "E-mail inválido.",
      "auth/missing-password": "Digite sua senha.",
      "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
      "auth/email-already-in-use": "Este e-mail já tem uma conta. Tente entrar.",
      "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
      "auth/wrong-password": "E-mail ou senha incorretos.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
      "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    };
    return map[code] || "Algo deu errado. Tente novamente.";
  };
})();
