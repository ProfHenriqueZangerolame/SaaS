# Requisitos Funcionais — PlanejaAÍ (Evolução SaaS)

> Origem: gerado nesta consultoria. Os módulos "Geração de Plano" e "Geração de
> Atividade" já existem parcialmente no `server.js` atual; os demais são novos.

## Módulo: Conta e Perfil (já existe)
1. O sistema deve permitir cadastro e login do professor por e-mail e senha (Supabase Auth).
2. O sistema deve coletar no onboarding: nome, cidade, estado, escola(s), turma e turno.
3. O sistema deve usar os dados do perfil para auto-preencher o cabeçalho das fichas.

## Módulo: Agente 1 — Geração de Plano de Aula
4. O sistema deve gerar uma Ficha de Registro de Plano de Aula alinhada à BNCC a partir de disciplina, ano, período, habilidade e recursos.
5. O sistema deve aterrar a geração na base de conhecimento (BNCC + planos modelo) antes de responder.
6. O sistema deve mapear automaticamente a habilidade BNCC quando o professor enviar `AUTO_DETECT`.
7. O sistema deve gerar adaptação para Educação Especial/TDAH apenas quando solicitado.
8. O sistema deve salvar cada plano gerado no histórico do professor (`planos_gerados`).

## Módulo: Agente 2 — Geração de Folha de Atividade
9. O sistema deve gerar uma folha de atividade a partir de um plano de aula já gerado pelo Agente 1.
10. O sistema deve produzir atividades em texto (perguntas, múltipla escolha, criação) com gabarito para o professor.
11. O sistema deve, nos planos Profissional e Premium, gerar atividades com figuras/imagens educativas.
12. O sistema deve armazenar as imagens geradas no Supabase Storage (bucket privado) e vinculá-las à atividade.

## Módulo: Planos, Créditos e Limites (SaaS)
13. O sistema deve oferecer 3 planos: Básico (20 créditos/Flash), Profissional (60 créditos/Flash, mais popular) e Premium (ilimitado/Pro).
14. O sistema deve debitar créditos por geração: plano = 1, atividade texto = 1, atividade com imagem = 4.
15. O sistema deve bloquear a geração com mensagem clara quando o saldo do mês acabar, oferecendo upgrade.
16. O sistema deve liberar atividade com imagem somente nos planos Profissional e Premium.
17. O sistema deve definir o modelo de IA (Flash ou Pro) conforme o plano do professor.
18. O sistema deve exibir ao professor o saldo de créditos ("usou X de Y este mês").
19. O sistema deve reiniciar o saldo a cada mês (competência).
20. O sistema deve registrar o consumo real de token e custo estimado por geração para monitoramento de margem.

## Módulo: Pagamento e Assinatura (Asaas)
21. O sistema deve criar/assinar o professor no Asaas (cliente + assinatura recorrente) ao escolher um plano.
22. O sistema deve suportar Pix e cartão recorrente via Asaas.
23. O sistema deve expor o webhook `POST /api/webhooks/asaas` para receber eventos de pagamento.
24. O sistema deve ativar o acesso quando o pagamento for confirmado e suspender quando vencer/falhar.
25. O sistema deve oferecer trial inicial e permitir upgrade/downgrade/cancelamento.

## Módulo: Privacidade e LGPD
26. O sistema deve exigir consentimento explícito de uso de dados no cadastro.
27. O sistema deve disponibilizar política de privacidade.
28. O sistema deve permitir ao professor exportar e excluir seus dados/conta.

## Módulo: Base de Conhecimento (RAG dos Agentes)
29. O sistema deve manter uma base com habilidades BNCC e planos de aula modelo.
30. O sistema deve recuperar os itens mais relevantes (por ano/componente) e injetá-los no prompt do Agente 1.

## API Interna (Backend Express)
31. `POST /api/generate-plan` — gera plano (valida crédito antes, debita depois).
32. `POST /api/generate-activity` — gera atividade a partir de um plano (valida/debita crédito).
33. `GET /api/saldo` — retorna saldo de créditos do mês.
34. `POST /api/assinatura` — inicia assinatura no Asaas.
35. `POST /api/webhooks/asaas` — processa eventos de pagamento (idempotente).
