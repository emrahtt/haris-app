import { listWorkspaces } from "@/lib/v2/workspace/db";

export async function assertWithinBudget(userId: string): Promise<{
  ok: boolean;
  used: number;
  limit: number;
  message?: string;
}> {
  const limit = Number(process.env.HARIS_MONTHLY_BUDGET_USD ?? 75);
  const workspaces = await listWorkspaces(userId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const used = workspaces
    .filter((w) => new Date(w.updated_at) >= monthStart)
    .reduce((s, w) => s + Number(w.total_cost_usd ?? 0), 0);
  if (used >= limit) {
    return {
      ok: false,
      used,
      limit,
      message: `Bu ayın AI kotası doldu ($${used.toFixed(2)} / $${limit}). HARIS_MONTHLY_BUDGET_USD ile yükseltebilirsiniz.`,
    };
  }
  return { ok: true, used, limit };
}
