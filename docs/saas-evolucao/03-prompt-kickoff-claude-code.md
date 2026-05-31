# Prompt de Kickoff para Claude Code — PlanejaAÍ

> Cole este prompt no Claude Code dentro da pasta do projeto para implementar a
> evolução SaaS. A stack atual é MANTIDA (sem migração para Next.js).

---

Você é um desenvolvedor sênior. Evolua o projeto existente **PlanejaAÍ** (um gerador de planos de aula BNCC) para um SaaS vendável por assinatura. **NÃO migre a stack** — mantenha React + Vite (frontend), Express (`server.js`) e Supabase. Não me explique, apenas implemente, commitando em etapas.

## Contexto do sistema
Professores do Ensino Fundamental geram, via IA (Gemini), fichas de plano de aula alinhadas à BNCC e folhas de atividade. Hoje funciona sem cobrança nem limites. Vou vender por assinatura mensal direto ao professor, com limite de créditos por plano.

## Stack (manter)
- Frontend: React 19 + Vite (já existe em `src/`)
- Backend: Express em `server.js` (já existe, com `/api/generate-plan` e `/api/generate-activity`)
- Banco/Auth: Supabase (`src/supabaseClient.js`, tabela `profiles`)
- IA: Gemini 2.5 Flash (planos Básico/Profissional) e Gemini 2.5 Pro (Premium)
- Pagamento: **Asaas** (assinatura recorrente, Pix + cartão)

## Banco de dados
Aplique o SQL em `docs/saas-evolucao/01-banco-de-dados.sql` (planos, assinaturas, planos_gerados, atividades_geradas, usage_logs, base_conhecimento + RLS + funções de crédito). A tabela `profiles` já existe — apenas estenda.

## Regras de negócio (críticas)
- 3 planos: Básico (R$19, 20 créditos, Flash), Profissional (R$30, 60 créditos, Flash, "MAIS POPULAR"), Premium (R$59, ilimitado, Pro).
- Custo em créditos: plano de aula = 1; atividade em texto = 1; **atividade com imagem = 4**.
- Atividade com imagem só nos planos Profissional e Premium.
- Antes de cada geração, o backend chama `pode_gerar(user, custo)`; se falso, retorna 402 com mensagem de upgrade.
- Após gerar, o backend insere em `usage_logs` (créditos + tokens + custo estimado) usando a `service_role` key.
- O modelo de IA usado vem do plano do professor.

## Tarefas
1. **Setup**: adicionar `SUPABASE_SERVICE_ROLE_KEY` e `ASAAS_API_KEY` ao `.env`/`.env.example`. Criar cliente Supabase admin no backend.
2. **Créditos**: middleware Express que valida crédito antes de `/api/generate-plan` e `/api/generate-activity`, e registra `usage_logs` depois. Endpoint `GET /api/saldo`.
3. **Agente 1**: refatorar `/api/generate-plan` para buscar itens relevantes de `base_conhecimento` (por ano/componente) e injetá-los no prompt, em vez dos exemplos fixos. Escolher modelo conforme plano.
4. **Agente 2**: ajustar `/api/generate-activity` para receber `plano_gerado_id`, ler o plano salvo e, nos planos pagos, gerar imagens (Imagen/Gemini Image) salvando no bucket `atividades-imagens`.
5. **Asaas**: endpoint `POST /api/assinatura` (cria customer + subscription) e `POST /api/webhooks/asaas` (idempotente) que atualiza `assinaturas.status` e libera/suspende o acesso.
6. **Frontend**: 
   - Tela de Planos (3 cards, destaque no Profissional) → checkout Asaas.
   - Componente de saldo de créditos no painel.
   - Bloqueio amigável quando sem crédito (CTA de upgrade).
   - Histórico de planos e atividades gerados.
7. **LGPD**: checkbox de consentimento no cadastro (gravar `aceite_lgpd`), página de política e botão "excluir minha conta".
8. **Ingestão da base**: script `scripts/ingest-base-conhecimento.mjs` que lê `src/data/bncc_skills.json` e os `.docx` de `planos de aula/` (extraindo texto) e popula `base_conhecimento`.

## Tom
Direto e técnico. Mantenha o padrão visual existente (tema escuro, gradiente roxo #6366f1→#a855f7). Indique claramente o que é código novo vs adaptado do existente. Comece pelo SQL e pelo middleware de créditos.
