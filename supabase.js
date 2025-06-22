// Use official Supabase CDN link
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://qhpsfpxwabwtekyocxci.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocHNmcHh3YWJ3dGVreW9jeGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDU5OTYsImV4cCI6MjA2MDIyMTk5Nn0.9Bdm_PFKvzaAduFqM23KS_2-Kkr1XnPoLMcmvcbmIqY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)