// Kullanım: node --env-file-if-exists=.env.development.local scripts/check-models.mjs
const roles = {
  orchestrator: process.env.HARIS_ORCHESTRATOR_MODEL || "anthropic:claude-opus-5",
  analyzer: process.env.HARIS_ANALYZER_MODEL || "anthropic:claude-opus-5",
  opposition: process.env.HARIS_OPPOSITION_MODEL || "openai:gpt-5.6-sol",
  drafter: process.env.HARIS_DRAFTER_MODEL || "anthropic:claude-opus-5",
  quick: process.env.HARIS_QUICK_MODEL || "anthropic:claude-sonnet-5",
  vision: process.env.HARIS_VISION_MODEL || "anthropic:claude-opus-5",
  fallback: process.env.HARIS_FALLBACK_MODEL,
  fallback_anthropic: process.env.HARIS_FALLBACK_ANTHROPIC_MODEL,
};

function parse(value) {
  if (!value) return null;
  const [first, ...rest] = value.split(":");
  if (rest.length && (first === "anthropic" || first === "openai")) return { provider: first, model: rest.join(":") };
  return { provider: value.startsWith("claude") ? "anthropic" : "openai", model: value };
}

async function ping({ provider, model }) {
  if (provider === "anthropic") {
    const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: "user", content: "ping" }] }),
    });
    return { ok: res.ok, status: res.status, detail: res.ok ? "" : (await res.text()).slice(0, 140) };
  }
  const reasoning = /^(gpt-5|o1|o3)/.test(model);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], ...(reasoning ? { max_completion_tokens: 16 } : { max_tokens: 5 }) }),
  });
  return { ok: res.ok, status: res.status, detail: res.ok ? "" : (await res.text()).slice(0, 140) };
}

for (const [role, raw] of Object.entries(roles)) {
  const target = parse(raw);
  if (!target) {
    console.log(`${role.padEnd(20)} (tanımlı değil — varsayılan model kullanılır)`);
    continue;
  }
  try {
    const r = await ping(target);
    console.log(`${role.padEnd(20)} ${target.provider}:${target.model} → ${r.ok ? "ÇALIŞIYOR" : `HATA ${r.status} ${r.detail}`}`);
  } catch (e) {
    console.log(`${role.padEnd(20)} ${target.provider}:${target.model} → BAĞLANTI HATASI ${String(e).slice(0, 120)}`);
  }
}
