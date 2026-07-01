// ============================================================
// Jornada Brasil — Edge Function: send-push
// Envia uma notificação Web Push para todas as inscrições.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Secrets necessários (supabase secrets set ...):
//   VAPID_PUBLIC_KEY   — chave pública VAPID (mesma do cliente jb-push.js)
//   VAPID_PRIVATE_KEY  — chave privada VAPID (NUNCA versionar)
//   VAPID_SUBJECT      — ex: mailto:contato@jornadabrasil.com.br
//   PUSH_SEND_SECRET   — segredo compartilhado com quem dispara (GitHub Action)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.)
//
// Chamada:
//   POST /functions/v1/send-push
//   header: x-send-secret: <PUSH_SEND_SECRET>
//   body:   { "title": "...", "body": "...", "url": "/blog/...", "tag": "blog-...", "topic": "blog" }
// ============================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@jornadabrasil.com.br";
const SEND_SECRET = Deno.env.get("PUSH_SEND_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Autorização por segredo compartilhado
  if (!SEND_SECRET || req.headers.get("x-send-secret") !== SEND_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const title = String(payload.title ?? "Jornada Brasil").slice(0, 120);
  const body = String(payload.body ?? "").slice(0, 240);
  const url = String(payload.url ?? "/");
  const tag = payload.tag ? String(payload.tag) : undefined;
  const icon = payload.icon ? String(payload.icon) : undefined;
  const image = payload.image ? String(payload.image) : undefined;
  const topic = payload.topic ? String(payload.topic) : null; // filtra por tópico (opcional)

  if (!title) return json({ error: "missing_title" }, 400);

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  let query = supa.from("push_subscriptions").select("endpoint,p256dh,auth,topics");
  if (topic) query = query.contains("topics", [topic]);
  const { data: subs, error } = await query;
  if (error) return json({ error: "db_error", detail: error.message }, 500);

  const notification = JSON.stringify({ title, body, url, icon, image, tag });

  let sent = 0;
  let pruned = 0;
  const dead: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s) => {
      const subscription = {
        endpoint: s.endpoint as string,
        keys: { p256dh: s.p256dh as string, auth: s.auth as string },
      };
      try {
        await webpush.sendNotification(subscription, notification, { TTL: 86400 });
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 = inscrição expirada/cancelada → remover
        if (code === 404 || code === 410) dead.push(s.endpoint as string);
      }
    }),
  );

  if (dead.length) {
    const { error: delErr } = await supa
      .from("push_subscriptions")
      .delete()
      .in("endpoint", dead);
    if (!delErr) pruned = dead.length;
  }

  return json({ ok: true, total: subs?.length ?? 0, sent, pruned });
});
