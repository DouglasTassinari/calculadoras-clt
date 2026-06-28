/* ============================================================
   Jornada Brasil — camada de PLANOS e PERMISSÕES (Fase 8)
   Arquitetura de monetização preparada, porém DESLIGADA por padrão.
   Enquanto JB_BILLING_ATIVO === false, TODOS os recursos e limites
   ficam liberados. Quando decidirmos cobrar, basta:
     1) trocar JB_BILLING_ATIVO para true;
     2) o campo profiles.plano ('free'/'premium') passa a valer.
   Depende (opcionalmente) de window.JBData / window.JBAuth.
   ============================================================ */
(function () {
  "use strict";

  // >>> CHAVE MESTRA: enquanto false, nada é bloqueado. <<<
  var JB_BILLING_ATIVO = false;

  // Definição dos planos. Os limites só passam a valer com billing ativo.
  // null = ilimitado.
  var PLANOS = {
    free: {
      nome: "Gratuito",
      limites: {
        orcamentos: null,        // futuramente: ex. 5
        historico: null,         // futuramente: ex. 20
        favoritos: null,
        pdf_sem_marca: false,    // remover marca d'água é recurso premium (futuro)
        exportar_csv: false,
      },
    },
    premium: {
      nome: "Premium",
      limites: {
        orcamentos: null,
        historico: null,
        favoritos: null,
        pdf_sem_marca: true,
        exportar_csv: true,
      },
    },
  };

  var _profile = null;

  function planoAtual() {
    if (!JB_BILLING_ATIVO) return "premium"; // tudo liberado enquanto desligado
    var p = _profile && _profile.plano;
    return PLANOS[p] ? p : "free";
  }

  function limites() {
    return PLANOS[planoAtual()].limites;
  }

  window.JBPlano = {
    BILLING_ATIVO: JB_BILLING_ATIVO,
    PLANOS: PLANOS,

    // Carrega o perfil (plano/limites) do Supabase, se logado. Fail-safe.
    load: function () {
      if (!window.JBData || !window.JBData.getProfile) return Promise.resolve(null);
      return window.JBData.getProfile().then(function (r) {
        if (r && r.data) _profile = r.data;
        return _profile;
      }).catch(function () { return null; });
    },

    plano: planoAtual,
    isPremium: function () { return planoAtual() === "premium"; },
    nomePlano: function () { return PLANOS[planoAtual()].nome; },
    limites: limites,

    // Permissão booleana de recurso (ex.: 'pdf_sem_marca').
    can: function (feature) {
      if (!JB_BILLING_ATIVO) return true;
      var l = limites();
      return l && l[feature] === true;
    },

    // Verifica se um contador (ex.: 'orcamentos'=3) ainda está dentro do limite.
    withinLimit: function (chave, usoAtual) {
      if (!JB_BILLING_ATIVO) return true;
      var lim = limites()[chave];
      if (lim == null) return true; // ilimitado
      return Number(usoAtual || 0) < Number(lim);
    },

    // "Middleware" declarativo: executa allow() se permitido, senão deny().
    enforce: function (feature, allow, deny) {
      if (this.can(feature)) { if (typeof allow === "function") allow(); return true; }
      if (typeof deny === "function") deny(); return false;
    },
  };

  // Pré-carrega o perfil quando o usuário estiver pronto (sem bloquear nada).
  if (window.JBAuth && window.JBAuth.ready && window.JBAuth.ready.then) {
    window.JBAuth.ready.then(function (u) { if (u) window.JBPlano.load(); });
  }
})();
