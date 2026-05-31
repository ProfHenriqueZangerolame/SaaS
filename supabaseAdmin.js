import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Aceita SUPABASE_URL (backend) ou reaproveita VITE_SUPABASE_URL do projeto
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// O controle de créditos só liga quando a service role key existe.
// Sem ela, o app roda em "modo MVP livre" (igual a hoje).
export const creditsEnabled = Boolean(url && serviceKey);

export const supabaseAdmin = creditsEnabled
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

if (!creditsEnabled) {
  console.warn(
    '⚠️  [Créditos] SUPABASE_SERVICE_ROLE_KEY ausente — controle de créditos DESLIGADO (modo MVP livre).'
  );
} else {
  console.log('🔐 [Créditos] Controle de créditos ATIVO (Supabase service role detectada).');
}

// Verifica o JWT enviado pelo frontend e devolve o usuário autenticado (ou null).
export async function getUserFromToken(authHeader) {
  if (!supabaseAdmin || !authHeader) return null;
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
}
