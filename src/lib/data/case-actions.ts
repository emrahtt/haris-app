"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCase, type CreateCaseInput } from "./cases-db";

/**
 * Server Action: Yeni dava oluştur
 */
export async function createCaseAction(formData: FormData): Promise<void> {
  const input: CreateCaseInput = {
    title: (formData.get("title") as string) || "Adsız Dava",
    caseType: (formData.get("caseType") as CreateCaseInput["caseType"]) || "tazminat",
    court: (formData.get("court") as string) || undefined,
    esasNo: (formData.get("esasNo") as string) || undefined,
    client: (formData.get("client") as string) || "Müvekkil",
    opponent: (formData.get("opponent") as string) || undefined,
    summary: (formData.get("summary") as string) || undefined,
  };

  const result = await createCase(input);

  if (!result.ok) {
    redirect(`/cases/new?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/cases");
  revalidatePath("/dashboard");
  redirect(`/cases/${result.id}/overview`);
}
