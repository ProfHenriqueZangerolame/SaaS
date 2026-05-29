import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
  console.error('ERRO: GEMINI_API_KEY não está configurada no .env!');
  process.exit(1);
}

try {
  console.log('Consultando os modelos disponíveis com a sua Chave API...');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  
  if (!response.ok) {
    const errText = await response.text();
    console.error('Falha ao listar modelos:', errText);
    process.exit(1);
  }

  const data = await response.json();
  console.log('\n=============================================');
  console.log('✨ MODELOS DISPONÍVEIS NA SUA CONTA:');
  console.log('=============================================');
  data.models.forEach(model => {
    if (model.supportedGenerationMethods.includes('generateContent')) {
      console.log(`- Nome: ${model.name}`);
    }
  });
  console.log('=============================================\n');
} catch (error) {
  console.error('Erro de conexão:', error);
}
