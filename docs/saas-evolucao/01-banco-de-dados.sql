-- =====================================================================
-- PlanejaAÍ — Evolucao SaaS · Esquema Supabase (PostgreSQL)
-- Stack mantida: React + Vite + Express + Supabase + Gemini
-- Modelo: B2C por professor. Cada professor = 1 conta isolada via RLS
--         (auth.uid()). NAO usamos tabela de "organizacoes" agora porque
--         a venda e direta ao professor. Se um dia vender para escola/
--         prefeitura, adiciona-se uma tabela `organizacoes` + org_id nas
--         tabelas. Isto e o dimensionamento correto, sem over-engineering.
-- Origem: gerado do zero para esta evolucao. A tabela `profiles` JA EXISTE
--         no projeto; aqui ela e ESTENDIDA via ALTER, nunca recriada.
-- =====================================================================

create extension if not exists "pgcrypto";
-- Opcional (busca semantica futura na base de conhecimento dos agentes):
-- create extension if not exists vector;

-- ---------------------------------------------------------------------
-- 0. profiles (JA EXISTE) — apenas garante colunas novas
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists aceite_lgpd        boolean     not null default false;
alter table public.profiles add column if not exists aceite_lgpd_em     timestamptz;
alter table public.profiles add column if not exists role               text        not null default 'teacher'; -- teacher | coordinator
alter table public.profiles add column if not exists criado_em          timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 1. planos — catalogo das assinaturas (3 tiers). Leitura publica.
-- ---------------------------------------------------------------------
create table if not exists public.planos (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique,          -- basico | profissional | premium
  nome             text        not null,
  preco_centavos   integer     not null,                 -- 1900 = R$19,00
  creditos_mensais integer,                              -- NULL = ilimitado
  modelo_ia        text        not null default 'flash', -- flash | pro
  permite_imagem   boolean     not null default false,   -- atividade com figuras
  destaque         boolean     not null default false,   -- selo "MAIS POPULAR"
  ordem            integer     not null default 0,
  ativo            boolean     not null default true,
  criado_em        timestamptz not null default now()
);

