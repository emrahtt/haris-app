import {
  checkAiCallLimit,
  incrementUsage,
  type LimitCheckResult,
} from "./subscriptions-db";
import { getBonusCalls, isBillingOwner } from "./credits";

export async function assertUserCanUseAi(
  userId: string,
  units = 1
): Promise<LimitCheckResult> {
  if (isBillingOwner(userId)) {
    return {
      allowed: true,
      current: 0,
      limit: 999_999,
      remaining: 999_999,
      nearLimit: false,
    };
  }
  const base = await checkAiCallLimit(userId);
  const bonus = await getBonusCalls(userId);
  const limit = base.limit + bonus;
  const remaining = Math.max(0, limit - base.current);
  const allowed = base.current + units <= limit;
  return {
    allowed,
    current: base.current,
    limit,
    remaining,
    nearLimit: remaining <= Math.max(3, Math.floor(limit * 0.2)),
    reason: allowed
      ? undefined
      : `AI kotanız bitti (${base.current}/${limit}). Plan satın alın veya paket alın — başkasının API bakiyesi kullanılmaz.`,
  };
}

export async function consumeAiCall(userId: string, units = 1): Promise<void> {
  if (isBillingOwner(userId)) return;
  await incrementUsage("ai_calls", units, userId);
}
