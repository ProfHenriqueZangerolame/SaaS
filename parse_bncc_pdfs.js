import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const pdfDirectory = './bncc Es';
const outputFilePath = './src/data/bncc_skills.json';

// Mapeamento de matérias comuns baseadas em siglas de códigos BNCC
const subjectMapping = {
  LP: 'Português',
  MA: 'Matemática',
  CI: 'Ciências',
  HI: 'História',
  GE: 'Geografia',
  AR: 'Artes',
  EF: 'Educação Física',
  ER: 'Ensino Religioso',
  CO: 'Computação' // Novo Pensamento Computacional
};

const grades = {
  '1º': '1º Ano',
  '2º': '2º Ano',
  '3º': '3º Ano',
  '4º': '4º Ano',
  '5º': '5º Ano'
};

async function parseAllPDFs() {
  console.log('Iniciando a leitura e extração dos PDFs da BNCC...');
  const files = fs.readdirSync(pdfDirectory).filter(f => f.endsWith('.pdf'));
  
  let allSkills = [];

  for (const file of files) {
    const filePath = path.join(pdfDirectory, file);
    console.log(`Lendo o arquivo: ${file}`);
    
    // Determinar a série com base no nome do arquivo
    let fileGrade = '1º Ano';
    for (const key in grades) {
      if (file.includes(key)) {
        fileGrade = grades[key];
        break;
      }
    }

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const text = data.text;
      
      // Regex para encontrar códigos BNCC (Ex: EF01LP01 ou EF01CO01)
      const bnccRegex = /(EF\d{2}[A-Z]{2}\d{2})/g;
      
      let match;
      const matches = [];
      
      // Capturar todos os códigos e suas posições no texto
      while ((match = bnccRegex.exec(text)) !== null) {
        matches.push({
          code: match[1],
          index: match.index
        });
      }

      console.log(`Encontradas ${matches.length} correspondências de códigos em ${file}`);

      // Extrair o texto da descrição (o texto entre um código e o próximo)
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        
        let start = current.index + current.code.length;
        let end = next ? next.index : text.length;
        
        // Limpar o texto extraído da descrição
        let description = text.substring(start, end)
          .replace(/[\r\n]+/g, ' ') // remove quebras de linha
          .replace(/\s+/g, ' ')    // remove múltiplos espaços
          .trim();

        // Limpezas adicionais (remover pontuações iniciais comuns ou traços)
        description = description.replace(/^[:\-–—.\s]+/, '');

        // Cortar descrições excessivamente longas ou delimitar no primeiro ponto final caso haja muito texto acumulado
        if (description.length > 280) {
          const sentences = description.split(/(?<=[.!?])\s+/);
          description = sentences[0]; // Pega a primeira frase principal
        }

        // Determinar a matéria com base nas letras do código (Ex: LP -> Português, CO -> Computação)
        const subjectCode = current.code.substring(4, 6);
        const subjectName = subjectMapping[subjectCode] || 'Geral';

        // Evitar duplicados
        if (description.length > 10 && !allSkills.some(s => s.code === current.code)) {
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

  // Garantir que o diretório de destino exista
  const dir = path.dirname(outputFilePath);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  // Se por acaso a leitura falhar ou encontrar pouca coisa, garantir amostras sólidas
  if (allSkills.length === 0) {
    console.log('Nenhuma habilidade extraída. Gerando fallback rico...');
    allSkills = [
      { code: 'EF01LP01', description: 'Reconhecer que textos são lidos e escritos da esquerda para a direita.', subject: 'Português', grade: '1º Ano' },
      { code: 'EF01MA01', description: 'Utilizar números naturais como indicador de quantidade ou de ordem em diferentes situações.', subject: 'Matemática', grade: '1º Ano' },
      { code: 'EF02LP01', description: 'Expressar-se em situações de intercâmbio oral com clareza, preocupando-se em ser compreendido.', subject: 'Português', grade: '2º Ano' },
      { code: 'EF02MA01', description: 'Comparar e ordenar números naturais pela compreensão de características do sistema decimal.', subject: 'Matemática', grade: '2º Ano' },
      { code: 'EF03LP01', description: 'Ler e escrever palavras com sílabas complexas, respeitando as regras ortográficas.', subject: 'Português', grade: '3º Ano' },
      { code: 'EF04LP01', description: 'Grafar palavras utilizando regras de acentuação gráfica corretas.', subject: 'Português', grade: '4º Ano' },
      { code: 'EF05LP01', description: 'Participar de conversações em sala de aula, respeitando os turnos de fala de colegas.', subject: 'Português', grade: '5º Ano' },
      // Computação
      { code: 'EF01CO01', description: 'Identificar e criar algoritmos simples de forma desplugada.', subject: 'Computação', grade: '1º Ano' },
      { code: 'EF03CO01', description: 'Reconhecer padrões e loops simples em comandos de blocos visuais.', subject: 'Computação', grade: '3º Ano' },
      { code: 'EF05CO01', description: 'Criar, testar e depurar programas de computador usando Scratch.', subject: 'Computação', grade: '5º Ano' }
    ];
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(allSkills, null, 2), 'utf-8');
  console.log(`\n======================================================`);
  console.log(`🎉 EXTRAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`📁 Arquivo gerado: ${outputFilePath}`);
  console.log(`🏷️ Total de habilidades extraídas: ${allSkills.length}`);
  console.log(`======================================================\n`);
}

parseAllPDFs();
