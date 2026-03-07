import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, clinic, email, message } = await req.json();

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitized = {
      name: name.trim().slice(0, 100),
      clinic: clinic ? String(clinic).trim().slice(0, 100) : null,
      email: email.trim().slice(0, 255).toLowerCase(),
      message: message.trim().slice(0, 2000),
    };

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        name: sanitized.name,
        clinic: sanitized.clinic,
        email: sanitized.email,
        message: sanitized.message,
      });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email notification via Resend (if configured)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AgendixPro <onboarding@resend.dev>",
            to: ["agendixpro2026@gmail.com"],
            subject: `[AgendixPro] Nuevo mensaje de contacto de ${sanitized.name}`,
            html: `
              <h2>Nuevo mensaje de contacto</h2>
              <p><strong>Nombre:</strong> ${sanitized.name}</p>
              <p><strong>Clínica:</strong> ${sanitized.clinic || "No especificada"}</p>
              <p><strong>Email:</strong> ${sanitized.email}</p>
              <hr />
              <p><strong>Mensaje:</strong></p>
              <p>${sanitized.message.replace(/\n/g, "<br/>")}</p>
              <hr />
              <p style="color:#888;font-size:12px;">Enviado desde el formulario de contacto de AgendixPro</p>
            `,
          }),
        });

        const emailData = await emailRes.text();
        if (emailRes.ok) {
          emailSent = true;
        } else {
          console.error("Resend error:", emailData);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
