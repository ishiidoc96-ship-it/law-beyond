import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || ""
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@lawbeyond.app"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface PushPayload {
  user_id: string
  title: string
  body: string
  url?: string
}

// ── Base64url helpers ──

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// ── HKDF helper (RFC 5869, single-shot Extract+Expand via SubtleCrypto) ──

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  )
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info },
      key,
      lengthBytes * 8,
    ),
  )
}

// ── VAPID (Voluntary Application Server Identification, RFC 8292) ──

async function getVapidPrivateKey(): Promise<CryptoKey> {
  const pkcs8 = base64urlDecode(VAPID_PRIVATE_KEY)
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  )
}

/** Parse an ASN.1 DER ECDSA signature into raw r || s (64 bytes). */
function derToRawSig(der: Uint8Array): Uint8Array {
  let offset = 0
  if (der[offset++] !== 0x30) throw new Error("Invalid DER: expected SEQUENCE")

  let seqLen = der[offset++]
  if (seqLen & 0x80) {
    const numBytes = seqLen & 0x7f
    offset += numBytes
  }

  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER (r)")
  const rLen = der[offset++]
  const r = der.slice(offset, offset + rLen)
  offset += rLen

  if (der[offset++] !== 0x02) throw new Error("Invalid DER: expected INTEGER (s)")
  const sLen = der[offset++]
  const s = der.slice(offset, offset + sLen)

  // Fixed 32-byte fields, zero-padded on the left
  const raw = new Uint8Array(64)
  raw.set(r.slice(Math.max(0, rLen - 32)), 32 - Math.min(rLen, 32))
  raw.set(s.slice(Math.max(0, sLen - 32)), 64 - Math.min(sLen, 32))
  return raw
}

async function buildVapidAuthorization(endpoint: string): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`

  const header = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  )
  const now = Math.floor(Date.now() / 1000)
  const payload = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT }),
    ),
  )

  const signingInput = `${header}.${payload}`
  const data = new TextEncoder().encode(signingInput)
  const privateKey = await getVapidPrivateKey()
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      data,
    ),
  )

  return `vapid t=${signingInput}.${base64urlEncode(derToRawSig(sig))}, k=${VAPID_PUBLIC_KEY}`
}

// ── Web Push Encryption (RFC 8291 — aes128gcm content encoding) ──

async function encryptWebPush(
  userPublicKeyB64: string,
  userAuthB64: string,
  payload: Uint8Array,
): Promise<Uint8Array> {
  const userPublicKey = base64urlDecode(userPublicKeyB64) // 65 bytes uncompressed EC point
  const userAuth = base64urlDecode(userAuthB64)

  // Import user's public key for ECDH
  const userEcdhKey = await crypto.subtle.importKey(
    "raw",
    userPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )

  // Generate ephemeral ECDH key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )

  // Export ephemeral public key (65-byte uncompressed point, includes 0x04 prefix)
  const uaPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey),
  )

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userEcdhKey },
      ephemeralKeyPair.privateKey,
      256,
    ),
  )

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Step 1 — derive IKM from auth_secret
  //   PRK = HMAC-SHA256(salt, auth_secret)      [HKDF-Extract]
  //   IKM = HKDF-Expand(PRK, ikmInfo, 32)
  // Combined via SubtleCrypto: import auth_secret as IKM, use subscription salt.
  const ikmInfoStr = "WebPush: info"
  const ikmInfo = new Uint8Array(ikmInfoStr.length + 1 + 65 + 65)
  ikmInfo.set(new TextEncoder().encode(ikmInfoStr))
  ikmInfo[ikmInfoStr.length] = 0x00
  ikmInfo.set(uaPublicKey, ikmInfoStr.length + 1)
  ikmInfo.set(userPublicKey, ikmInfoStr.length + 1 + 65)

  const ikm = await hkdf(userAuth, salt, ikmInfo, 32)

  // Step 2 — derive CEK and nonce
  //   PRK2 = HKDF-Extract(IKM, shared_secret)
  //   CEK  = HKDF-Expand(PRK2, "Content-Encoding: aes128gcm\0", 16)
  //   Nonce = HKDF-Expand(PRK2, "Content-Encoding: nonce\0", 12)
  const cekLabel = new TextEncoder().encode("Content-Encoding: aes128gcm")
  const cekInfo = new Uint8Array(cekLabel.length + 1)
  cekInfo.set(cekLabel)
  cekInfo[cekLabel.length] = 0x00

  const nonceLabel = new TextEncoder().encode("Content-Encoding: nonce")
  const nonceInfo = new Uint8Array(nonceLabel.length + 1)
  nonceInfo.set(nonceLabel)
  nonceInfo[nonceLabel.length] = 0x00

  const cek = await hkdf(sharedSecret, ikm, cekInfo, 16)
  const nonce = await hkdf(sharedSecret, ikm, nonceInfo, 12)

  // Step 3 — AES-128-GCM encrypt
  const contentKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  )

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      contentKey,
      payload,
    ),
  )

  // Step 4 — build aes128gcm record
  //   salt (16) | rs (4, big-endian 4096) | idlen (1, = 0x41 = 65) | keyid (65) | ciphertext
  const record = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length)
  record.set(salt, 0)
  record.set(new Uint8Array([0x00, 0x00, 0x10, 0x00]), 16) // rs = 4096
  record.set(new Uint8Array([0x41]), 20) // keyid length = 65
  record.set(uaPublicKey, 21) // ephemeral public key
  record.set(ciphertext, 86) // encrypted payload + GCM tag

  return record
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      )
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      )
    }

    // ── Validate payload ──
    const { user_id, title, body, url } = (await req.json()) as PushPayload
    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: user_id, title, body",
        }),
        { status: 400, headers: corsHeaders },
      )
    }

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      console.error("VAPID_PRIVATE_KEY or VAPID_PUBLIC_KEY not set")
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: corsHeaders },
      )
    }

    // ── Look up subscriptions (service-role to bypass RLS) ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id)

    if (subError) {
      console.error("DB query failed:", subError.message)
      return new Response(
        JSON.stringify({ error: "DB query failed" }),
        { status: 500, headers: corsHeaders },
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions for this user" }),
        { status: 200, headers: corsHeaders },
      )
    }

    // ── Encrypt & send to each subscription endpoint ──
    const pushPayload = JSON.stringify({ title, body, url: url || "/" })
    const payloadBytes = new TextEncoder().encode(pushPayload)

    const results: { endpoint: string; status: number }[] = []
    const endpointsToDelete: string[] = []

    for (const sub of subscriptions) {
      try {
        const encrypted = await encryptWebPush(sub.p256dh, sub.auth, payloadBytes)
        const vapidHeader = await buildVapidAuthorization(sub.endpoint)

        const resp = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Authorization: vapidHeader,
          },
          body: encrypted,
        })

        results.push({ endpoint: sub.endpoint, status: resp.status })

        // 410 Gone / 404 → subscription no longer valid
        if (resp.status === 410 || resp.status === 404) {
          endpointsToDelete.push(sub.endpoint)
        }
      } catch (err) {
        console.error("Push send error:", sub.endpoint, String(err))
        endpointsToDelete.push(sub.endpoint)
      }
    }

    // ── Clean up expired / invalid subscriptions ──
    if (endpointsToDelete.length > 0) {
      const { error: delError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", endpointsToDelete)
      if (delError) {
        console.error("Failed to prune subscriptions:", delError.message)
      }
    }

    return new Response(
      JSON.stringify({ message: "Push notifications sent", results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    console.error("send-push error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders },
    )
  }
})
