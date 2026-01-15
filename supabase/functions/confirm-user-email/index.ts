import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_SECRET = Deno.env.get("ADMIN_CONFIRM_SECRET");

serve(async (req) => {
  // Validate that the required secret is configured
  if (!ADMIN_SECRET) {
    console.error("ADMIN_CONFIRM_SECRET environment variable is not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error: ADMIN_CONFIRM_SECRET must be configured" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, secret } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (secret !== ADMIN_SECRET) {
      throw new Error("Invalid admin secret");
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    // Confirm user email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email ${email} confirmed successfully`,
        user: data.user 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
