# Evolução SaaS — Entregáveis da Consultoria

Documentação gerada na consultoria de produto (skill `consultor-sistema-ia`).
Stack mantida: React+Vite · Express · Supabase · Gemini. Venda B2C ao professor.

## Arquivos
1. [01-banco-de-dados.sql](01-banco-de-dados.sql) — esquema Supabase (planos, assinaturas, créditos, RAG) + RLS + funções.
2. [02-requisitos-funcionais.md](02-requisitos-funcionais.md) — requisitos por módulo.
3. [03-prompt-kickoff-claude-code.md](03-prompt-kickoff-claude-code.md) — prompt para implementar a evolução.
4. [04-prompt-google-stitch.md](04-prompt-google-stitch.md) — prompt para prototipar as telas.
5. [05-prompts-agentes-ia.md](05-prompts-agentes-ia.md) — treinamento dos 2 agentes (Plano + Atividade).
6. [06-ativacao-producao.md](06-ativacao-producao.md) — passos manuais para ligar créditos, Asaas, RAG e imagens em produção.

## Decisões-chave
- 3 planos: **Básico R$19 (20 créd, Flash)** · **Profissional R$30 (60 créd, Flash) — mais vendido** · **Premium R$59 (ilimitado, Pro)**.
- Créditos: plano=1, atividade texto=1, atividade com imagem=4 (só Pro/Premium).
- Pagamento: **Asaas** (Pix/cartão recorrente + webhook).
- "Treinar" agentes = RAG (BNCC + planos modelo), não fine-tuning.

## Sugestões de nome (placeholder atual: `PlanejaAÍ`)
**Diretos/descritivos:** PlanejaAI · AulaPronta · PlanoCerto · PlanAula · Aula em Minutos
**Com marca/IA:** ProfIA · MestreAula · EducaIA · Gênio da Aula · DocentePro
**Curtos/memoráveis:** Plana · Aulei · Lousa · Regência
> Antes de fechar, cheque domínio (.com.br) e Instagram livres.
