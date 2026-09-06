"use client";

import { RagSearch } from "@/components/rag/rag-search";

/**
 * Geriye dönük uyumluluk için wrapper.
 * Tüm gerçek arama mantığı artık RagSearch içinde.
 */
export function ResearchSection({ defaultQuery }: { defaultQuery?: string }) {
  return <RagSearch defaultQuery={defaultQuery} />;
}
