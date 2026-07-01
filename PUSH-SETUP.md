# Notificações Web Push — Guia de ativação

Sistema de notificações do Jornada Brasil. O visitante vê um convite ("Receba as
novidades…"), autoriza, e passa a receber push quando sai **artigo novo**,
**calculadora nova** ou **atualização da plataforma**.

## Componentes

| Peça | Arquivo | O que faz |
|------|---------|-----------|
| Opt-in + inscrição | `assets/js/jb-push.js` | Banner de autorização, inscreve no PushManager e grava a assinatura no Supabase. Carregado por `pwa.js` em todas as páginas. |
| Recepção/exibição | `service-worker.js` | Handlers `push` e `notificationclick`. |
| Armazenamento | `supabase-push-schema.sql` | Tabela `push_subscriptions` + RLS. |
| Envio | `supabase/functions/send-push/index.ts` | Edge Function que envia para todos os inscritos (usa VAPID). |
| Disparo automático | `.github/workflows/notify-on-publish.yml` | Detecta publicação e chama a função; também permite disparo manual. |

## Passo a passo (uma vez)

### 1. Banco de dados
No **SQL Editor** do Supabase, rode o conteúdo de `supabase-push-schema.sql`.

### 2. Chaves VAPID
A **chave pública** já está em `jb-push.js` e é referenciada pela função.
A **chave privada** correspondente foi entregue separadamente (é secreta — não versionar).
Se quiser gerar um novo par: `npx web-push generate-vapid-keys`
(ao trocar as chaves, os inscritos atuais precisam se reinscrever).

### 3. Deploy da Edge Function
```bash
supabase functions deploy send-push --no-verify-jwt

supabase secrets set \
  VAPID_PUBLIC_KEY="BKMYr27eSciXa0rCmWXrTJD3Bgd7r2MMaiR2aaRSMFX2Ls9ni3wVv0wyniq7ovoTVNkHuwNJKujoBOgkbh0rOVg" \
  VAPID_PRIVATE_KEY="<CHAVE_PRIVADA_SECRETA>" \
  VAPID_SUBJECT="mailto:contato@jornadabrasil.com.br" \
  PUSH_SEND_SECRET="<gere-um-segredo-forte>"
```

### 4. Segredo no GitHub
Em **Settings → Secrets and variables → Actions**, crie o secret
`PUSH_SEND_SECRET` com o **mesmo valor** usado na função.

## Uso

- **Automático:** ao dar merge/push em `master` com um novo `blog/<slug>/index.html`
  ou uma nova pasta `<slug>/index.html` no topo, o workflow envia a notificação.
- **Manual (plataforma):** GitHub → Actions → *Notificar inscritos* → *Run workflow*,
  preenchendo título, texto, URL e tópico.
- **Teste rápido:**
  ```bash
  curl -X POST "https://spiiwtqavxjtdxeeqlbf.supabase.co/functions/v1/send-push" \
    -H "x-send-secret: <PUSH_SEND_SECRET>" -H "Content-Type: application/json" \
    -d '{"title":"Teste","body":"Funcionando!","url":"/","topic":"plataforma"}'
  ```

## Observações
- **iOS/iPadOS:** só recebe push se o site estiver **instalado na tela inicial** (PWA),
  a partir do iOS 16.4. Android/desktop (Chrome, Edge, Firefox) funcionam no navegador.
- **LGPD:** nenhum dado é enviado a terceiros; as assinaturas ficam no seu Supabase.
  O push só é ativado por ação explícita do usuário.
- **Limpeza automática:** inscrições expiradas (HTTP 404/410) são removidas a cada envio.
