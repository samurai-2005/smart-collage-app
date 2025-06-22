import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { enrollmentNumber, code, firstName, lastName, password } = await req.json();

  // Verify code
  const { data: verification, error } = await supabase
    .from('pending_verifications')
    .select('*')
    .eq('enrollment_number', enrollmentNumber)
    .eq('verification_code', code)
    .gt('created_at', new Date(Date.now() - 600000)) // 10m expiry
    .single();

  if (error || !verification) {
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Hash password
  const hashedPassword = hashSync(password);

  // Create user
  const { error: userError } = await supabase
    .from('users')
    .insert({
      enrollment_number: enrollmentNumber,
      first_name: firstName,
      last_name: lastName,
      password_hash: hashedPassword
    });

  if (userError) {
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cleanup verification
  await supabase
    .from('pending_verifications')
    .delete()
    .eq('enrollment_number', enrollmentNumber);

  return new Response(JSON.stringify({ message: 'Registration successful' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});