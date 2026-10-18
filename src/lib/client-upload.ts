/**
 * Browser-side upload flow:
 * 1. Ask the server for a presigned URL (POST /upload/presign).
 * 2. PUT the file straight to object storage, reporting real progress.
 * 3. Confirm with POST /upload so the server validates and records the Photo.
 * Falls back to a multipart POST /upload when the server answers `mode: "server"`
 * (local development without R2).
 */

export interface UploadFields {
  tableId?: string | null;
  questId?: string | null;
  moment?: string | null;
  guestName?: string | null;
  message?: string | null;
}

export interface UploadResult {
  photo?: { id: string };
  message?: string;
}

function sendWithProgress(
  method: "PUT" | "POST",
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void
): Promise<{ status: number; responseText: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, responseText: xhr.responseText });
    xhr.onerror = () => reject(new Error("Falha de conexão durante o envio. Verifique sua internet."));
    xhr.send(body);
  });
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function uploadMedia(params: {
  slug: string;
  blob: Blob;
  filename: string;
  guestSessionId: string;
  fields: UploadFields;
  onProgress?: (fraction: number) => void;
}): Promise<UploadResult> {
  const { slug, blob, filename, guestSessionId, fields, onProgress } = params;
  const sessionHeaders = { "x-guest-session-id": guestSessionId };
  // Some Android browsers leave File.type empty; fall back to the extension
  const contentType = blob.type || MIME_BY_EXTENSION[filename.split(".").pop()?.toLowerCase() || ""] || "";

  const presignRes = await fetch(`/api/events/${slug}/upload/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ contentType, size: blob.size }),
  });
  const presign = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new Error(presign.error || "Erro ao preparar o envio da mídia.");
  }

  if (presign.mode === "direct") {
    const put = await sendWithProgress(
      "PUT",
      presign.uploadUrl,
      blob,
      { "Content-Type": presign.contentType },
      (f) => onProgress?.(f * 0.9)
    );
    if (put.status < 200 || put.status >= 300) {
      throw new Error("Falha ao enviar o arquivo para o armazenamento. Tente novamente.");
    }

    const confirmRes = await fetch(`/api/events/${slug}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sessionHeaders },
      body: JSON.stringify({ key: presign.key, guestSessionId, ...fields }),
    });
    const data = await confirmRes.json().catch(() => ({}));
    if (!confirmRes.ok) {
      throw new Error(data.error || "Erro ao publicar a mídia.");
    }
    onProgress?.(1);
    return data;
  }

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("guestSessionId", guestSessionId);
  for (const [name, value] of Object.entries(fields)) {
    if (value) formData.append(name, value);
  }

  const res = await sendWithProgress("POST", `/api/events/${slug}/upload`, formData, sessionHeaders, onProgress);
  const data = parseJson(res.responseText);
  if (res.status < 200 || res.status >= 300) {
    throw new Error((data.error as string) || "Erro ao publicar a mídia.");
  }
  return data as UploadResult;
}
