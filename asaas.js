import dotenv from 'dotenv';

dotenv.config();

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';

// Pagamentos só ligam quando a chave existe. Sem ela, o sistema entra em
// "modo simulação" (ativa a assinatura localmente, sem cobrar) para testes.
export const asaasEnabled = Boolean(ASAAS_API_KEY);

if (!asaasEnabled) {
  console.warn('⚠️  [Asaas] ASAAS_API_KEY ausente — pagamentos em MODO SIMULAÇÃO (não cobra de verdade).');
} else {
  console.log(`💳 [Asaas] Pagamentos ATIVOS (${ASAAS_BASE_URL}).`);
}

async function asaasRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Asaas retornou erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Reutiliza o cliente Asaas pelo e-mail, ou cria um novo.
export async function criarOuObterCliente({ nome, email, cpfCnpj, externalReference }) {
  const existing = await asaasRequest(`/customers?email=${encodeURIComponent(email)}`);
  if (existing?.data?.length) return existing.data[0];
  return asaasRequest('/customers', {
    method: 'POST',
    body: { name: nome, email, cpfCnpj, externalReference },
  });
}

// Cria a assinatura mensal recorrente.
export async function criarAssinatura({ customerId, valor, descricao, billingType = 'UNDEFINED', externalReference }) {
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1); // primeira cobrança amanhã
  return asaasRequest('/subscriptions', {
    method: 'POST',
    body: {
      customer: customerId,
      billingType, // UNDEFINED deixa o cliente escolher (Pix, boleto ou cartão)
      value: valor,
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
      cycle: 'MONTHLY',
      description: descricao,
      externalReference,
    },
  });
}

// Pega a primeira cobrança da assinatura (para obter o link de pagamento).
export async function primeiroPagamento(subscriptionId) {
  const pays = await asaasRequest(`/subscriptions/${subscriptionId}/payments`);
  return pays?.data?.[0] || null;
}
