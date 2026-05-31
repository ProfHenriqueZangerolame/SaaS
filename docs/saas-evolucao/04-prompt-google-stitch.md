# Prompt para Google Stitch — PlanejaAÍ

> Cole no Google Stitch para prototipar as telas novas/atualizadas do SaaS.
> O design system reproduz o visual que o app já usa hoje (tema escuro premium).

---

## Contexto
PlanejaAÍ é um SaaS web onde professores do Ensino Fundamental geram planos de aula alinhados à BNCC e folhas de atividade usando IA. O usuário final é professor (nível técnico baixo), então as telas devem ser simples, diretas e acolhedoras. O produto é vendido por assinatura mensal (3 planos) com limite de créditos. Dois agentes de IA atuam nos bastidores: um gera o plano, outro gera a atividade a partir do plano.

## Telas a prototipar

1. **Login / Cadastro** — abas "Acessar" e "Cadastrar"; campos e-mail/senha (e nome no cadastro); checkbox de consentimento LGPD; logo do produto.
2. **Onboarding de Perfil** — nome do professor, cidade/estado, escola(s), turma, turno. Botão "Salvar e ir para o gerador".
3. **Painel / Gerador de Plano** — formulário (disciplina, ano, período, habilidade BNCC ou auto-detectar, recursos, precisa de adaptação). Botão "Gerar plano". Mostra no topo o **saldo de créditos** ("Você usou 12 de 60 este mês"). Resultado em ficha formatada com botão "Gerar atividade a partir deste plano".
4. **Folha de Atividade** — exibe a atividade gerada; nos planos pagos, mostra as figuras/imagens; botões "Baixar PDF" e gabarito do professor.
5. **Histórico** — lista de planos e atividades já gerados, com filtro por data/disciplina.
6. **Planos e Assinatura** — 3 cards lado a lado: Básico (R$19), **Profissional (R$30 — selo "MAIS POPULAR", em destaque visual)**, Premium (R$59). Cada card lista créditos/mês, modelo de IA e se inclui atividade com imagem. Botão "Assinar" (checkout Asaas: Pix/cartão).
7. **Meu Uso / Créditos** — barra de progresso do consumo do mês, plano atual, data de renovação, botão de upgrade.
8. **Sem créditos (estado de bloqueio)** — modal amigável: "Seus créditos do mês acabaram" + CTA "Fazer upgrade".

## Design System
- **Cor primária:** `#6366f1` (índigo)
- **Cor de destaque/ação:** gradiente `#6366f1 → #a855f7` (índigo→roxo) em botões e títulos
- **Fundo:** `#090810` (quase preto, radial sutil para `#12101f`)
- **Superfície (cards):** `rgba(25, 22, 44, 0.65)` com blur (glassmorphism), borda `rgba(255,255,255,0.08)`, raio 24px
- **Texto principal:** `#ffffff`; **secundário:** `#94a3b8`; **sucesso:** `#34d399`; **erro:** `#ef4444`
- **Tipografia:** "Plus Jakarta Sans" / "Outfit" / system-ui. H1 800–900, corpo 14px, labels 12px 700 uppercase
- **Tom visual:** minimalista premium, dark mode, cards com sombra suave e cantos arredondados, espaçamento generoso, selos/badges arredondados

**Instrução final:** Gere todas as telas de forma navegável e coerente entre si, respeitando o design system definido. Os componentes devem ser consistentes entre telas. Use o design system como base para todos os elementos visuais.
