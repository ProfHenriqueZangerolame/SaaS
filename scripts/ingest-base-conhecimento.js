// =====================================================================
// Ingestão da base de conhecimento (RAG) do PlanejaAÍ.
// Popula public.base_conhecimento a partir de:
//   - src/data/bncc_skills.json   -> tipo 'bncc'
//   - src/data/planos_modelo.json -> tipo 'plano_modelo'
// Idempotente: limpa cada tipo e reinsere.
//
// Requer SUPABASE_SERVICE_ROLE_KEY (creditsEnabled). Rodar com:
//   npm run ingest:bncc
// =====================================================================
import { readFileSync } from 'fs';
import { supabaseAdmin, creditsEnabled } from '../supabaseAdmin.js';
import { limparDescricao } from '../ragBncc.js';

if (!creditsEnabled) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ausente. Configure o .env antes de ingerir.');
  process.exit(1);
}

function ler(arquivo) {
  return JSON.parse(readFileSync(new URL(`../src/data/${arquivo}`, import.meta.url), 'utf-8'));
}

const linhasBncc = ler('bncc_skills.json').map((s) => ({
  tipo: 'bncc',
  ano_escolar: s.grade,
  componente: s.subject,
  titulo: s.code,
  conteudo_texto: limparDescricao(s.description),
  metadata: { code: s.code },
}));

const linhasModelo = ler('planos_modelo.json').map((p) => ({
  tipo: 'plano_modelo',
  ano_escolar: p.grade,
  componente: p.subject,
  titulo: p.titulo,
  conteudo_texto: p.conteudo_texto,
  metadata: { skillCode: p.skillCode || null },
}));

// Reingestão idempotente de um tipo: apaga e reinsere em lotes.
async function reingerir(tipo, linhas) {
  console.log(`📚 Ingerindo ${linhas.length} itens (tipo '${tipo}')...`);
  const { error: delErr } = await supabaseAdmin.from('base_conhecimento').delete().eq('tipo', tipo);
  if (delErr) {
    console.error(`Erro ao limpar tipo '${tipo}':`, delErr.message);
    process.exit(1);
  }
  const TAM = 500;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const { error } = await supabaseAdmin.from('base_conhecimento').insert(lote);
    if (error) {
      console.error(`Erro no lote ${i}-${i + lote.length} (tipo '${tipo}'):`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${Math.min(i + TAM, linhas.length)}/${linhas.length}`);
  }
}

async function main() {
  await reingerir('bncc', linhasBncc);
  await reingerir('plano_modelo', linhasModelo);
  console.log('✅ Base de conhecimento (BNCC + planos modelo) ingerida com sucesso.');
}

main().catch((err) => {
  console.error('Falha na ingestão:', err);
  process.exit(1);
});
