/* ============================================================
   Jornada Brasil — camada de dados (Supabase)
   Orçamentos (Calcular Preço) e Registros (Meu Lucro).
   Depende de window.jbSupa e window.JBAuth (jb-supabase.js).
   ============================================================ */
(function () {
  "use strict";

  function uid() { return window.JBAuth && window.JBAuth.user ? window.JBAuth.user.id : null; }
  function sb() { return window.jbSupa; }

  window.JBData = {
    // ---------------- Orçamentos ----------------
    listOrcamentos: function () {
      return sb().from("orcamentos").select("*").order("created_at", { ascending: false });
    },
    getOrcamento: function (id) {
      return sb().from("orcamentos").select("*").eq("id", id).single();
    },
    saveOrcamento: function (o) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      return sb().from("orcamentos").insert({
        user_id: u,
        nome: o.nome || "Orçamento",
        valor_hora: o.valor_hora != null ? o.valor_hora : null,
        custos: o.custos || {},
        margem: o.margem != null ? o.margem : null,
        preco_final: o.preco_final != null ? o.preco_final : null,
        params: o.params || {},
      }).select().single();
    },
    updateOrcamento: function (id, o) {
      var patch = {};
      ["nome", "valor_hora", "custos", "margem", "preco_final", "params"].forEach(function (k) {
        if (o[k] !== undefined) patch[k] = o[k];
      });
      return sb().from("orcamentos").update(patch).eq("id", id).select().single();
    },
    deleteOrcamento: function (id) {
      return sb().from("orcamentos").delete().eq("id", id);
    },

    // ---------------- Registros Meu Lucro ----------------
    listRegistros: function (range) {
      var q = sb().from("registros_meu_lucro").select("*").order("data", { ascending: false });
      if (range && range.from) q = q.gte("data", range.from);
      if (range && range.to) q = q.lte("data", range.to);
      return q;
    },
    insertRegistro: function (r) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      return sb().from("registros_meu_lucro").insert(mapReg(r, u)).select().single();
    },
    upsertRegistro: function (r) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      var row = mapReg(r, u);
      if (r.id) row.id = r.id;
      return sb().from("registros_meu_lucro").upsert(row, { onConflict: "id" }).select().single();
    },
    updateRegistro: function (id, r) {
      var u = uid();
      var patch = mapReg(r, u);
      delete patch.user_id;
      return sb().from("registros_meu_lucro").update(patch).eq("id", id).select().single();
    },
    deleteRegistro: function (id) {
      return sb().from("registros_meu_lucro").delete().eq("id", id);
    },

    // ---------------- Histórico de cálculos (Fase 3) ----------------
    listHistorico: function (tipo) {
      var q = sb().from("historico_calculos").select("*").order("created_at", { ascending: false });
      if (tipo) q = q.eq("tipo", tipo);
      return q;
    },
    saveHistorico: function (h) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      return sb().from("historico_calculos").insert({
        user_id: u,
        tipo: h.tipo || "calculo",
        titulo: h.titulo || null,
        url: h.url || null,
        valor_principal: h.valor_principal != null ? h.valor_principal : null,
        valor_label: h.valor_label || null,
        resumo: h.resumo || [],
        inputs: h.inputs || {},
      }).select().single();
    },
    updateHistorico: function (id, h) {
      var patch = {};
      ["tipo", "titulo", "url", "valor_principal", "valor_label", "resumo", "inputs"].forEach(function (k) {
        if (h[k] !== undefined) patch[k] = h[k];
      });
      return sb().from("historico_calculos").update(patch).eq("id", id).select().single();
    },
    deleteHistorico: function (id) {
      return sb().from("historico_calculos").delete().eq("id", id);
    },

    // ---------------- Favoritos (Fase 4) ----------------
    listFavoritos: function (tipo) {
      var q = sb().from("favoritos").select("*").order("created_at", { ascending: false });
      if (tipo) q = q.eq("tipo", tipo);
      return q;
    },
    addFavorito: function (f) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      return sb().from("favoritos").upsert({
        user_id: u,
        tipo: f.tipo || "calculadora",
        slug: f.slug,
        titulo: f.titulo || null,
        url: f.url || null,
      }, { onConflict: "user_id,tipo,slug" }).select().single();
    },
    removeFavorito: function (tipo, slug) {
      var u = uid();
      if (!u) return Promise.resolve({ error: { message: "Não autenticado" } });
      return sb().from("favoritos").delete().eq("user_id", u).eq("tipo", tipo).eq("slug", slug);
    },

    // ---------------- Perfil / plano (Fases 1 e 8) ----------------
    getProfile: function () {
      var u = uid();
      if (!u) return Promise.resolve({ data: null, error: { message: "Não autenticado" } });
      return sb().from("profiles").select("*").eq("id", u).single();
    },
  };

  function mapReg(r, u) {
    return {
      user_id: u,
      data: r.data,
      receita: num(r.receita),
      combustivel: num(r.combustivel),
      manutencao: num(r.manutencao),
      despesas: num(r.despesas),
      km: num(r.km),
      lucro: num(r.lucro),
      meta: num(r.meta),
    };
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
})();
