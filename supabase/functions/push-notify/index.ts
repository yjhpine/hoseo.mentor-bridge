// 새 메시지 웹 푸시 알림 (docs/architecture.md 6.9).
// - {"action":"public_key"}: 브라우저가 구독할 때 쓰는 VAPID 공개 키를 돌려줍니다. 키가 없으면 처음 한 번 만듭니다.
// - {"message_id": n}: DB 트리거가 부릅니다. 메시지를 DB에서 다시 읽어 받는 사람의 브라우저마다 푸시합니다.
//   메시지마다 한 번만 보내고(push_deliveries), 만든 지 2분이 지난 메시지는 보내지 않아 밖에서 불러도 소용이 없습니다.
// secret 키는 이 함수 안에서만 씁니다. VAPID 개인 키는 정책 없는 표(push_vapid_keys)에 두어 secret 키로만 읽습니다.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"],
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const SITE_URL = "https://hoseo-mentor-bridge.yjhpine123.workers.dev";
const PREVIEW_LENGTH = 40;
const MAX_AGE_MS = 2 * 60 * 1000;

type ExportedKeys = Awaited<ReturnType<typeof webpush.exportVapidKeys>>;

async function loadOrCreateKeys(): Promise<ExportedKeys> {
  const { data, error } = await admin.from("push_vapid_keys").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (data) return { publicKey: data.public_key, privateKey: data.private_key } as ExportedKeys;

  const exported = await webpush.exportVapidKeys(await webpush.generateVapidKeys({ extractable: true }));
  // 동시에 두 번 만들어지면 먼저 들어간 키를 씁니다.
  await admin.from("push_vapid_keys").upsert(
    { id: 1, public_key: exported.publicKey, private_key: exported.privateKey },
    { onConflict: "id", ignoreDuplicates: true },
  );
  const again = await admin.from("push_vapid_keys").select("public_key, private_key").eq("id", 1).single();
  if (again.error) throw again.error;
  return { publicKey: again.data.public_key, privateKey: again.data.private_key } as ExportedKeys;
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64url(text: string) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** 브라우저 pushManager.subscribe의 applicationServerKey 형식 (압축하지 않은 P-256 공개 키, base64url) */
function applicationServerKey(jwk: JsonWebKey) {
  const x = fromBase64url(jwk.x!);
  const y = fromBase64url(jwk.y!);
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);
  return base64url(raw);
}

function preview(body: string) {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH)}…` : oneLine;
}

async function notify(messageId: number) {
  const { data: message, error } = await admin
    .from("messages")
    .select("id, room_id, sender_id, sender_role, body, created_at, hidden_at")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw error;
  if (!message || message.hidden_at) return { sent: 0, reason: "no message" };
  if (Date.now() - new Date(message.created_at).getTime() > MAX_AGE_MS) return { sent: 0, reason: "too old" };

  // 메시지마다 한 번만 보냅니다.
  const { error: dupError } = await admin.from("push_deliveries").insert({ message_id: message.id });
  if (dupError) return { sent: 0, reason: "already sent" };

  const { data: room, error: roomError } = await admin
    .from("chat_rooms")
    .select("id, mentor_id, mentee_id")
    .eq("id", message.room_id)
    .single();
  if (roomError) throw roomError;
  const recipient = message.sender_id === room.mentor_id ? room.mentee_id : room.mentor_id;

  const [{ data: sender }, { data: subscriptions, error: subError }] = await Promise.all([
    admin.from("profiles").select("name, name_tag").eq("id", message.sender_id).maybeSingle(),
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", recipient),
  ]);
  if (subError) throw subError;
  if (!subscriptions?.length) return { sent: 0, reason: "no subscription" };

  const senderName = sender ? sender.name + (sender.name_tag ?? "") : "";
  const isAnswer = message.sender_role === "mentor";
  const payload = JSON.stringify({
    title: isAnswer ? `${senderName} 멘토님의 답변이 도착했습니다` : `${senderName} 멘티님의 새 질문이 도착했습니다`,
    body: preview(message.body),
    url: `/chats/${room.id}`,
    tag: `room-${room.id}`,
  });

  const keys = await webpush.importVapidKeys(await loadOrCreateKeys());
  const server = await webpush.ApplicationServer.new({ contactInformation: SITE_URL, vapidKeys: keys });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await server
          .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
          .pushTextMessage(payload, { ttl: 60 * 60 * 24, urgency: webpush.Urgency.High, topic: `room${room.id}` });
        sent++;
      } catch (e) {
        // 브라우저가 구독을 끊었으면 지웁니다.
        if (e instanceof webpush.PushMessageError && e.isGone()) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push failed", s.id, String(e));
        }
      }
    }),
  );
  return { sent };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "POST만 받습니다." }, { status: 405 });
    const body = await req.json().catch(() => ({}));
    if (body?.action === "public_key") {
      const keys = await loadOrCreateKeys();
      return Response.json({ publicKey: applicationServerKey(keys.publicKey) });
    }
    const messageId = Number(body?.message_id);
    if (!Number.isInteger(messageId) || messageId < 1) {
      return Response.json({ error: "message_id가 필요합니다." }, { status: 400 });
    }
    return Response.json(await notify(messageId));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "처리하지 못했습니다." }, { status: 500 });
  }
});
