# Ativação em Produção — Passos Manuais

Guia para sair do **modo MVP livre** (tudo liberado, sem cobrança) e ligar de
verdade o controle de créditos, pagamentos, RAG e imagens. Cada passo é
**manual** e feito por você fora do código.

> Degradação graciosa: enquanto os itens abaixo não forem configurados, o app
> continua funcionando em modo MVP (sem créditos, sem pagamento, RAG por arquivo
> local). Você liga cada parte quando quiser.

---

## 1. Banco de dados (Supabase)

1. Acesse **Supabase → SQL Editor**.
2. Cole e rode o conteúdo de [`01-banco-de-dados.sql`](01-banco-de-dados.sql).
   - Cria `planos`, `assinaturas`, `planos_gerados`, `atividades_geradas`,
     `usage_logs`, `base_conhecimento`, as políticas RLS e as funções de crédito
     (`saldo_creditos`, `pode_gerar`).
   - É idempotente (`create table if not exists` / `on conflict do nothing`).
3. Confira em **Table Editor** se as 6 tabelas e os 3 planos apareceram.

## 2. Ligar o controle de créditos (service role)

1. **Supabase → Project Settings → API → `service_role` (secret)**. Copie a chave.
2. No `.env` do servidor, preencha:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<a chave service_role>
   SUPABASE_URL=<mesma URL do VITE_SUPABASE_URL>   # opcional, mas recomendado
   ```
3. Reinicie o backend (`npm run start`). O log deve mostrar:
   `🔐 [Créditos] Controle de créditos ATIVO`.

> ⚠️ A `service_role` ignora o RLS — **nunca** a exponha no frontend nem
> commite no Git. Ela vive só no `.env` do servidor.

## 3. Popular o RAG da BNCC

Com a service role já configurada (passo 2):

```
npm run ingest:bncc
```

Isso lê `src/data/bncc_skills.json` e popula `base_conhecimento` (tipo `bncc`)
de forma idempotente. O Agente 1 passa a recuperar as habilidades oficiais do
banco; sem isso, ele usa o arquivo local como fallback (também funciona).

## 4. Pagamento (Asaas)

1. Crie a conta no Asaas e gere a **API Key** (comece no **sandbox**).
2. No `.env`:
   ```
   ASAAS_API_KEY=<sua chave>
   ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3   # produção: https://api.asaas.com/v3
   ASAAS_WEBHOOK_TOKEN=<um token forte à sua escolha>
   ```
   - Sem `ASAAS_API_KEY`, as assinaturas entram em **modo simulação** (ativam
     direto, sem cobrar) — útil para testar o fluxo.
3. **Cadastre o webhook** no painel Asaas apontando para:
   ```
   https://SEU_DOMINIO/api/webhooks/asaas
   ```
   - Em "Token de autenticação" do webhook, use o mesmo valor de
     `ASAAS_WEBHOOK_TOKEN` (o backend valida o header `asaas-access-token`).
   - Eventos que o backend trata: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → ativa;
     `PAYMENT_OVERDUE` → suspende; `PAYMENT_DELETED`/`PAYMENT_REFUNDED` → cancela.
4. Teste uma assinatura no sandbox e confira em `assinaturas` se o `status` muda
   conforme os eventos chegam.

## 5. Imagens na atividade (Pro/Premium)

1. No `.env` (opcional — já tem padrão):
   ```
   GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
   ```
2. Garanta que a `GEMINI_API_KEY` tem acesso ao modelo de imagem.
3. As figuras hoje são devolvidas **inline** (data URI base64) e impressas
   junto da folha. Custo: **4 créditos** por atividade com figura, cobrados
   somente se ao menos uma imagem for gerada.

> Evolução futura (opcional): em vez de inline, salvar as imagens no bucket
> **privado** `atividades-imagens` (Supabase Storage) e servir via URL assinada —
> reduz o tamanho do JSON de resposta. Estrutura já prevista no SQL.

## 6. Checklist final

- [ ] SQL rodado no Supabase (6 tabelas + funções).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no `.env` → log "Controle de créditos ATIVO".
- [ ] `npm run ingest:bncc` rodado com sucesso.
- [ ] `ASAAS_API_KEY` + `ASAAS_BASE_URL` + webhook cadastrado e testado (sandbox).
- [ ] Assinatura de teste muda o `status` via webhook.
- [ ] Atividade com figuras gera imagem e cobra 4 créditos.
- [ ] LGPD: cadastro exige consentimento; exclusão de conta apaga os dados.

Concluído isto, o PlanejaAÍ está pronto para cobrar de verdade.
