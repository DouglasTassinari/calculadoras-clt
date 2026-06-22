# Orça Justo — MVP

Calculadora **genérica** de orçamento e precificação para prestadores de serviço autônomos.
Resolve a dor: *"Quanto cobrar pra não trabalhar meses e descobrir que ganhei menos do que imaginava?"*

Todo o cálculo é baseado **no que o usuário preenche** — não há tabelas ou serviços pré-definidos, então serve para qualquer área (construção, jardinagem, manutenção, etc.).

## Como usar

Basta abrir **`index.html`** no navegador (duplo-clique). Não precisa instalar nada.

Funciona em celular, tablet e computador. Para usar no celular, hospede o arquivo (veja abaixo).

## O que faz

1. **Seus dados** — meta por dia, dias/semana, ajudante, deslocamento, margem.
2. **Serviços** — nome (texto livre), quantidade, unidade, **quanto você rende por dia** e complexidade. O tempo (dias úteis) é calculado a partir desses valores.
3. **Resultado** — preço mínimo / recomendado / premium + a explicação de como chegou no valor.
4. **Diferencial** — mostra *quanto você realmente ganha por dia* com aquele preço, e um **simulador reverso**: digite qualquer valor de obra e veja sua remuneração diária subir ou cair.
5. **Aditivos** — registre serviços extras ou não executados durante a obra e gere o valor atualizado para apresentar ao cliente.
6. **PDF** — botão "Imprimir orçamento do cliente" (imprime só o orçamento do cliente + relatório de aditivos).
7. **Configurar Meu Negócio** (opcional) — tela separada onde você cadastra seus custos fixos mensais e sua capacidade (dias/mês, horas/dia). A ferramenta calcula sua **diária mínima** e sua **hora mínima** — quanto você precisa cobrar pra não trabalhar no prejuízo. Marcando "Usar custo real do meu negócio" no orçamento, a mão de obra passa a usar esse valor automaticamente.

## Persistência

- O **orçamento** NÃO é salvo: cada F5 começa em branco.
- A **configuração do negócio** é salva em LocalStorage (chave `orcajusto_negocio_v1`), preenchida uma vez só, neste aparelho.

## Arquivos

- `index.html` — o app inteiro (React + Tailwind via CDN, sem build).

## Lógica de cálculo

- `dias do serviço = quantidade / (rendimento informado × fator de complexidade)`
  - Complexidade: Baixa ×1,15 (rende mais, ~13% menos dias) · Média ×1,0 · Alta ×0,8 (rende menos, ~25% mais dias)
- `total de dias úteis = arredonda pra cima a soma dos serviços`
- `mão de obra = dias × meta/dia`
- `custos operacionais = dias × (deslocamento + ajudante)`
- `preço mínimo = mão de obra + custos operacionais`
- `preço recomendado = preço mínimo × (1 + margem%)`
- `preço premium = recomendado × 1,15`
- **Ganho real por dia** `= (preço − custos operacionais) / dias`

### Configurar Meu Negócio
- `total de custos mensais = soma dos custos fixos`
- `diária mínima = total de custos mensais ÷ dias trabalhados por mês`
- `hora mínima = diária mínima ÷ horas por dia`
- Com "Usar custo real" ligado, `meta/dia` passa a ser a **diária mínima**.

## Publicar para testar no celular (grátis, 1 minuto)

Arraste a pasta inteira para **[Netlify Drop](https://app.netlify.com/drop)** ou suba no GitHub Pages / Vercel. Você recebe um link para mandar aos prestadores.

## Próximos passos (quando validar)

- Migrar para Next.js + React + Tailwind (a lógica já está isolada e é portável).
- Login, salvar histórico de orçamentos, presets de produtividade por área (opcionais).
- PDF com layout de proposta comercial (logo, dados do cliente, assinatura).