insert into public.planos (slug, nome, preco_centavos, creditos_mensais, modelo_ia, permite_imagem, destaque, ordem)
values
  ('basico',       'Basico',       1900, 20,   'flash', false, false, 1),
  ('profissional', 'Profissional', 3000, 60,   'flash', true,  true,  2),
  ('premium',      'Premium',      5900, null, 'pro',   true,  false, 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 2. assinaturas — vinculo professor <-> plano (gerido pelo Asaas)
-- ---------------------------------------------------------------------
create table if not exists public.assinaturas (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  plano_id              uuid        not null references public.planos(id),
  status                text        not null default 'trial', -- trial | ativa | pendente | suspensa | cancelada
  asaas_customer_id     text,
  asaas_subscription_id text,
  data_inicio           timestamptz not null default now(),
  proximo_vencimento    date,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  unique (user_id)                                            -- 1 assinatura ativa por professor
);
create index if not exists idx_assinaturas_user on public.assinaturas(user_id);
create index if not exists idx_assinaturas_asaas_sub on public.assinaturas(asaas_subscription_id);

-- ---------------------------------------------------------------------
-- 3. planos_gerados — historico das fichas de plano de aula (Agente 1)
-- ---------------------------------------------------------------------
create table if not exists public.planos_gerados (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  subject           text,
  grade             text,
  trimester         text,
  skill_code        text,
  skill_desc        text,
  resource_type     text,                 -- analog | projector | digital
  needs_adaptation  boolean     default false,
  unidade_ensino    text,
  nome_professor    text,
  turma             text,
  data_periodo      text,
  conteudo_json     jsonb       not null,  -- saida do Agente 1
  modelo_ia         text        not null default 'flash',
  criado_em         timestamptz not null default now()
);
create index if not exists idx_planos_gerados_user on public.planos_gerados(user_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 4. atividades_geradas — folhas de atividade (Agente 2)
-- ---------------------------------------------------------------------
create table if not exists public.atividades_geradas (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  plano_gerado_id   uuid        references public.planos_gerados(id) on delete set null,
  conteudo_json     jsonb       not null,  -- saida do Agente 2
  tem_imagem        boolean     not null default false,
  imagens_urls      text[]      default '{}', -- URLs no Supabase Storage (bucket atividades-imagens)
  modelo_ia         text        not null default 'flash',
  criado_em         timestamptz not null default now()
);
create index if not exists idx_atividades_user on public.atividades_geradas(user_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 5. usage_logs — razao de creditos + custo real de token (monitoramento)
--    Regra: plano=1, atividade texto=1, atividade c/ imagem=4
-- ---------------------------------------------------------------------
create table if not exists public.usage_logs (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  tipo                 text        not null,  -- plano | atividade | atividade_imagem
  creditos             integer     not null,
  modelo_ia            text        not null,  -- flash | pro
  tokens_input         integer     default 0,
  tokens_output        integer     default 0,
  imagens_geradas      integer     default 0,
  custo_estimado_cents integer     default 0, -- custo real estimado p/ voce monitorar margem
  referencia_id        uuid,                  -- id do plano/atividade gerado
  competencia          date        not null default date_trunc('month', now())::date,
  criado_em            timestamptz not null default now()
);
create index if not exists idx_usage_user_comp on public.usage_logs(user_id, competencia);

-- ---------------------------------------------------------------------
-- 6. base_conhecimento — RAG dos agentes (BNCC + planos modelo)
--    Popular com src/data/bncc_skills.json e os .docx extraidos.
-- ---------------------------------------------------------------------
create table if not exists public.base_conhecimento (
  id              uuid        primary key default gen_random_uuid(),
  tipo            text        not null,  -- bncc | plano_modelo
  ano_escolar     text,                  -- 1ano..5ano
  componente      text,                  -- Lingua Portuguesa, Matematica...
  titulo          text,
  conteudo_texto  text        not null,
  metadata        jsonb       default '{}'::jsonb,
  -- embedding    vector(768),           -- habilitar com pgvector p/ busca semantica
  criado_em       timestamptz not null default now()
);
create index if not exists idx_base_tipo_ano on public.base_conhecimento(tipo, ano_escolar, componente);

-- =====================================================================
-- RLS — cada professor so enxerga os proprios dados
-- =====================================================================
alter table public.assinaturas        enable row level security;
alter table public.planos_gerados     enable row level security;
alter table public.atividades_geradas enable row level security;
alter table public.usage_logs         enable row level security;
alter table public.planos             enable row level security;
alter table public.base_conhecimento  enable row level security;

-- Catalogo e base de conhecimento: leitura para autenticados; escrita so service_role
create policy "planos_read"  on public.planos            for select to authenticated using (true);
create policy "base_read"    on public.base_conhecimento for select to authenticated using (true);

-- Dados do usuario: dono total (CRUD pelo proprio)
create policy "assin_owner"  on public.assinaturas        for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "planos_owner" on public.planos_gerados     for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ativ_owner"   on public.atividades_geradas for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usage_owner"  on public.usage_logs         for select to authenticated using (auth.uid() = user_id);
-- INSERT em usage_logs e feito pelo backend (service_role), que ignora RLS.

-- =====================================================================
-- Funcoes de credito (chamadas pelo backend Express antes de gerar)
-- =====================================================================

-- Quanto resta no mes atual
create or replace function public.saldo_creditos(p_user uuid)
returns table(creditos_mensais integer, consumidos integer, restantes integer, ilimitado boolean)
language sql stable as $$
  with a as (
    select pl.creditos_mensais
    from public.assinaturas asg
    join public.planos pl on pl.id = asg.plano_id
    where asg.user_id = p_user and asg.status in ('ativa','trial')
    limit 1
  ),
  u as (
    select coalesce(sum(creditos),0)::int as gasto
    from public.usage_logs
    where user_id = p_user
      and competencia = date_trunc('month', now())::date
  )
  select
    a.creditos_mensais,
    u.gasto,
    case when a.creditos_mensais is null then 999999 else greatest(a.creditos_mensais - u.gasto, 0) end,
    (a.creditos_mensais is null)
  from a, u;
$$;

-- Pode gerar algo que custa p_custo creditos?
create or replace function public.pode_gerar(p_user uuid, p_custo integer)
returns boolean
language sql stable as $$
  select ilimitado or restantes >= p_custo
  from public.saldo_creditos(p_user);
$$;

-- =====================================================================
-- Storage: criar no painel Supabase um bucket PRIVADO chamado
--   "atividades-imagens" e servir as figuras via URL assinada.
-- =====================================================================
