// Edge Function: Secure admin user listing/creation/deletion (with temp expiry metadata)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CreateBody = {
  email: string;
  password: string;
  type?: "permanent" | "temporary";
  expiresAt?: string;
};
type DeleteBody = { id: string };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Missing env" }), { status: 500, headers: CORS });
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (req.method === "GET") {
      const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const users = (data.users || []).map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        app_metadata: u.app_metadata
      }));
      return new Response(JSON.stringify({ users }), {
        headers: { "content-type": "application/json", ...CORS }
      });
    }

    if (req.method === "POST") {
      const body = await req.json() as CreateBody;
      if (!body.email || !body.password) {
        return new Response(JSON.stringify({ error: "email and password required" }), { status: 400, headers: CORS });
      }
      let expiresAt: string | null = null;
      if (body.type === "temporary") {
        if (!body.expiresAt) {
          return new Response(JSON.stringify({ error: "expiresAt required for temporary admin" }), { status: 400, headers: CORS });
        }
        const d = new Date(body.expiresAt);
        if (isNaN(d.getTime())) {
          return new Response(JSON.stringify({ error: "Invalid expiresAt" }), { status: 400, headers: CORS });
        }
        expiresAt = d.toISOString();
      }
      const { data, error } = await sb.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        app_metadata: {
          role: "admin",
          admin_type: body.type === "temporary" ? "temporary" : "permanent",
          admin_expires_at: expiresAt
        }
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, user: data.user }), {
        headers: { "content-type": "application/json", ...CORS }
      });
    }

    if (req.method === "DELETE") {
      const body = await req.json() as DeleteBody;
      if (!body.id) {
        return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: CORS });
      }
      const { error } = await sb.auth.admin.deleteUser(body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: CORS });
  }
});