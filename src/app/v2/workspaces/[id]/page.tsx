/**
 * HARIS v2 — Matter Workspace Sayfası
 * Sprint 11.2: SSR ile workspace + documents + outputs + messages fetch.
 */

import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  listDocuments,
  listAgentOutputs,
  listAgentMessages,
  getLatestPetition,
} from "@/lib/v2/workspace/db";
import { WorkspaceClient } from "./workspace-client";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    notFound();
  }
  const [documents, agentOutputs, agentMessages, petition] = await Promise.all([
    listDocuments(id),
    listAgentOutputs(id),
    listAgentMessages(id),
    getLatestPetition(id),
  ]);

  return (
    <WorkspaceClient
      workspaceId={id}
      initialWorkspace={ws}
      initialDocuments={documents}
      initialAgentOutputs={agentOutputs}
      initialAgentMessages={agentMessages}
      initialPetition={petition}
    />
  );
}
