"use client";

import { useCallback, useState } from "react";
import type { UploadedDoc } from "@/lib/ingest/types";

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "processing" | "done" | "failed";
  result?: UploadedDoc;
  error?: string;
}

export function useDocumentUpload(caseId: string) {
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedDoc | null> => {
      const localId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setUploads((u) => [
        ...u,
        { id: localId, file, progress: 0, status: "uploading" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId);

        // XHR for progress events
        const xhrPromise = new Promise<UploadedDoc>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/documents/upload");

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 80); // %80 upload, %20 processing
              setUploads((u) =>
                u.map((up) =>
                  up.id === localId ? { ...up, progress: pct } : up
                )
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data.doc as UploadedDoc);
              } catch (e) {
                reject(new Error("Geçersiz response: " + e));
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network hatası"));
          xhr.send(formData);
        });

        // %80 -> %95 işleme simülasyonu
        setUploads((u) =>
          u.map((up) =>
            up.id === localId ? { ...up, status: "processing", progress: 85 } : up
          )
        );

        const result = await xhrPromise;

        setUploads((u) =>
          u.map((up) =>
            up.id === localId
              ? { ...up, status: "done", progress: 100, result }
              : up
          )
        );
        return result;
      } catch (err) {
        setUploads((u) =>
          u.map((up) =>
            up.id === localId
              ? {
                  ...up,
                  status: "failed",
                  error: err instanceof Error ? err.message : "Bilinmeyen",
                }
              : up
          )
        );
        return null;
      }
    },
    [caseId]
  );

  const uploadAll = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      // Sıralı upload (server yükünü dengelemek için)
      const results: UploadedDoc[] = [];
      for (const f of files) {
        const r = await uploadFile(f);
        if (r) results.push(r);
      }
      setIsUploading(false);
      return results;
    },
    [uploadFile]
  );

  const clear = useCallback(() => setUploads([]), []);
  const removeFromList = useCallback(
    (id: string) => setUploads((u) => u.filter((up) => up.id !== id)),
    []
  );

  return { uploads, isUploading, uploadFile, uploadAll, clear, removeFromList };
}
