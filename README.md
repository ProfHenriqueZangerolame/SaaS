# EduPlan SaaS

Gerador de fichas de registro de plano de aula alinhadas à BNCC, com apoio de IA no papel de um professor experiente com mais de 40 anos de sala de aula.

## Requisitos

- Node.js 20 ou superior
- Chave `GEMINI_API_KEY`

## Configuração

1. Copie `.env.example` para `.env`.
2. Preencha `GEMINI_API_KEY`.
3. Instale as dependências:

```bash
npm install
```

## Desenvolvimento

Em um terminal, suba o backend:

```bash
npm run dev:server
```

Em outro terminal, suba o frontend:

```bash
npm run dev
```

Por padrão, o frontend chama `http://localhost:3000`. Para mudar isso, defina `VITE_API_BASE_URL` no ambiente do frontend.

## Scripts

- `npm run dev`: inicia o Vite.
- `npm run dev:server`: inicia o backend Express.
- `npm run build`: gera o build de produção do frontend.
- `npm run lint`: valida os arquivos JavaScript/JSX do app e do backend.
- `npm run preview`: pré-visualiza o build do Vite.
