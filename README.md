# Meu Lucro

PWA simples para motoristas de aplicativo (Uber, 99, InDrive…) controlarem o
**lucro real** de cada dia, sem burocracia. Tudo roda no navegador, sem backend,
com os dados salvos apenas no próprio aparelho (LocalStorage).

## Responde rápido a 3 perguntas
- Quanto eu **realmente** ganhei hoje?
- Quanto já ganhei no mês?
- Quanto **falta** para a minha meta?

## Como usar (local)
Abra o `index.html` no navegador. Para o Service Worker / instalação PWA funcionar
plenamente, sirva a pasta por HTTP (o `file://` não registra service worker):

```bash
# Python 3
python -m http.server 8000
# depois acesse http://localhost:8000
```

## Publicar no GitHub Pages
1. Suba o conteúdo desta pasta para um repositório.
2. Em **Settings → Pages**, selecione a branch e a pasta raiz.
3. Acesse a URL gerada — no celular, use "Adicionar à tela inicial" para instalar.

## Arquivos
| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página única |
| `style.css` | Visual (cards, modais, responsivo) |
| `script.js` | Lógica, cálculos e LocalStorage |
| `manifest.json` | Metadados do PWA |
| `service-worker.js` | Cache offline |
| `icon.svg` / `icon-maskable.svg` | Ícones do app |

## Como o cálculo funciona
```
Desgaste     = KM rodados × Custo por KM
Lucro líquido = Receita − Combustível − Outros gastos − Desgaste
```
O **custo por km** (padrão R$ 0,25) representa pneus, óleo, seguro, IPVA,
manutenção e depreciação — o gasto "invisível" de rodar.

## Trocar o nome do app
Altere a constante `APP_NAME` no topo do `script.js` e os campos `name` /
`short_name` do `manifest.json`.
