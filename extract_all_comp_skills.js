import fs from 'fs';

const text = fs.readFileSync('d:\\TaekniEx\\SaaS\\bncc_computacao_text.txt', 'utf-8');
const regex = /\((EF\d{2}CO\d{2})\)/g;

let matches = [];
let match;
while ((match = regex.exec(text)) !== null) {
  matches.push({
    code: match[1],
    index: match.index,
    length: match[0].length
  });
}

console.log('Total matches found:', matches.length);

const gradeLabels = {
  '01': '1º Ano',
  '02': '2º Ano',
  '03': '3º Ano',
  '04': '4º Ano',
  '05': '5º Ano',
  '06': '6º Ano',
  '07': '7º Ano',
  '08': '8º Ano',
  '09': '9º Ano',
  '15': '1º ao 5º Ano',
  '69': '6º ao 9º Ano'
};

const extractedSkills = [];

for (let i = 0; i < matches.length; i++) {
  const current = matches[i];
  const next = matches[i + 1];
  
  const start = current.index + current.length;
  const end = next ? next.index : text.length;
  
  let rawDesc = text.substring(start, end);
  
  // Clean page numbers like -- 16 of 75 --
  rawDesc = rawDesc.replace(/-- \d+ of \d+ --/g, '');
  rawDesc = rawDesc.replace(/-- \d+ of \d+ -/g, '');
  
  // Clean headers
  rawDesc = rawDesc.replace(/PENSAMENTO COMPUTACIONAL/g, '');
  rawDesc = rawDesc.replace(/MUNDO DIGITAL/g, '');
  rawDesc = rawDesc.replace(/CULTURA DIGITAL/g, '');
  rawDesc = rawDesc.replace(/COMPUTAÇÃO - \d+º ANO/gi, '');
  rawDesc = rawDesc.replace(/COMPUTAÇÃO - \d+º a \d+º ANO/gi, '');
  rawDesc = rawDesc.replace(/\(CONTINUAÇÃO\)/g, '');
  
  // Find topics before the description, if any, and remove them
  // A topic is usually at the start of the description or right before the next code.
  // We want to extract the main sentence of the skill, which starts with a verb in infinitive.
  // Ex: "Organizar...", "Identificar...", "Reconhecer...", "Representar...", "Diferenciar..."
  
  let cleanDesc = rawDesc.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Let's find where the infinitive verb starts.
  // In Portuguese, BNCC skills start with verbs in infinitive like Organizar, Identificar, Reorganizar, Reconhecer, Representar, Criar, Simular, Diferenciar, Utilizar, Planejar, etc.
  const verbMatch = cleanDesc.match(/\b(Organizar|Identificar|Reorganizar|Reconhecer|Representar|Criar|Simular|Diferenciar|Compreender|Utilizar|Planejar|Analisar|Discutir|Avaliar|Desenvolver|Projetar|Debater|Aplicar|Associar|Descrever|Escolher|Pesquisar|Explicar|Propor|Interagir|Adotar|Promover|Refletir|Solucionar|Testar|Depurar|Definir|Configurar|Instalar|Mapear|Expressar|Classificar|Comparar|Selecionar|Demonstrar|Respeitar|Valorizar|Diagnosticar|Praticar|Interpretar|Visualizar|Formular|Operar|Empregar|Partilhar|Colaborar|Construir|Executar|Validar|Estruturar|Modificar)\b/);
  
  if (verbMatch) {
    cleanDesc = cleanDesc.substring(verbMatch.index);
  }
  
  // Crop at "EXPLICAÇÃO DA HABILIDADE" or "Exemplos" or any other section header
  const cropHeaders = [
    'EXPLICAÇÃO DA HABILIDADE',
    'EXEMPLOS',
    'Explicação da Habilidade',
    'Exemplos',
    'Série',
    'Unidade Temática',
    'Objeto de Conhecimento'
  ];
  
  for (const crop of cropHeaders) {
    const cropIdx = cleanDesc.indexOf(crop);
    if (cropIdx !== -1) {
      cleanDesc = cleanDesc.substring(0, cropIdx).trim();
    }
  }
  
  // Remove trailing and leading punctuation
  cleanDesc = cleanDesc.replace(/^[:\-–—.\s]+/, '').replace(/[:\-–—.\s]+$/, '.').trim();
  
  // Fallback check: if description is too long or contains parts of other text, split at first period
  if (cleanDesc.length > 250) {
    const sentences = cleanDesc.split(/(?<=[.!?])\s+/);
    cleanDesc = sentences[0];
  }
  
  const gradeCode = current.code.substring(2, 4);
  const gradeName = gradeLabels[gradeCode] || 'Outro';
  
  // Find which Axis this skill is in
  let axis = 'Geral';
  const prefix = text.substring(Math.max(0, current.index - 300), current.index);
  if (prefix.includes('PENSAMENTO COMPUTACIONAL')) {
    axis = 'Pensamento Computacional';
  } else if (prefix.includes('MUNDO DIGITAL')) {
    axis = 'Mundo Digital';
  } else if (prefix.includes('CULTURA DIGITAL')) {
    axis = 'Cultura Digital';
  } else {
    // Search rawDesc too
    if (rawDesc.includes('PENSAMENTO COMPUTACIONAL')) axis = 'Pensamento Computacional';
    else if (rawDesc.includes('MUNDO DIGITAL')) axis = 'Mundo Digital';
    else if (rawDesc.includes('CULTURA DIGITAL')) axis = 'Cultura Digital';
  }
  
  if (cleanDesc.length > 10) {
    extractedSkills.push({
      code: current.code,
      description: cleanDesc,
      subject: 'Computação',
      grade: gradeName,
      axis: axis
    });
  }
}

console.log('Total extracted cleaned skills:', extractedSkills.length);

fs.writeFileSync('d:\\TaekniEx\\SaaS\\src\\data\\bncc_computacao_extracted.json', JSON.stringify(extractedSkills, null, 2), 'utf-8');
console.log('Saved to src/data/bncc_computacao_extracted.json');

// Let's print the first 10 extracted skills to inspect
console.log('Sample skills:', extractedSkills.slice(0, 10));
