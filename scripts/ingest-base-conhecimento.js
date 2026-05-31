// =====================================================================
// Ingestão da base de conhecimento (RAG) — habilidades BNCC
// Popula public.base_conhecimento (tipo 'bncc') a partir de
// src/data/bncc_skills.json. Idempotente: limpa os 'bncc' e reinsere.
//
// Requer SUPABASE_SERVICE_ROLE_KEY (creditsEnabled). Rodar com:
//   node scripts/ingest-base-conhecimento.js
// =====================================================================
import { readFileSync } from 'fs';
import { supabaseAdmin, creditsEnabled } from '../supabaseAdmin.js';
import { limparDescricao } from '../ragBncc.js';

if (!creditsEnabled) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ausente. Configure o .env antes de ingerir.');
  process.exit(1);
}

const skills = JSON.parse(
  readFileSync(new URL('../src/data/bncc_skills.json', import.meta.url), 'utf-8')
);

const linhas = skills.map((s) => ({
  tipo: 'bncc',
  ano_escolar: s.grade,
  componente: s.subject,
  titulo: s.code,
  conteudo_texto: limparDescricao(s.description),
  metadata: { code: s.code },
}));

async function main() {
  console.log(`📚 Ingerindo ${linhas.length} habilidades BNCC...`);

  // Limpa as habilidades BNCC antigas para reingestão idempotente.
  const { error: delErr } = await supabaseAdmin
    .from('base_conhecimento')
    .delete()
    .eq('tipo', 'bncc');
  if (delErr) {
    console.error('Erro ao limpar base anterior:', delErr.message);
    process.exit(1);
  }

  // Insere em lotes para não estourar limites de payload.
  const TAM = 500;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const { error } = await supabaseAdmin.from('base_conhecimento').insert(lote);
    if (error) {
      console.error(`Erro no lote ${i}-${i + lote.length}:`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${Math.min(i + TAM, linhas.length)}/${linhas.length}`);
  }

  console.log('✅ Base de conhecimento BNCC ingerida com sucesso.');
}

main().catch((err) => {
  console.error('Falha na ingestão:', err);
  process.exit(1);
});
