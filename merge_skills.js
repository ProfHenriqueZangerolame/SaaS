import fs from 'fs';

const skillsPath = 'd:\\TaekniEx\\SaaS\\src\\data\\bncc_skills.json';
const compPath = 'd:\\TaekniEx\\SaaS\\src\\data\\bncc_computacao_extracted.json';

if (!fs.existsSync(skillsPath)) {
  console.error('BNCC standard skills file not found!');
  process.exit(1);
}

if (!fs.existsSync(compPath)) {
  console.error('Extracted Computacao skills file not found!');
  process.exit(1);
}

const standardSkills = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));
const compSkills = JSON.parse(fs.readFileSync(compPath, 'utf-8'));

console.log('Original standard skills count:', standardSkills.length);
console.log('Extracted Computacao skills count:', compSkills.length);

// Let's perform high-quality cleaning of Computacao skills to remove trailing topics or subheadings
const cleanedCompSkills = compSkills.map(skill => {
  let desc = skill.description.trim();
  
  // List of subheadings/topics that get appended at the end of descriptions
  const trailingTopics = [
    'Conceituação de Algoritmos',
    'Codificação da informação',
    'Segurança e responsabilidade no uso de tecnologia computacional',
    'Algoritmos com repetições simples',
    'Hardware e software',
    'Uso de artefatos computacionais',
    'Instrução de máquina',
    'Algoritmos e lógica',
    'Pensamento Computacional',
    'Mundo Digital',
    'Cultura Digital',
    'Letramento digital',
    'Cidadania digital',
    'Representação de dados',
    'Redes de computadores',
    'Resolução de problemas',
    'Abstração',
    'Decomposição',
    'Reconhecimento de padrões',
    'Algoritmos',
    'Programação',
    'Segurança da informação',
    'Privacidade',
    'Uso responsável',
    'Interação humano-computador',
    'Sistemas computacionais',
    'Redes e comunicação',
    'Tecnologias emergentes',
    'Impactos da tecnologia',
    'Tratamento de dados',
    'Comunicação e redes',
    'Criação de artefatos digitais',
    'Linguagens de programação'
  ];
  
  // Clean each of these trailing topics if they appear at the end of the description
  for (const topic of trailingTopics) {
    const topicPattern = new RegExp(`[.\\s\\–\\—\\-]*${topic}[.\\s]*$`, 'i');
    if (topicPattern.test(desc)) {
      desc = desc.replace(topicPattern, '').trim();
    }
    
    // Also catch cases where they are separated by a space or period in the middle/end
    const index = desc.toLowerCase().lastIndexOf(topic.toLowerCase());
    if (index !== -1 && index > desc.length - topic.length - 10) {
      desc = desc.substring(0, index).trim();
    }
  }
  
  // Ensure description ends with a single period
  desc = desc.replace(/[:\-–—.\s]+$/, '');
  desc = desc + '.';
  
  return {
    code: skill.code,
    description: desc,
    subject: skill.subject,
    grade: skill.grade,
    axis: skill.axis || 'Pensamento Computacional'
  };
});

// Avoid duplicate codes just in case
const mergedSkills = [...standardSkills];
cleanedCompSkills.forEach(comp => {
  if (!mergedSkills.some(s => s.code === comp.code)) {
    mergedSkills.push(comp);
  }
});

console.log('Final merged skills count:', mergedSkills.length);

fs.writeFileSync(skillsPath, JSON.stringify(mergedSkills, null, 2), 'utf-8');
console.log('Successfully merged and saved to src/data/bncc_skills.json');
