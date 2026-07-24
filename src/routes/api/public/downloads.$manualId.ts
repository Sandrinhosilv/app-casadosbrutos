import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy autenticado para downloads do Google Drive.
 * O front chama /api/public/downloads/:manualId?t=<token>
 * onde <token> é um HMAC assinado por getManualDownloadUrl.
 * Nunca expomos o drive_file_id nem link público do Drive.
 */
export const Route = createFileRoute("/api/public/downloads/$manualId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("t");
        if (!token) return new Response("Missing token", { status: 401 });

        const { verifyDownloadToken } = await import("@/lib/download-token.server");
        const verified = verifyDownloadToken(params.manualId, token);
        if (!verified) return new Response("Invalid or expired token", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Revalida assinatura no momento do download
        const { data: allowed } = await supabaseAdmin.rpc("has_active_subscription", {
          _user_id: verified.userId,
        });
        if (!allowed) return new Response("Subscription required", { status: 402 });

        const { data: manual } = await supabaseAdmin
          .from("manuals")
          .select("id, title, format, drive_file_id, file_size_bytes")
          .eq("id", params.manualId)
          .maybeSingle();
        if (!manual || !manual.drive_file_id) return new Response("Not found", { status: 404 });

        // Registra o download
        await supabaseAdmin
          .from("downloads")
          .insert({ user_id: verified.userId, manual_id: manual.id });

        const { fetchDriveFileStream } = await import("@/lib/drive.server");
        const driveRes = await fetchDriveFileStream(manual.drive_file_id);
        if (!driveRes.ok || !driveRes.body) {
          const body = await driveRes.text().catch(() => "");
          console.error("Drive fetch failed", driveRes.status, body);
          return new Response("Upstream Drive error", { status: 502 });
        }

        const safeName = manual.title.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 120);
        const filename = `${safeName}.${manual.format || "pdf"}`;
        const headers = new Headers();
        headers.set(
          "Content-Type",
          driveRes.headers.get("content-type") ?? "application/octet-stream",
        );
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
        const cl = driveRes.headers.get("content-length");
        if (cl) headers.set("Content-Length", cl);
        headers.set("Cache-Control", "private, no-store");
        return new Response(driveRes.body, { status: 200, headers });
      },
    },
  },
});
