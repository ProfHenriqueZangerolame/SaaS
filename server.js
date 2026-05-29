import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para permitir requisições do frontend
app.use(cors());

// Middleware para decodificar corpos de requisições em formato JSON
app.use(express.json());

// Rota de Teste de Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Backend do EduPlan-SaaS está operacional e seguro!',
    iaConnected: !!process.env.GEMINI_API_KEY
  });
});

// Função auxiliar de requisição robusta com retentativas automáticas e backoff exponencial
async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1500) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Se for 503 (Serviço Indisponível) ou 429 (Muitas requisições), retenta após o atraso
      if (response.status === 503 || response.status === 429) {
        console.warn(`Aviso: O Gemini retornou status ${response.status}. Tentativa ${i + 1} de ${maxRetries}. Retentando em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Dobra o tempo de atraso (Backoff Exponencial)
        continue;
      }
      
      // Para erros de cliente (como 400 ou chave inválida), não retenta e retorna direto
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Aviso: Falha na requisição de rede para o Gemini (tentativa ${i + 1} de ${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// Rota para Geração de Planos de Aula via Gemini
app.post('/api/generate-plan', async (req, res) => {
  const {
    subject,
    grade,
    trimester,
    skillCode,
    skillDesc,
    resourceType,
    needsAdaptation,
    unidadeEnsino,
    nomeProfessor,
    turma,
    dataPeriodo
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('ERRO: GEMINI_API_KEY não foi configurada no arquivo .env!');
    return res.status(500).json({
      error: 'Chave API não configurada',
      message: 'A chave GEMINI_API_KEY do servidor não foi configurada. Por favor, adicione-a no arquivo .env do servidor.'
    });
  }

  const recursoNome = resourceType === 'analog' ? 'Apenas Caderno e Lápis (Sem tecnologia/Desplugado)' :
                      resourceType === 'projector' ? 'Projetor ou Smart TV (Visualização coletiva)' : 
                      'Computadores ou Tablets (atividades digitais individuais ou em duplas)';

  // Prompt de Engenharia Pedagógica da Ficha Escolar Oficial (Persona: 40 anos de docência)
  const promptText = `
Você é um professor mestre extraordinário com mais de 40 anos de experiência prática diária em sala de aula de Ensino Fundamental. Suas aulas são lendárias por serem calorosas, extremamente práticas, fáceis de aplicar, lúdicas e altamente engajadoras para as crianças. Você escreve com a sabedoria e a simplicidade de quem conhece a fundo a realidade de uma sala de aula de verdade, evitando jargões acadêmicos frios.

Gere uma Ficha de Registro de Plano de Aula impecável e completa alinhada à BNCC.

DADOS DO CONTEXTO DA SALA:
- Unidade de Ensino: ${unidadeEnsino || 'EMEBTI Julieta Deps Tallon'}
- Professor: ${nomeProfessor || 'Henrique'}
- Turma/Turno: ${turma || '1º Ano A - Vespertino'}
- Data/Período: ${dataPeriodo || ''}
- Disciplina / Componente Curricular: ${subject}
- Ano Escolar: ${grade}
- Período: ${trimester}
- Habilidade(s) Principal(is) da BNCC: ${skillCode} (Descrição: ${skillDesc})
- Recursos Físicos Disponíveis: ${recursoNome}
- Necessita de material adaptado / inclusão (Educação Especial & TDAH)? ${needsAdaptation ? 'Sim' : 'Não'}

INSTRUÇÕES PEDAGÓGICAS CRUCIAIS PARA AS SEÇÕES:
1. OBJETO DE CONHECIMENTO: Mapeie o(s) objeto(s) de conhecimento (conteúdo temático) oficiais da BNCC diretamente alinhados à habilidade descrita. Seja direto.
2. DESENVOLVIMENTO METODOLÓGICO: Forneça o passo a passo prático e cronológico de como dar a aula (acolhimento, introdução, atividade principal baseada nos materiais, e encerramento). O tom deve ser o de um professor experiente de 40 anos de carreira (dicas práticas de como organizar os alunos, como gerenciar o tempo e como falar com eles).
3. AVALIAÇÃO: Descreva os critérios de avaliação formativa e processual (como observar e registrar a aprendizagem dos alunos durante as dinâmicas).
4. MATERIAL ADAPTADO PARA EDUCAÇÃO ESPECIAL E TDAH: 
   - Se o campo 'Necessita de material adaptado / inclusão' for SIM: Crie de forma altamente empática e detalhada adaptações pedagógicas específicas baseadas na atividade desenvolvida (inclusão para estudantes do Público da Educação Especial Lei Municipal nº 881/2010 e auxílios de foco para estudantes com TDAH Lei Estadual nº 11.076/2019).
   - Se o campo 'Necessita de material adaptado / inclusão' for NÃO: VOCÊ DEVE DEIXAR O CAMPO "materialAdaptado" TOTALMENTE VAZIO (retorne uma string vazia ""). Não crie nenhuma adaptação.
5. OBSERVAÇÕES: Uma nota final inspiradora ou aviso prático de sala de aula.

Responda estritamente em formato JSON válido e purificado (sem blocos markdown de código, apenas o objeto JSON puro), com a seguinte estrutura de chaves exatas:
{
  "title": "Título caloroso da aula",
  "skillCode": "Código da(s) habilidade(s) oficiais da BNCC mapeada(s) (ex: EF01LP01). Se o professor enviou um código real e válido (diferente de AUTO_DETECT), repita e retorne exatamente o mesmo código enviado. Se enviou AUTO_DETECT, você DEVE encontrar na sua base pedagógica as habilidades oficiais ideais para o tema e retornar seus códigos reais.",
  "skillDesc": "Descrição da(s) habilidade(s) oficiais da BNCC mapeada(s). Se o professor enviou uma descrição válida, repita a mesma. Se enviou AUTO_DETECT, escreva a descrição oficial e completa da habilidade mapeada por você.",
  "objetoConhecimento": "Texto resumindo o Objeto de Conhecimento da BNCC correspondente à habilidade",
  "desenvolvimentoMetodologico": "Texto detalhado do passo a passo metodológico prático cronometrado (Acolhimento, Introdução, Prática, Sistematização).",
  "avaliacao": "Texto descrevendo os critérios e técnicas de avaliação.",
  "materialAdaptado": "Detalhamento das adaptações curriculares e materiais físicos adaptados para Educação Especial (Lei nº 881/2010 - Municipal) e TDAH (Lei nº 11.076/2019 - Estadual) correspondentes a esta atividade.",
  "observacoes": "Conselhos sábios adicionais de um professor sênior sobre a aula."
}
`;

  try {
    // Chamada à API do Gemini usando o modelo gemini-2.5-flash com mecanismo de retentativas automáticas
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Falha na resposta do Gemini:', errText);
      throw new Error('Gemini API returns error');
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    console.log('Resposta bruta da IA recebida. Iniciando parsing robusto...');

    let cleanedText = responseText.trim();
    
    // 1. Remover marcações de código markdown caso a IA tenha adicionado
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    let planJson;
    try {
      // Tenta o parse padrão inicial
      planJson = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn('Aviso: O parse JSON padrão falhou devido a quebras de linha físicas. Iniciando sanitização de strings...');
      try {
        // 2. Sanitizador robusto: Escapa quebras de linha físicas dentro das aspas do JSON
        // Usa uma regex precisa que respeita aspas escapadas (\") para não quebrar a estrutura do JSON
        const sanitized = cleanedText.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
          const cleanedVal = p1.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
          return `: "${cleanedVal}"`;
        });
        planJson = JSON.parse(sanitized);
      } catch (sanitizationError) {
        console.error('Falha crítica de parsing JSON após sanitização:', sanitizationError);
        console.log('Resposta original do Gemini:', responseText);
        throw parseError; // Lança o erro de parse original
      }
    }

    res.json(planJson);

  } catch (error) {
    console.error('Erro de Processamento no Servidor:', error);
    res.status(500).json({
      error: 'Erro de processamento da IA',
      message: 'Ocorreu uma falha interna na comunicação com o Gemini. Verifique a chave API ou a sintaxe da chamada.'
    });
  }
});

// Rota para Geração de Folha de Atividades para Alunos via Gemini
app.post('/api/generate-activity', async (req, res) => {
  const {
    subject,
    grade,
    skillCode,
    skillDesc,
    title,
    objetoConhecimento,
    desenvolvimentoMetodologico
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Chave API não configurada',
      message: 'A chave GEMINI_API_KEY do servidor não foi configurada. Por favor, adicione-a no arquivo .env do servidor.'
    });
  }

  const promptText = `
Você é um professor mestre extraordinário com mais de 40 anos de experiência prática diária em sala de aula de Ensino Fundamental.
Crie uma Folha de Atividades / Exercícios lúdica, engajadora e extremamente atraente para os alunos fazerem em sala de aula ou em casa, com base no seguinte Plano de Aula:

PLANO DE AULA BASE:
- Disciplina: ${subject}
- Ano Escolar: ${grade}
- Habilidade BNCC: ${skillCode} (${skillDesc})
- Título da Aula: ${title}
- Objeto de Conhecimento: ${objetoConhecimento}
- Metodologia Aplicada: ${desenvolvimentoMetodologico}

INSTRUÇÕES DE CONTEÚDO PARA A FOLHA DE ATIVIDADES:
1. TÍTULO DIVERTIDO: Crie um título amigável e empolgante para a folha (ex: "Missão Espacial dos Números", "Exploradores das Palavras").
2. INTRODUÇÃO LÚDICA: Escreva um pequeno texto introdutório (2 a 4 linhas) motivador em linguagem infantil/juvenil de acordo com a série (${grade}), convidando o aluno para o desafio.
3. TAREFAS / EXERCÍCIOS (Mínimo de 3, máximo de 4 itens):
   - Crie uma mistura de tipos de questões:
     - Algumas de resposta textual ou explicação simples.
     - Pelo menos uma lúdica ou de múltipla escolha (se for coerente).
     - Pelo menos uma de criação ou expressão criativa (como desenho, ligar pontos ou roteiro de ação), muito recomendada para o Ensino Fundamental.
4. INSTRUÇÕES ADAPTADAS (INCLUSÃO): Forneça orientações adicionais curtas, amigáveis e com linguagem simplificada para ajudar alunos da Educação Especial e TDAH a compreenderem as tarefas de maneira autônoma (ex: quebra de passos em frases simples, palavras-chave em destaque).

Responda estritamente em formato JSON válido e purificado (sem blocos markdown de código, apenas o objeto JSON puro), com a seguinte estrutura de chaves exatas:
{
  "title": "Título Divertido da Atividade",
  "introduction": "Texto curto e lúdico de introdução para o aluno.",
  "tasks": [
    {
      "type": "text", // Pode ser "text", "multiple-choice" ou "drawing"
      "question": "Comando da Pergunta 1. Ex: Escreva com suas palavras...",
      "options": [], // Use apenas se type for "multiple-choice", ex: ["Opção A", "Opção B", "Opção C", "Opção D"]. Caso contrário, deixe array vazio []
      "spacing": "medium", // Pode ser "small", "medium" ou "large" (determina o espaço para resposta)
      "teacherAnswer": "Resolução esperada, gabarito ou sugestão de resposta detalhada para o professor usar na correção."
    },
    ...
  ],
  "adaptedInstructions": "Instruções simplificadas e dicas de apoio visual para inclusão de Educação Especial e TDAH."
}
`;

  try {
    // Chamada com mecanismo de retentativas automáticas
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Falha na resposta do Gemini para Atividades:', errText);
      throw new Error('Gemini API returns error');
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    let activityJson;
    try {
      activityJson = JSON.parse(cleanedText);
    } catch {
      // Sanitizador robusto
      const sanitized = cleanedText.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
        const cleanedVal = p1.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
        return `: "${cleanedVal}"`;
      });
      activityJson = JSON.parse(sanitized);
    }

    res.json(activityJson);

  } catch (error) {
    console.error('Erro de Processamento de Atividades no Servidor:', error);
    res.status(500).json({
      error: 'Erro de processamento de atividades da IA',
      message: 'Ocorreu uma falha na geração da folha de atividades. Verifique a chave ou o console do servidor.'
    });
  }
});

// Inicializar o Servidor Express
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 SERVIDOR BACKEND DO EDUPLAN-SAAS ATIVO!`);
  console.log(`🔌 Porta: ${PORT}`);
  console.log(`🔗 Link de Status: http://localhost:${PORT}/api/status`);
  console.log(`================================================================`);
});
