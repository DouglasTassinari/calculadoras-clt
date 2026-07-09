/*!
 * latest-posts.js — Jornada Brasil
 * Mantém o bloco "Últimos artigos" da home sincronizado com o blog.
 *
 * REGRA / COMO FUNCIONA:
 *   Este script busca a página /blog/ e copia os 3 primeiros cards (.blog-card)
 *   da listagem para o grid da home marcado com [data-latest-posts].
 *   Ou seja: sempre que você publicar um post novo e adicionar o card no TOPO
 *   de /blog/index.html (como já é feito), a home passa a exibi-lo sozinha —
 *   sem precisar editar a home. Não é preciso mexer neste arquivo.
 *
 * Requisitos para funcionar:
 *   - Os posts em /blog/index.html devem estar em ordem do mais novo para o mais
 *     antigo (novos entram no topo do .blog-grid).
 *   - Os cards da home usam a mesma estrutura .blog-card do blog.
 *
 * Se a busca falhar (offline, etc.), o conteúdo estático já presente no HTML
 * permanece como fallback — nada quebra.
 */
(function () {
  'use strict';

  var QTD = 3; // quantos cards mostrar na home

  function init() {
    var grid = document.querySelector('[data-latest-posts]');
    if (!grid) return;

    fetch('/blog/', { credentials: 'same-origin' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var source = doc.querySelector('.blog-grid');
        if (!source) return;

        var cards = source.querySelectorAll('.blog-card');
        if (!cards.length) return;

        var frag = document.createDocumentFragment();
        for (var i = 0; i < cards.length && frag.childNodes.length < QTD; i++) {
          // só considera cards que apontam para um artigo do blog
          var link = cards[i].querySelector('h3 a[href^="/blog/"]');
          if (!link) continue;
          frag.appendChild(document.importNode(cards[i], true));
        }

        if (frag.childNodes.length) {
          grid.innerHTML = '';
          grid.appendChild(frag);
        }
      })
      .catch(function () {
        /* mantém o fallback estático da home */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
