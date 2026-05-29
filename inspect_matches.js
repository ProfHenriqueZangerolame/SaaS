import fs from 'fs';

const text = fs.readFileSync('d:\\TaekniEx\\SaaS\\bncc_computacao_text.txt', 'utf-8');
const regex = /(EF\d{2}CO\d{2})/g;
let match;
let count = 0;

while ((match = regex.exec(text)) !== null && count < 10) {
  const code = match[0];
  const idx = match.index;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 250);
  console.log(`--- MATCH ${count+1}: ${code} at index ${idx} ---`);
  console.log(text.substring(start, end));
  count++;
}
