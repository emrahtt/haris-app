import { isDemoMode } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const CREDIT_PACKS = {
  pack_s: {
    id: "pack_s" as const,
    name: "Küçük paket",
    calls: 80,
    priceTry: 499,
    priceUsdCents: 1500,
  },
  pack_m: {
    id: "pack_m" as const,
    name: "Orta paket",
    calls: 300,
    priceTry: 1499,
    priceUsdCents: 4500,
  },
  pack_l: {
    id: "pack_l" as const,
    name: "Büyük paket",
    calls: 1200,
    priceTry: 4990,
    priceUsdCents: 14900,
  },
};

export type CreditPackId = keyof typeof CREDIT_PACKS;

const demoBonus = new Map<string, number>();

export async function getBonusCalls(userId: string): Promise<number> {
  if (isDemoMode) return demoBonus.get(userId) ?? 0;
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data } = await admin
    .from("user_wallets")
    .select("bonus_ai_calls")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.bonus_ai_calls ?? 0);
}

export async function addBonusCalls(
  userId: string,
  calls: number
): Promise<number> {
  if (calls <= 0) return getBonusCalls(userId);
  if (isDemoMode) {
    const next = (demoBonus.get(userId) ?? 0) + calls;
    demoBonus.set(userId, next);
    return next;
  }
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data: existing } = await admin
    .from("user_wallets")
    .select("bonus_ai_calls, lifetime_purchased_calls")
    .eq("user_id", userId)
    .maybeSingle();
  const bonus = Number(existing?.bonus_ai_calls ?? 0) + calls;
  const lifetime = Number(existing?.lifetime_purchased_calls ?? 0) + calls;
  await admin.from("user_wallets").upsert(
    {
      user_id: userId,
      bonus_ai_calls: bonus,
      lifetime_purchased_calls: lifetime,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return bonus;
}

export function isBillingOwner(userId: string): boolean {
  const raw = process.env.HARIS_OWNER_USER_IDS || "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}
