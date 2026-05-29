import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function parseBNCC() {
  const filePath = 'd:\\TaekniEx\\computacional antigravity\\bncc computacional\\pdf\\BNCCComputaoCompletodiagramado.pdf';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  
  console.log('Reading file...');
  const dataBuffer = fs.readFileSync(filePath);
  
  console.log('Parsing PDF with PDFParse...');
  try {
    const parser = new pdf.PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    const text = result.text;
    await parser.destroy();
    
    console.log('Success! Text length:', text.length);
    
    // Save to text file
    fs.writeFileSync('d:\\TaekniEx\\SaaS\\bncc_computacao_text.txt', text, 'utf-8');
    console.log('Saved text to bncc_computacao_text.txt');
    
    // Find all BNCC codes in the text
    const bnccRegex = /(EF\d{2}[A-Z]{2}\d{2})/g;
    const matches = Array.from(text.matchAll(bnccRegex)).map(m => m[0]);
    const uniqueMatches = [...new Set(matches)];
    console.log('Found BNCC codes:', uniqueMatches);
  } catch (error) {
    console.error('Error parsing:', error);
  }
}

parseBNCC();
