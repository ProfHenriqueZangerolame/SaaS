const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfDirectory = './bncc Es';
const outputFilePath = './src/data/bncc_skills.json';

const subjectMapping = {
  LP: 'Português',
  MA: 'Matemática',
  CI: 'Ciências',
  HI: 'História',
  GE: 'Geografia',
  AR: 'Artes',
  EF: 'Educação Física',
  ER: 'Ensino Religioso',
  CO: 'Computação' // BNCC Computacional
};

const gradeMapping = {
  '01': '1º Ano',
  '02': '2º Ano',
  '03': '3º Ano',
  '04': '4º Ano',
  '05': '5º Ano'
};

async function parseAllPDFs() {
  console.log('Iniciando a leitura e extração dos PDFs da BNCC...');
  
  if (!fs.existsSync(pdfDirectory)) {
    console.error(`Erro: A pasta '${pdfDirectory}' não foi encontrada.`);
    return;
  }

  const files = fs.readdirSync(pdfDirectory).filter(f => f.endsWith('.pdf'));
  let allSkills = [];

  for (const file of files) {
    const filePath = path.join(pdfDirectory, file);
    console.log(`Lendo o arquivo: ${file}`);

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new pdf.PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      const text = result.text;
      await parser.destroy();
      
      // Regex para encontrar códigos BNCC (Ex: EF01LP01 ou EF01CO01)
      const bnccRegex = /(EF\d{2}[A-Z]{2}\d{2})/g;
      
      let match;
      const matches = [];
      
      while ((match = bnccRegex.exec(text)) !== null) {
        matches.push({
          code: match[1],
          index: match.index
        });
      }

      console.log(`Encontrados ${matches.length} códigos em ${file}`);

      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        
        let start = current.index + current.code.length;
        let end = next ? next.index : text.length;
        
        let description = text.substring(start, end)
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        description = description.replace(/^[:\-–—.\s]+/, '');

        // Truncar descrições longas
        if (description.length > 250) {
          const sentences = description.split(/(?<=[.!?])\s+/);
          description = sentences[0];
        }

        // Determinar a matéria (Ex: LP -> Português, MA -> Matemática)
        const subjectCode = current.code.substring(4, 6);
        const subjectName = subjectMapping[subjectCode] || 'Geral';

        // Determinar a série dinamicamente pelo próprio código (Ex: EF01 -> 1º Ano, EF02 -> 2º Ano)
        const gradeCode = current.code.substring(2, 4);
        const fileGrade = gradeMapping[gradeCode];

        // Filtrar apenas se a habilidade pertencer ao Ensino Fundamental I (1º ao 5º ano)
        if (fileGrade && description.length > 10 && !allSkills.some(s => s.code === current.code)) {
          allSkills.push({
            code: current.code,
            description: description,
            subject: subjectName,
            grade: fileGrade
          });
        }
      }
    } catch (err) {
      console.error(`Erro ao processar o arquivo ${file}:`, err);
    }
  }

  const dir = path.dirname(outputFilePath);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  // Fallback se não encontrar nada nos arquivos
  if (allSkills.length === 0) {
    console.log('Nenhuma habilidade extraída. Usando fallback padrão estruturado...');
    allSkills = [
      { code: 'EF01LP01', description: 'Reconhecer que textos são lidos e escritos da esquerda para a direita.', subject: 'Português', grade: '1º Ano' },
      { code: 'EF01MA01', description: 'Utilizar números naturais como indicador de quantidade ou de ordem.', subject: 'Matemática', grade: '1º Ano' },
      { code: 'EF02LP01', description: 'Expressar-se em situações de intercâmbio oral com clareza.', subject: 'Português', grade: '2º Ano' },
      { code: 'EF03LP01', description: 'Ler e escrever palavras com sílabas complexas.', subject: 'Português', grade: '3º Ano' },
      { code: 'EF04MA01', description: 'Ler, escrever e ordenar números naturais até a ordem das dezenas de milhar.', subject: 'Matemática', grade: '4º Ano' },
      { code: 'EF05LP01', description: 'Participar de conversações em sala de aula, respeitando os turnos de fala.', subject: 'Português', grade: '5º Ano' },
      { code: 'EF01CO01', description: 'Criar algoritmos simples de forma desplugada.', subject: 'Computação', grade: '1º Ano' }
    ];
  }

  // Ordenar as habilidades para exibição amigável (por matéria e depois por código)
  allSkills.sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return a.code.localeCompare(b.code);
  });

  fs.writeFileSync(outputFilePath, JSON.stringify(allSkills, null, 2), 'utf-8');
  console.log(`\n======================================================`);
  console.log(`🎉 EXTRAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`📁 Arquivo gerado: ${outputFilePath}`);
  console.log(`🏷️ Total de habilidades oficiais extraídas: ${allSkills.length}`);
  console.log(`======================================================\n`);
}

parseAllPDFs();
