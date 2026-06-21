# Meu Lucro

PWA simples para motoristas de aplicativo (Uber, 99, InDrive…) controlarem o
**lucro real** de cada dia, sem burocracia.

Funciona de dois jeitos:

- **Com Firebase** (recomendado): login por e-mail/senha e dados salvos na nuvem
  (Firestore), vinculados ao usuário e **sincronizados em tempo real** entre
  celular, outro celular e computador. Trocar de aparelho ou limpar o navegador
  não apaga o histórico.
- **Modo local** (sem configurar nada): roda direto no navegador usando
  LocalStorage. Ótimo para testar; os dados ficam só naquele aparelho.

O app detecta sozinho: se o `config.js` estiver preenchido com as chaves do
Firebase, ele exige login; caso contrário, entra em modo local.

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

## Configurar o Firebase (login + nuvem)

Tudo é feito pelo Firebase, sem backend próprio.

### 1. Criar o projeto
1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `meu-lucro`) e conclua a criação.

### 2. Ativar a autenticação por e-mail/senha
1. No menu lateral: **Build → Authentication → Get started**.
2. Aba **Sign-in method → Email/Password → Ativar → Salvar**.
   (O envio de "esqueci minha senha" já funciona com isso.)

### 3. Criar o banco Firestore
1. No menu: **Build → Firestore Database → Create database**.
2. Escolha **Production mode** e uma região (ex.: `southamerica-east1`).
3. Vá na aba **Regras** e cole o conteúdo do arquivo
   [`firestore.rules`](firestore.rules) deste projeto → **Publicar**.
   (Isso garante que cada usuário só lê/escreve os próprios dados.)

### 4. Pegar as chaves do app web
1. **Configurações do projeto** ( engrenagem) **→ Seus apps → Web (`</>`)**.
2. Registre um app web e copie o objeto `firebaseConfig`.
3. Copie o arquivo `config.example.js` para **`config.js`** e cole suas chaves.
   - `config.js` está no `.gitignore` (não vai pro Git).
   - As chaves web do Firebase **são públicas por natureza** — a segurança vem
     das Regras do Firestore + Authentication. Se quiser que o site publicado no
     GitHub Pages já tenha login, basta **versionar o `config.js`** (remova a
     linha dele do `.gitignore`).

### 5. Autorizar o domínio (ao publicar)
Em **Authentication → Settings → Authorized domains**, adicione o domínio do
GitHub Pages (ex.: `seu-usuario.github.io`). `localhost` já vem autorizado.

### Estrutura dos dados no Firestore
```
users/{uid}                      -> { name, config: { model, year,
                                       dailyGoal, monthlyGoal, costKm } }
users/{uid}/records/{recordId}   -> { id, date, revenue, km, fuel, other }
```

## Arquivos
| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página única + tela de login |
| `style.css` | Visual (cards, modais, login, responsivo) |
| `script.js` | Lógica, cálculos, Firestore e LocalStorage |
| `auth.js` | Inicialização do Firebase e ações de login/cadastro |
| `config.example.js` | Modelo de chaves do Firebase (copie para `config.js`) |
| `config.js` | Suas chaves do Firebase (**não versionado**) |
| `firestore.rules` | Regras de segurança do Firestore |
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
