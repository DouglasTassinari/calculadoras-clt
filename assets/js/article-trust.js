/* =====================================================================
   JORNADA BRASIL — Fontes e revisão editorial dos artigos
   ---------------------------------------------------------------------
   Cada artigo mantém no HTML um resumo estático de responsabilidade
   editorial. Este script completa o bloco com referências pertinentes
   ao tema, para que o leitor encontre a fonte primária sem procurar
   em outra página do portal.
   ===================================================================== */
(function () {
  'use strict';

  var SOURCE_GROUPS = {
    labor: [
      {
        label: 'CLT compilada — Decreto-Lei nº 5.452/1943',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm'
      },
      {
        label: 'Ministério do Trabalho e Emprego',
        href: 'https://www.gov.br/trabalho-e-emprego/pt-br'
      }
    ],
    laborTax: [
      {
        label: 'CLT compilada — Decreto-Lei nº 5.452/1943',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm'
      },
      {
        label: 'Tabelas de tributação de 2026 — Receita Federal',
        href: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026'
      },
      {
        label: 'Portaria Interministerial MPS/MF nº 13/2026 — INSS',
        href: 'https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf'
      }
    ],
    tax: [
      {
        label: 'Tabelas de tributação de 2026 — Receita Federal',
        href: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026'
      },
      {
        label: 'Portaria Interministerial MPS/MF nº 13/2026 — INSS',
        href: 'https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf'
      }
    ],
    socialSecurity: [
      {
        label: 'Portaria Interministerial MPS/MF nº 13/2026',
        href: 'https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf'
      },
      {
        label: 'Lei nº 8.213/1991 — benefícios da Previdência Social',
        href: 'https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm'
      }
    ],
    minimumWage: [
      {
        label: 'Decreto nº 12.797/2025 — salário mínimo de 2026',
        href: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm'
      },
      {
        label: 'Portaria Interministerial MPS/MF nº 13/2026',
        href: 'https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf'
      }
    ],
    fgts: [
      {
        label: 'Regras do FGTS — portal oficial',
        href: 'https://www.fgts.gov.br/Paginas/sobre-o-fgts/regras.aspx'
      },
      {
        label: 'Lei nº 8.036/1990 — Fundo de Garantia do Tempo de Serviço',
        href: 'https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm'
      }
    ],
    unemployment: [
      {
        label: 'Seguro-desemprego — perguntas frequentes no Gov.br',
        href: 'https://www.gov.br/pt-br/temas/perguntas-frequentes-seguro-desemprego'
      },
      {
        label: 'Lei nº 7.998/1990 — Programa do Seguro-Desemprego',
        href: 'https://www.planalto.gov.br/ccivil_03/leis/l7998compilado.htm'
      }
    ],
    safety: [
      {
        label: 'CLT compilada — segurança e medicina do trabalho',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm'
      },
      {
        label: 'Normas Regulamentadoras — Ministério do Trabalho e Emprego',
        href: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/ctpp-nrs/normas-regulamentadoras-nrs'
      }
    ],
    finance: [
      {
        label: 'Cidadania Financeira — Banco Central do Brasil',
        href: 'https://www.bcb.gov.br/cidadaniafinanceira/indexcidadaniafinanceira'
      },
      {
        label: 'Metodologia das ferramentas do Jornada Brasil',
        href: '/metodologia/'
      }
    ],
    termination: [
      {
        label: 'CLT compilada — rescisão e aviso prévio',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm'
      },
      {
        label: 'Regras do FGTS — portal oficial',
        href: 'https://www.fgts.gov.br/Paginas/sobre-o-fgts/regras.aspx'
      },
      {
        label: 'Seguro-desemprego — perguntas frequentes no Gov.br',
        href: 'https://www.gov.br/pt-br/temas/perguntas-frequentes-seguro-desemprego'
      }
    ]
  };

  var PAGE_GROUPS = {
    '/blog/vale-transporte/': 'labor',
    '/blog/salario-minimo-2026/': 'minimumWage',
    '/blog/insalubridade/': 'safety',
    '/blog/seguro-desemprego-como-funciona/': 'unemployment',
    '/blog/planejar-13-e-ferias/': 'finance',
    '/blog/periculosidade/': 'safety',
    '/blog/fgts-saque-aniversario/': 'fgts',
    '/blog/financas-do-autonomo/': 'finance',
    '/blog/inss-autonomo/': 'socialSecurity',
    '/blog/banco-de-horas/': 'labor',
    '/blog/licenca-maternidade/': 'socialSecurity',
    '/blog/trabalho-noturno/': 'labor',
    '/blog/decimo-terceiro-salario/': 'laborTax',
    '/blog/demissao-por-acordo/': 'termination',
    '/blog/auxilio-doenca-inss/': 'socialSecurity',
    '/blog/quanto-cobrar-por-hora/': 'finance',
    '/blog/jornada-de-trabalho/': 'labor',
    '/blog/como-sair-das-dividas/': 'finance',
    '/blog/reserva-de-emergencia/': 'finance',
    '/blog/inss-tabela-2026/': 'socialSecurity',
    '/blog/orcamento-50-30-20/': 'finance',
    '/blog/como-funciona-aviso-previo/': 'termination',
    '/blog/como-calcular-salario-liquido/': 'tax',
    '/blog/como-calcular-margem-de-lucro/': 'finance',
    '/blog/quanto-ganha-motorista-aplicativo/': 'finance',
    '/blog/como-calcular-horas-extras/': 'labor',
    '/blog/irrf-tabela-2026/': 'tax',
    '/blog/como-funciona-fgts/': 'fgts',
    '/blog/como-calcular-rescisao/': 'termination',
    '/blog/clt-vs-pj/': 'laborTax',
    '/blog/como-calcular-dsr/': 'labor',
    '/blog/contrato-de-experiencia/': 'labor',
    '/blog/como-precificar-servico/': 'finance',
    '/blog/direitos-do-trabalhador-clt/': 'labor',
    '/blog/como-calcular-ferias/': 'laborTax',
    '/blog/demissao-sem-justa-causa/': 'termination'
  };

  function isExternal(href) {
    return /^https?:\/\//i.test(href);
  }

  function createLink(source) {
    var link = document.createElement('a');
    link.href = source.href;
    link.textContent = source.label;
    if (isExternal(source.href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  function renderSources(target, sources) {
    while (target.firstChild) target.removeChild(target.firstChild);

    var title = document.createElement('h2');
    title.id = 'article-sources-heading';
    title.textContent = 'Fontes desta página';
    target.appendChild(title);

    var intro = document.createElement('p');
    intro.textContent = 'As referências abaixo sustentam as regras e os valores citados neste guia.';
    target.appendChild(intro);

    var list = document.createElement('ul');
    sources.forEach(function (source) {
      var item = document.createElement('li');
      item.appendChild(createLink(source));
      list.appendChild(item);
    });
    target.appendChild(list);

    var note = document.createElement('p');
    note.className = 'article-trust__note';
    note.textContent = 'Em caso de mudança na norma ou divergência com a fonte, o conteúdo é revisado.';
    target.appendChild(note);
  }

  function init() {
    var target = document.querySelector('[data-article-sources]');
    if (!target) return;

    var group = PAGE_GROUPS[window.location.pathname] || 'labor';
    renderSources(target, SOURCE_GROUPS[group]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
