import { supabaseAdmin, creditsEnabled } from './supabaseAdmin.js';

// Custo em créditos por tipo de geração (regra de negócio PlanejaAÍ)
export const CUSTOS = {
  plano: 1,
  atividade: 1,
  atividade_imagem: 4,
};

// Plano usado no modo MVP livre (créditos desligados): tudo liberado no Flash.
const PLANO_MVP = {
  slug: 'mvp',
  nome: 'MVP',
  modelo_ia: 'flash',
  permite_imagem: true,
  creditos_mensais: null, // ilimitado
};

// Retorna o ID do modelo Gemini a partir do tier do plano.
export function modeloGemini(modeloIa) {
  return modeloIa === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
}

// Busca o plano ativo do professor. Retorna:
//  - PLANO_MVP            quando créditos estão desligados
//  - objeto do plano      quando há assinatura ativa/trial
//  - null                 quando há controle ligado mas sem assinatura válida
export async function getPlanoDoUsuario(userId) {
  if (!creditsEnabled) return PLANO_MVP;
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .select('status, planos(slug, nome, modelo_ia, permite_imagem, creditos_mensais)')
    .eq('user_id', userId)
    .in('status', ['ativa', 'trial'])
    .maybeSingle();

  if (error || !data?.planos) return null;
  return data.planos;
}

// Saldo de créditos do mês atual (usa a função SQL saldo_creditos).
export async function getSaldo(userId) {
  if (!creditsEnabled) {
    return { ilimitado: true, creditos_mensais: null, consumidos: 0, restantes: 999999 };
  }
  const { data, error } = await supabaseAdmin.rpc('saldo_creditos', { p_user: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || { ilimitado: false, creditos_mensais: 0, consumidos: 0, restantes: 0 };
}

// O professor pode gastar `custo` créditos agora?
export async function podeGerar(userId, custo) {
  if (!creditsEnabled) return true;
  const saldo = await getSaldo(userId);
  return saldo.ilimitado || saldo.restantes >= custo;
}

// Registra o consumo (razão de créditos + custo real estimado para monitorar margem).
export async function registrarUso({
  userId,
  tipo,
  creditos,
  modelo,
  tokensInput = 0,
  tokensOutput = 0,
  imagens = 0,
  referenciaId = null,
}) {
  if (!creditsEnabled || !userId) return;
  const custoCents = estimarCustoCents({ modelo, tokensInput, tokensOutput, imagens });
  const { error } = await supabaseAdmin.from('usage_logs').insert({
    user_id: userId,
    tipo,
    creditos,
    modelo_ia: modelo,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    imagens_geradas: imagens,
    custo_estimado_cents: custoCents,
    referencia_id: referenciaId,
  });
  if (error) console.error('[Créditos] Falha ao registrar uso:', error.message);
}

// Estimativa de custo em centavos de R$ (preços aprox. Gemini, ~R$5,50/USD).
function estimarCustoCents({ modelo, tokensInput, tokensOutput, imagens }) {
  const BRL_POR_USD = 5.5;
  const precos = {
    flash: { in: 0.3, out: 2.5 },
    pro: { in: 1.25, out: 10.0 },
  };
  const p = precos[modelo] || precos.flash;
  const usd =
    (tokensInput / 1e6) * p.in +
    (tokensOutput / 1e6) * p.out +
    imagens * 0.04; // ~US$0,04 por imagem
  return Math.ceil(usd * BRL_POR_USD * 100);
}
