/* =====================================================================
   JORNADA BRASIL — analytics centralizado da plataforma.
   GA4 (G-MK3XD5ZVE0) + Microsoft Clarity (x7ir0zxu39) + helper jbTrack.
   Carregado pelos modulos /calcular-preco/ e /meu-lucro/. Idempotente:
   pode ser incluido mais de uma vez sem duplicar tags.
   (O portal na raiz mantem seu proprio setup inline, ja validado.)
   ===================================================================== */
(function () {
  if (window.__jbAnalytics) return;
  window.__jbAnalytics = true;

  var GA_ID = 'G-MK3XD5ZVE0';
  var CLARITY_ID = 'x7ir0zxu39';

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Consent Mode — analitico liberado, anuncios negados por padrao.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });
  gtag('js', new Date());
  gtag('config', GA_ID);

  // GA4
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(ga);

  // Microsoft Clarity
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);

  // Helper unico de eventos da plataforma (calc_used, journey_click,
  // orcamento_gerado, sign_up, login, user_return, dia_salvo...).
  window.jbTrack = function (name, params) {
    try { gtag('event', name, params || {}); } catch (e) {}
  };
})();
