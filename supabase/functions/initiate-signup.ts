import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

interface Student {
  email: string;
}

interface RequestBody {
  enrollmentNumber: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (!supabaseUrl || !supabaseKey || !resendKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const { enrollmentNumber }: RequestBody = await req.json();
    if (!enrollmentNumber?.trim()) {
      throw new Error("Missing enrollment number");
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("email")
      .eq("enrollment_number", enrollmentNumber)
      .single();

    if (error || !student?.email) {
      return Response.json(
        { error: "Invalid enrollment number" },
        { status: 400, headers: corsHeaders }
      );
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { error: upsertError } = await supabase
      .from("pending_verifications")
      .upsert({
        enrollment_number: enrollmentNumber,
        verification_code: verificationCode
      });

    if (upsertError) throw new Error("Failed to store verification code");

    const { error: emailError } = await resend.emails.send({
      from: "noreply@yourdomain.com",
      to: student.email,
      subject: "Your Verification Code",
      html: `<strong>Verification Code:</strong> ${verificationCode}`
    });

    if (emailError) throw new Error(`Email failed: ${emailError.message}`);

    return Response.json(
      { message: "Verification code sent" },
      { headers: corsHeaders }
    );

  } catch (error) {
    let errorMessage = "Internal server error";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.message.includes("Missing") ? 400 : 500;
    }

    console.error("Error:", error);
    return Response.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders }
    );
  }
});