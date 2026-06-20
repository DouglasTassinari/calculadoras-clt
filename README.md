# Orça Justo — MVP

Calculadora de orçamento e precificação para prestadores autônomos (construção civil).
Resolve a dor: *"Quanto cobrar pra não trabalhar meses e descobrir que ganhei menos do que imaginava?"*

## Como usar

Basta abrir **`index.html`** no navegador (duplo-clique). Não precisa instalar nada.

Funciona em celular, tablet e computador. Para usar no celular, hospede o arquivo (veja abaixo).

## O que faz

1. **Seus dados** — meta por dia, dias/semana, ajudante, deslocamento, margem, cidade.
2. **Serviços** — nome, quantidade, unidade e complexidade. O tempo (dias úteis) é calculado automaticamente a partir da tabela de produtividade.
3. **Resultado** — preço mínimo / recomendado / premium + a explicação de como chegou no valor.
4. **Diferencial** — mostra *quanto você realmente ganha por dia* com aquele preço, e um **simulador reverso**: digite qualquer valor de obra e veja sua remuneração diária subir ou cair.
5. **Aditivos** — registre serviços extras ou não executados durante a obra e gere o valor atualizado para apresentar ao cliente.
6. **PDF** — botão "Salvar / imprimir PDF" (imprime só o orçamento + relatório de aditivos).

## Arquivos

- `index.html` — o app inteiro (React + Tailwind via CDN, sem build).
- `produtividade.json` — tabela de rendimento por dia e fatores de complexidade. **Edite aqui** para ajustar os números à sua realidade. (Ao abrir via `file://` o app usa uma cópia embutida idêntica; quando hospedado em servidor, ele lê este arquivo.)

## Lógica de cálculo

- `dias do serviço = quantidade / (rendimento/dia × fator de complexidade)`
  - Complexidade: Baixa ×1,15 · Média ×1,0 · Alta ×0,8
- `total de dias úteis = arredonda pra cima a soma dos serviços`
- `mão de obra = dias × meta/dia`
- `custos operacionais = dias × (deslocamento + ajudante)`
- `preço mínimo = mão de obra + custos operacionais`
- `preço recomendado = preço mínimo × (1 + margem%)`
- `preço premium = recomendado × 1,15`
- **Ganho real por dia** `= (preço − custos operacionais) / dias`

## Publicar para testar no celular (grátis, 1 minuto)

Arraste a pasta inteira para **[Netlify Drop](https://app.netlify.com/drop)** ou suba no GitHub Pages / Vercel. Você recebe um link para mandar aos prestadores.

## Próximos passos (quando validar)

- Migrar para Next.js + React + Tailwind (a lógica já está isolada e é portável).
- Login, salvar histórico de orçamentos, multi-área (além de construção civil).
- PDF com layout de proposta comercial (logo, dados do cliente, assinatura).
