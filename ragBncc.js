import { readFileSync } from 'fs';
import { supabaseAdmin, creditsEnabled } from './supabaseAdmin.js';

// Carrega as habilidades BNCC do arquivo local uma única vez. Serve como
// fallback de aterramento (RAG) quando o banco não está disponível ou a
// tabela base_conhecimento ainda não foi populada.
let BNCC_LOCAL = [];
try {
  const raw = readFileSync(new URL('./src/data/bncc_skills.json', import.meta.url), 'utf-8');
  BNCC_LOCAL = JSON.parse(raw);
} catch (err) {
  console.warn('[RAG] Não foi possível carregar bncc_skills.json local:', err.message);
}

// Planos de aula modelo (estilo/estrutura da rede) por componente/ano.
let PLANOS_MODELO_LOCAL = [];
try {
  const raw = readFileSync(new URL('./src/data/planos_modelo.json', import.meta.url), 'utf-8');
  PLANOS_MODELO_LOCAL = JSON.parse(raw);
} catch (err) {
  console.warn('[RAG] Não foi possível carregar planos_modelo.json local:', err.message);
}

// Remove artefatos de extração das descrições ( ") " no início, " (" no fim ).
export function limparDescricao(texto = '') {
  return String(texto).replace(/^\s*\)\s*/, '').replace(/\s*\(\s*$/, '').trim();
}

// Recupera as habilidades BNCC oficiais do ano/componente solicitados para
// injetar no prompt do Agente 1 (aterramento contra alucinação de códigos).
// Tenta a base_conhecimento (tipo 'bncc'); cai para o JSON local se preciso.
export async function habilidadesBncc({ subject, grade, limit = 60 }) {
  if (creditsEnabled && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('base_conhecimento')
        .select('titulo, conteudo_texto')
        .eq('tipo', 'bncc')
        .eq('componente', subject)
        .eq('ano_escolar', grade)
        .limit(limit);
      if (!error && data?.length) {
        return data.map((r) => `${r.titulo} — ${limparDescricao(r.conteudo_texto)}`);
      }
    } catch (err) {
      console.warn('[RAG] Falha ao consultar base_conhecimento, usando fallback local:', err.message);
    }
  }

  // Fallback local: mesmo critério de filtro do frontend.
  return BNCC_LOCAL
    .filter((s) => s.subject === subject && s.grade === grade)
    .slice(0, limit)
    .map((s) => `${s.code} — ${limparDescricao(s.description)}`);
}

// Bloco de texto pronto para colar no prompt (vazio se nada encontrado).
export async function blocoHabilidadesBncc({ subject, grade }) {
  const lista = await habilidadesBncc({ subject, grade });
  if (!lista.length) return '';
  return `\nHABILIDADES BNCC OFICIAIS DISPONÍVEIS PARA ${grade} — ${subject} (use SOMENTE códigos desta lista; nunca invente):\n${lista.map((l) => `- ${l}`).join('\n')}\n`;
}

// Recupera planos de aula modelo do componente solicitado (prioriza o mesmo
// ano; completa com outros anos do componente). Aterra o ESTILO/ESTRUTURA do
// Agente 1, substituindo os exemplos antes fixos no prompt.
export async function planosModelo({ subject, grade, limit = 3 }) {
  // Tenta a base_conhecimento (tipo 'plano_modelo').
  if (creditsEnabled && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('base_conhecimento')
        .select('componente, ano_escolar, titulo, conteudo_texto, metadata')
        .eq('tipo', 'plano_modelo')
        .eq('componente', subject)
        .limit(20);
      if (!error && data?.length) {
        return ordenarPorAno(data.map((r) => ({
          subject: r.componente,
          grade: r.ano_escolar,
          titulo: r.titulo,
          conteudo_texto: r.conteudo_texto,
          skillCode: r.metadata?.skillCode,
        })), grade).slice(0, limit);
      }
    } catch (err) {
      console.warn('[RAG] Falha ao consultar planos modelo, usando fallback local:', err.message);
    }
  }

  // Fallback local.
  const doComponente = PLANOS_MODELO_LOCAL.filter((p) => p.subject === subject);
  return ordenarPorAno(doComponente, grade).slice(0, limit);
}

// Coloca os planos do ano pedido primeiro, depois os demais do componente.
function ordenarPorAno(lista, grade) {
  const mesmoAno = lista.filter((p) => p.grade === grade);
  const outros = lista.filter((p) => p.grade !== grade);
  return [...mesmoAno, ...outros];
}

// Bloco de texto pronto com os planos modelo (vazio se nada encontrado).
export async function blocoPlanosModelo({ subject, grade }) {
  const modelos = await planosModelo({ subject, grade });
  if (!modelos.length) return '';
  const itens = modelos
    .map((m, i) => `Exemplo ${i + 1} (${m.subject} — ${m.grade}${m.skillCode ? `, ${m.skillCode}` : ''}):\n${m.conteudo_texto}`)
    .join('\n\n');
  return `\nEXEMPLOS MODELO DE REFERÊNCIA PEDAGÓGICA (estrutura e tom reais da rede municipal — inspire-se rigidamente neles, priorizando o mesmo componente curricular):\n${itens}\n`;
}

export { BNCC_LOCAL, PLANOS_MODELO_LOCAL };
