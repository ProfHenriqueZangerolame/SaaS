import { useState } from 'react';
import BNCC_SUGGESTIONS from '../../data/bncc_skills.json';
import { useGemini } from '../../hooks/useGemini';

const formatDateToBR = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const GeneratorTab = ({
  setUnidadeEnsino,
  setNomeProfessor,
  setTurma,
  setDateStart,
  setDateEnd,
  unidadeEnsino,
  nomeProfessor,
  turma,
  dateStart,
  dateEnd,
  generatedPlan,
  setGeneratedPlan,
  savedPlans,
  setSavedPlans,
  _errorMsg,
  setErrorMsg,
  _envWarning,
  setEnvWarning,
}) => {
  const [subject, setSubject] = useState('Português');
  const [grade, setGrade] = useState('1º Ano');
  const [trimester, setTrimester] = useState('2º Trimestre');
  const [resource, setResource] = useState('analog');
  const [needsAdaptation, setNeedsAdaptation] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('AUTO_DETECT');
  const [customTopic, setCustomTopic] = useState('');
  const [skillCodesInput, setSkillCodesInput] = useState('');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [canvasView, setCanvasView] = useState('professor');
  const [generatedActivity, setGeneratedActivity] = useState(null);
  const [showAccessibilityDicas, setShowAccessibilityDicas] = useState(true);
  const [showGabarito, setShowGabarito] = useState(false);
  const [borderTheme, setBorderTheme] = useState('classic');

  const { generatePlan, generateActivity, loading, loadingActivity } = useGemini();

  const filteredSkills = BNCC_SUGGESTIONS.filter(
    (skill) => skill.subject === subject && skill.grade === grade
  );

  const loadingSteps = [
    "🤖 Conectando ao cérebro do EduPlan SaaS...",
    "📚 Analisando a Base Nacional Comum Curricular (BNCC)...",
    "🧠 Pensando em estratégias lúdicas para a sala de aula...",
    "✍️ Escrevendo o desenvolvimento metodológico passo a passo...",
    "🧩 Criando adaptações para Educação Especial e TDAH...",
    "✨ Finalizando o documento oficial..."
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGeneratedPlan(null);
    setGeneratedActivity(null);
    setErrorMsg('');
    setEnvWarning(false);
    setLoadingStepIndex(0);

    const stepInterval = setInterval(() => {
      setLoadingStepIndex(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 2000);

    let finalSkillCode = 'AUTO_DETECT';
    let finalSkillDesc = 'A IA buscará a habilidade mais adequada na BNCC computacional para o tema solicitado.';

    if (selectedSkill !== 'AUTO_DETECT' && selectedSkill !== 'CUSTOM_TOPIC') {
      finalSkillCode = selectedSkill;
      const found = BNCC_SUGGESTIONS.find(s => s.code === selectedSkill);
      if (found) finalSkillDesc = found.description;
    }

    if (selectedSkill === 'CUSTOM_TOPIC') {
      finalSkillCode = 'AUTO_DETECT';
      finalSkillDesc = `O professor deseja uma aula lúdica sobre: "${customTopic}". Por favor, escolha a melhor habilidade computacional relacionada a este tema.`;
    }

    const finalPeriodo = `${formatDateToBR(dateStart)} até ${formatDateToBR(dateEnd)}`;

    if (skillCodesInput.trim() !== '') {
      const extraCodes = skillCodesInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      if (extraCodes.length > 0) {
        if (finalSkillCode === 'AUTO_DETECT') {
          finalSkillCode = extraCodes.join(', ');
        } else {
          finalSkillCode = `${finalSkillCode}, ${extraCodes.join(', ')}`;
        }
        const extraDescs = extraCodes.map(code => {
          const found = BNCC_SUGGESTIONS.find(s => s.code === code);
          return found ? `[${code}] ${found.description}` : `[${code}] Habilidade complementar integrada`;
        }).join('; ');
        finalSkillDesc = `${finalSkillDesc} | Habilidades Extras Integradas: ${extraDescs}`;
      }
    }

    const payload = {
      subject,
      grade,
      trimester,
      skillCode: finalSkillCode,
      skillDesc: finalSkillDesc,
      resourceType: resource,
      needsAdaptation,
      skillSelectionMode: selectedSkill === 'AUTO_DETECT' ? 'ai_search' : 'list',
      unidadeEnsino,
      nomeProfessor,
      turma,
      dataPeriodo: finalPeriodo
    };

    const planJson = await generatePlan(payload);

    clearInterval(stepInterval);

    if (planJson) {
      setGeneratedPlan({
        title: planJson.title,
        subject,
        grade,
        trimester,
        skillCode: planJson.skillCode || (finalSkillCode === 'AUTO_DETECT' ? 'Personalizado' : finalSkillCode),
        skillDesc: planJson.skillDesc || finalSkillDesc,
        resourceType: resource,
        unidadeEnsino,
        nomeProfessor,
        turma,
        dataPeriodo: finalPeriodo,
        objetoConhecimento: planJson.objetoConhecimento,
        desenvolvimentoMetodologico: planJson.desenvolvimentoMetodologico,
        avaliacao: planJson.avaliacao,
        materialAdaptado: planJson.materialAdaptado,
        observacoes: planJson.observacoes
      });
    }
  };

  const handleGenerateActivity = async () => {
    if (!generatedPlan) return;

    const payload = {
      subject: generatedPlan.subject,
      grade: generatedPlan.grade,
      skillCode: generatedPlan.skillCode,
      skillDesc: generatedPlan.skillDesc,
      title: generatedPlan.title,
      objetoConhecimento: generatedPlan.objetoConhecimento,
      desenvolvimentoMetodologico: generatedPlan.desenvolvimentoMetodologico
    };

    const activityJson = await generateActivity(payload);
    if (activityJson) {
      setGeneratedActivity(activityJson);
    }
  };

  const exportToWord = () => {
    if (!generatedPlan) return;

    let elementId = canvasView === 'professor' ? 'professor-canvas-content' : 'aluno-canvas-content';
    const element = document.getElementById(elementId);
    if (!element) return;

    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;

    const noPrintElements = tempDiv.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Plano de Aula EduPlan</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #333333; }
          h2 { color: #2563eb; font-size: 16pt; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
          h3 { color: #1e40af; font-size: 14pt; margin-top: 20px; }
          h4 { color: #3b82f6; font-size: 12pt; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; }
          p { margin-bottom: 10px; line-height: 1.5; }
          ul, ol { margin-top: 0; margin-bottom: 15px; padding-left: 20px; }
          li { margin-bottom: 5px; }
          .special-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; margin-top: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        ${tempDiv.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = canvasView === 'professor' ? `Plano_BNCC_${generatedPlan.subject}_${generatedPlan.grade.replace(' ', '')}.doc` : `Atividade_${generatedPlan.subject}_${generatedPlan.grade.replace(' ', '')}.doc`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const savePlanToDatabase = () => {
    if (!generatedPlan) return;

    const isAlreadySaved = savedPlans.some(p => p.title === generatedPlan.title && p.skillCode === generatedPlan.skillCode);

    if (isAlreadySaved) {
      alert('Este plano já está salvo na sua biblioteca!');
      return;
    }

    setSavedPlans([...savedPlans, generatedPlan]);
    alert('🏆 Plano salvo com sucesso no banco de dados do EduPlan!');
  };

  return (
    <>
    <div>
      {!loading && !generatedPlan && (
        <form onSubmit={handleGenerate} className="form-card">

          {/* Seção 1: Dados do Cabeçalho Escolar Oficial */}
          <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
            🏫 Dados da Ficha de Registro Escolar (Semanal / Quinzenal)
          </h3>

          <div className="form-grid" style={{ marginBottom: '40px' }}>

            {/* Unidade de Ensino */}
            <div className="form-group">
              <label>🏢 Unidade de Ensino</label>
              <input
                type="text"
                value={unidadeEnsino}
                onChange={(e) => setUnidadeEnsino(e.target.value)}
                required
              />
            </div>

            {/* Nome do Professor */}
            <div className="form-group">
              <label>👤 Nome do Professor</label>
              <input
                type="text"
                value={nomeProfessor}
                onChange={(e) => setNomeProfessor(e.target.value)}
                required
              />
            </div>

            {/* Turma / Turno */}
            <div className="form-group">
              <label>👥 Turma / Turmas / Turno</label>
              <input
                type="text"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                placeholder="Ex: 1º Ano A - Matutino"
                required
              />
            </div>

            {/* Intervalo de Datas Semanal / Quinzenal */}
            <div className="form-group">
              <label>📅 Período de Aula (Início e Fim)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
                <span style={{ fontWeight: 'bold' }}>a</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
            </div>

          </div>

          {/* Seção 2: Filtros Pedagógicos da BNCC */}
          <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
            🎯 Configurações Pedagógicas e Habilidades (452 Extraídas)
          </h3>

          <div className="form-grid">

            {/* Disciplina */}
            <div className="form-group">
              <label>📚 Componente Curricular</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="Português">Português</option>
                <option value="Matemática">Matemática</option>
                <option value="Ciências">Ciências</option>
                <option value="Geografia">Geografia</option>
                <option value="História">História</option>
              </select>
            </div>

            {/* Série/Ano */}
            <div className="form-group">
              <label>🧒 Série / Ano</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="1º Ano">1º Ano (E.F. I)</option>
                <option value="2º Ano">2º Ano (E.F. I)</option>
                <option value="3º Ano">3º Ano (E.F. I)</option>
                <option value="4º Ano">4º Ano (E.F. I)</option>
                <option value="5º Ano">5º Ano (E.F. I)</option>
              </select>
            </div>

            {/* Trimestre */}
            <div className="form-group">
              <label>📅 Trimestre</label>
              <select value={trimester} onChange={(e) => setTrimester(e.target.value)}>
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
              </select>
            </div>

            {/* Habilidade da BNCC */}
            <div className="form-group form-group-full">
              <label>🎯 Habilidade da BNCC ou Tema da Aula</label>
              <select
                value={selectedSkill}
                onChange={(e) => {
                  setSelectedSkill(e.target.value);
                  if (e.target.value !== 'AUTO_DETECT' && e.target.value !== 'CUSTOM') {
                    setCustomTopic('');
                  }
                }}
                style={{ width: '100%' }}
              >
                <option value="AUTO_DETECT">🔍 Procurar automaticamente (Busca Inteligente por IA) — Recomendado</option>
                {filteredSkills.map((sk) => (
                  <option key={sk.code} value={sk.code}>
                    [{sk.code}] {sk.description.substring(0, 75)}...
                  </option>
                ))}
                {filteredSkills.length === 0 && (
                  <option value="">Nenhuma habilidade cadastrada para este filtro</option>
                )}
                <option value="CUSTOM">✍️ Definir tema customizado ou habilidade própria</option>
              </select>
            </div>

            {/* MODO BUSCA INTELIGENTE: Professor digita o que quer */}
            {selectedSkill === 'AUTO_DETECT' && (
              <div className="form-group form-group-full fade-in" style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px dashed var(--primary)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '8px'
              }}>
                <label style={{ color: 'var(--primary)', fontWeight: '700' }}>
                  ✍️ Descreva o Tema ou Objetivo da Aula (A IA buscará a habilidade BNCC ideal!)
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
                  Não se preocupe com códigos! Descreva o que deseja ensinar em suas palavras (ex: <em>"Quero ensinar os alunos a contarem de 1 a 10 usando tampinhas de refrigerante"</em>) e o robô pedagógico irá mapear a habilidade ideal e estruturar todo o plano de aula automaticamente.
                </p>
                <textarea
                  rows="3"
                  placeholder="Ex: Quero ensinar como as plantas respiram e a importância da fotossíntese..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '100px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    padding: '12px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            {/* MODO CUSTOMIZADO: Habilidade própria */}
            {selectedSkill === 'CUSTOM' && (
              <div className="form-group form-group-full fade-in" style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px dashed #10b981',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '8px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ color: '#10b981', fontWeight: '700' }}>🔗 Código da Habilidade (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: EF01LP01"
                      value={skillCodesInput}
                      onChange={(e) => setSkillCodesInput(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#10b981', fontWeight: '700' }}>✍️ Tema Específico</label>
                    <input
                      type="text"
                      placeholder="Ex: Frações na prática"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      required
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HABILIDADE DA LISTA SELECIONADA: Opção de Habilidade Adicional */}
            {selectedSkill !== 'AUTO_DETECT' && selectedSkill !== 'CUSTOM' && selectedSkill !== '' && (
              <div className="form-group form-group-full fade-in" style={{
                background: 'rgba(245, 158, 11, 0.03)',
                border: '1px dashed var(--border-color)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '8px'
              }}>
                <label style={{ fontSize: '13px' }}>🔗 Habilidade(s) Adicional(is) Integrada(s) (Opcional, separe por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: EF01LP02, EF01LP05"
                  value={skillCodesInput}
                  onChange={(e) => setSkillCodesInput(e.target.value)}
                  style={{ marginTop: '6px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Recursos Disponíveis */}
            <div className="form-group form-group-full">
              <label>🛠️ Recursos da Sala</label>
              <div className="resource-selector">
                <div
                  className={`resource-btn ${resource === 'analog' ? 'active' : ''}`}
                  onClick={() => setResource('analog')}
                >
                  <span className="resource-emoji">📓</span>
                  <span>Apenas Caderno / Lápis</span>
                </div>
                <div
                  className={`resource-btn ${resource === 'projector' ? 'active' : ''}`}
                  onClick={() => setResource('projector')}
                >
                  <span className="resource-emoji">📺</span>
                  <span>Projetor / Smart TV</span>
                </div>
                <div
                  className={`resource-btn ${resource === 'computer' ? 'active' : ''}`}
                  onClick={() => setResource('computer')}
                >
                  <span className="resource-emoji">💻</span>
                  <span>Computadores / Tablets</span>
                </div>
              </div>
            </div>

          </div>

          {/* Switch Necessidade de Material Adaptado */}
          <div className="switch-container">
            <div className="switch-label">
              <span className="switch-title">♿ Necessita de Material Adaptado / Inclusão?</span>
              <span className="switch-desc">Preenche a coluna especial com adaptações curriculares (Leis 881/2010 e 11.076/2019). Se desmarcado, a coluna ficará em branco.</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={needsAdaptation}
                onChange={(e) => setNeedsAdaptation(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Botão de Geração */}
          <button type="submit" className="btn-primary">
            <span>Gerar Registro de Plano de Aula Oficial ✨</span>
          </button>
        </form>
      )}

      {/* PEDAGOGICAL LOADER COM MICRO-ANIMAÇÕES */}
      {loading && (
        <div className="form-card loader-container">
          <div className="spinner"></div>
          <h3 className="text-gradient" style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' }}>
            A Inteligência Pedagógica está criando sua aula...
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Isso pode levar alguns segundos. Estamos estruturando como um docente experiente com 40 anos de carreira!
          </p>
          <div className="loader-steps">
            {loadingSteps.map((step, idx) => {
              let className = 'loader-step';
              if (idx === loadingStepIndex) className += ' active';
              else if (idx < loadingStepIndex) className += ' completed';
              return (
                <div key={idx} className={className}>
                  <div className="step-dot"></div>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CANVAS DO PLANO GERADO (MODELO DE FICHA HORIZONTAL OFICIAL) */}
      {generatedPlan && (
        <div style={{ marginTop: '32px' }}>

          {/* Botões Superiores de Ação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }} className="no-print">
            <button className="btn-secondary" onClick={() => setGeneratedPlan(null)}>
              <span>⬅️ Configurar Outro Plano</span>
            </button>

            {/* Seletor de Tipo de Visualização do Canvas */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              gap: '4px'
            }}>
              <button
                type="button"
                className={`btn-canvas-tab ${canvasView === 'professor' ? 'active' : ''}`}
                style={{
                  border: 'none',
                  background: canvasView === 'professor' ? 'var(--primary)' : 'transparent',
                  color: canvasView === 'professor' ? 'white' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setCanvasView('professor')}
              >
                <span>📋 Registro do Professor</span>
              </button>
              <button
                type="button"
                className={`btn-canvas-tab ${canvasView === 'aluno' ? 'active' : ''}`}
                style={{
                  border: 'none',
                  background: canvasView === 'aluno' ? 'var(--primary)' : 'transparent',
                  color: canvasView === 'aluno' ? 'white' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setCanvasView('aluno')}
              >
                <span>✏️ Atividades para Alunos</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => window.print()}>
                <span>🖨️ Imprimir {canvasView === 'professor' ? 'Plano' : 'Atividades'}</span>
              </button>
              <button className="btn-secondary" onClick={exportToWord}>
                <span>📝 Baixar no Word (.doc)</span>
              </button>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={savePlanToDatabase}>
                <span>💾 Salvar Registro</span>
              </button>
            </div>
          </div>

          {/* 1. VISUALIZAÇÃO DO PROFESSOR (FICHA MATRICIAL HORIZONTAL) */}
          {canvasView === 'professor' && (
            <article id="professor-canvas-content" className="plan-canvas" style={{ padding: '30px', backgroundColor: '#fff', color: '#000', border: '2px solid #000' }}>

              {/* Cabeçalho da Ficha de Registro */}
              <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000' }}>
                  Registro de Plano de Aula do Professor do Ensino Fundamental I e II
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  <div style={{ padding: '4px 0' }}>
                    <strong>Unidade de Ensino:</strong> {generatedPlan.unidadeEnsino}
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <strong>Turma/Turmas/Turno:</strong> {generatedPlan.turma}
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <strong>Nome do Professor:</strong> {generatedPlan.nomeProfessor}
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <strong>Trimestre:</strong> {generatedPlan.trimester}
                  </div>
                  <div style={{ padding: '4px 0', gridColumn: 'span 2' }}>
                    <strong>Data/Período:</strong> {generatedPlan.dataPeriodo}
                  </div>
                </div>
              </div>

              {/* Tabela de Grade Matricial Horizontal */}
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '2px solid #000',
                  fontSize: '12px',
                  color: '#000',
                  lineHeight: '145%',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#bfdbfe', borderBottom: '2px solid #000' }}>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '12%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Disciplina / Componente Curricular
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '15%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Objeto(s) de Conhecimento
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '15%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Habilidades/ Descritores
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '25%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Desenvolvimento Metodológico
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '13%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Avaliação
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '15%', fontWeight: '800', textTransform: 'uppercase', fontSize: '11px' }}>
                        Material adaptado para estudantes do Público da Educação Especial (Lei nº 881/2010 - Municipal) e para estudantes com TDAH (Lei nº 11.076/2019 - Estadual)
                      </th>
                      <th style={{ padding: '12px', border: '1px solid #000', width: '10%', fontWeight: '800', textTransform: 'uppercase' }}>
                        Observações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ verticalAlign: 'top' }}>
                      {/* Disciplina */}
                      <td style={{ padding: '12px', border: '1px solid #000', fontWeight: 'bold' }}>
                        {generatedPlan.subject} <br />
                        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 'normal' }}>({generatedPlan.grade})</span>
                      </td>

                      {/* Objeto de Conhecimento */}
                      <td style={{ padding: '12px', border: '1px solid #000' }}>
                        {generatedPlan.objetoConhecimento}
                      </td>

                      {/* Habilidade */}
                      <td style={{ padding: '12px', border: '1px solid #000' }}>
                        <strong>{generatedPlan.skillCode}</strong> <br />
                        <span style={{ fontSize: '11px' }}>{generatedPlan.skillDesc}</span>
                      </td>

                      {/* Desenvolvimento Metodológico */}
                      <td style={{ padding: '12px', border: '1px solid #000', whiteSpace: 'pre-line' }}>
                        {generatedPlan.desenvolvimentoMetodologico}
                      </td>

                      {/* Avaliação */}
                      <td style={{ padding: '12px', border: '1px solid #000', whiteSpace: 'pre-line' }}>
                        {generatedPlan.avaliacao}
                      </td>

                      {/* Material Adaptado */}
                      <td style={{ padding: '12px', border: '1px solid #000', whiteSpace: 'pre-line' }}>
                        {generatedPlan.materialAdaptado}
                      </td>

                      {/* Observações */}
                      <td style={{ padding: '12px', border: '1px solid #000', fontStyle: 'italic' }}>
                        {generatedPlan.observacoes}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {/* 2. VISUALIZAÇÃO DO ALUNO (FOLHA DE ATIVIDADES PRÁTICAS) */}
          {canvasView === 'aluno' && (
            <div>
              {/* Caso 1: Ainda não gerou as atividades */}
              {!generatedActivity && !loadingActivity && (
                <div className="form-card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-premium)'
                }}>
                  <span style={{ fontSize: '64px', marginBottom: '24px', display: 'block' }}>✏️</span>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 12px 0' }}>Folha de Atividades para Alunos</h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: '160%' }}>
                    Gere instantaneamente uma folha de exercícios prática e lúdica customizada com base nos dados do plano de aula gerado, pronta para imprimir e distribuir aos estudantes.
                  </p>
                  <button type="button" className="btn-primary" style={{ width: 'auto' }} onClick={handleGenerateActivity}>
                    <span>✨ Gerar Folha de Exercícios Dinâmica</span>
                  </button>
                </div>
              )}

              {/* Caso 2: Carregando geração das atividades */}
              {loadingActivity && (
                <div className="form-card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)'
                }}>
                  <div className="spinner"></div>
                  <h3 className="text-gradient" style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' }}>
                    A Inteligência Pedagógica está desenhando os exercícios...
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Criando comandos lúdicos, espaços pontilhados para respostas e orientações adaptadas para alunos especiais.
                  </p>
                </div>
              )}

              {/* Caso 3: Atividade Gerada de Sucesso */}
              {generatedActivity && (
                <div>
                  {/* Caixa no-print de Controle de Visualização Inclusiva, Gabarito e Temas Decorativos */}
                  <div className="switch-container no-print" style={{
                    marginBottom: '20px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>

                      {/* Controle de Dicas Inclusivas */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className="toggle-switch" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={showAccessibilityDicas}
                            onChange={(e) => setShowAccessibilityDicas(e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>🛡️ Dicas Inclusivas (Público Alvo)</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Foca na adaptação simplificada no topo da folha.</span>
                        </div>
                      </div>

                      {/* Controle de Gabarito do Professor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className="toggle-switch" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={showGabarito}
                            onChange={(e) => setShowGabarito(e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>🔍 Exibir Gabarito do Professor</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Respostas sugeridas destacadas na cor amarela.</span>
                        </div>
                      </div>

                      {/* Seletor de Tema Decorativo da Borda */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>🎨 Tema da Borda:</span>
                        <select
                          value={borderTheme}
                          onChange={(e) => setBorderTheme(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-primary)',
                            fontWeight: '600'
                          }}
                        >
                          <option value="classic">📋 Clássica (Borda Dupla)</option>
                          <option value="space">🚀 Espacial (Estrelas & Foguetes)</option>
                          <option value="nature">🌿 Natureza (Folhas & Animais)</option>
                          <option value="school">✏️ Escolar (Lápis & Livros)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Configurações Estéticas para as Bordas Temáticas */}
                  {(() => {
                    const borderColors = {
                      classic: '#000000',
                      space: '#4f46e5',
                      nature: '#10b981',
                      school: '#f59e0b'
                    };

                    const borderStyles = {
                      classic: '3px double #000000',
                      space: `8px solid ${borderColors.space}`,
                      nature: `8px solid ${borderColors.nature}`,
                      school: `8px solid ${borderColors.school}`
                    };

                    const headerBanners = {
                      classic: {
                        background: 'transparent',
                        color: '#000000',
                        borderBottom: '2px solid #000000',
                        padding: '10px'
                      },
                      space: {
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
                        color: '#ffffff',
                        padding: '16px',
                        borderRadius: '8px',
                        borderBottom: 'none'
                      },
                      nature: {
                        background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                        color: '#ffffff',
                        padding: '16px',
                        borderRadius: '8px',
                        borderBottom: 'none'
                      },
                      school: {
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        color: '#78350f',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '2px dashed #d97706',
                        borderBottom: '2px dashed #d97706'
                      }
                    };

                    const cornerDecorations = {
                      classic: null,
                      space: {
                        tl: '🛸', tr: '🪐', bl: '🚀', br: '⭐'
                      },
                      nature: {
                        tl: '🍃', tr: '🦊', bl: '🦉', br: '🌻'
                      },
                      school: {
                        tl: '🍎', tr: '📐', bl: '✏️', br: '🏫'
                      }
                    };

                    const borderIconHeaders = {
                      classic: '',
                      space: '🚀 🌠 EXPLORADORES DO ESPAÇO 🌠 🚀',
                      nature: '🌿 🦊 AMIGOS DA NATUREZA 🌿 🦊',
                      school: '✏️ 📚 ESTAÇÃO DE APRENDIZAGEM ✏️ 📚'
                    };

                    return (
                      /* 📄 FOLHA DE ATIVIDADES A4 EM FORMATO RETRATO */
                      <article
                        id="aluno-canvas-content"
                        className="plan-canvas"
                        style={{
                          padding: '50px 40px',
                          backgroundColor: '#fff',
                          color: '#000',
                          border: borderStyles[borderTheme],
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          position: 'relative',
                          boxSizing: 'border-box'
                        }}
                      >

                        {/* Emojis Decorativos dos Cantos (Para dar impacto visual real) */}
                        {cornerDecorations[borderTheme] && (
                          <>
                            <div className="no-print" style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '24px', userSelect: 'none' }}>
                              {cornerDecorations[borderTheme].tl}
                            </div>
                            <div className="no-print" style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '24px', userSelect: 'none' }}>
                              {cornerDecorations[borderTheme].tr}
                            </div>
                            <div className="no-print" style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '24px', userSelect: 'none' }}>
                              {cornerDecorations[borderTheme].bl}
                            </div>
                            <div className="no-print" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '24px', userSelect: 'none' }}>
                              {cornerDecorations[borderTheme].br}
                            </div>
                          </>
                        )}

                        {/* Faixa do Ícone Decorativo de Cima (se não for clássico) */}
                        {borderTheme !== 'classic' && (
                          <div style={{
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: '800',
                            color: borderColors[borderTheme],
                            marginBottom: '15px',
                            letterSpacing: '1px',
                            textTransform: 'uppercase'
                          }}>
                            {borderIconHeaders[borderTheme]}
                          </div>
                        )}

                        {/* Cabeçalho da Escola para Alunos com visual temático */}
                        <div style={{
                          padding: headerBanners[borderTheme].padding,
                          background: headerBanners[borderTheme].background,
                          borderRadius: headerBanners[borderTheme].borderRadius,
                          border: headerBanners[borderTheme].border,
                          borderBottom: headerBanners[borderTheme].borderBottom || `3px double ${borderColors[borderTheme]}`,
                          marginBottom: '24px',
                          color: borderTheme === 'school' ? '#78350f' : borderTheme !== 'classic' ? '#ffffff' : '#000000'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', textTransform: 'uppercase' }}>
                              {generatedPlan.unidadeEnsino}
                            </h3>
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>COMP. CURRICULAR: {generatedPlan.subject.toUpperCase()}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span>NOME DO ESTUDANTE:</span>
                              <span style={{ flexGrow: 1, borderBottom: borderTheme !== 'classic' && borderTheme !== 'school' ? '1px solid #ffffff' : '1px solid #000000', marginTop: '10px' }}></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', gap: '10px', width: '45%', alignItems: 'center' }}>
                                <span>TURMA / TURNO:</span>
                                <span style={{ flexGrow: 1, borderBottom: borderTheme !== 'classic' && borderTheme !== 'school' ? '1px solid #ffffff' : '1px solid #000000', marginTop: '10px' }}>{generatedPlan.turma}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', width: '45%', alignItems: 'center' }}>
                                <span>DATA:</span>
                                <span style={{ flexGrow: 1, borderBottom: borderTheme !== 'classic' && borderTheme !== 'school' ? '1px solid #ffffff' : '1px solid #000000', marginTop: '10px' }}></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Título e Introdução Lúdica */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 10px 0', color: borderColors[borderTheme], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ✨ {generatedActivity.title} ✨
                          </h2>
                          <p style={{ fontSize: '13px', lineHeight: '150%', fontStyle: 'italic', margin: 0, padding: '10px 20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            "{generatedActivity.introduction}"
                          </p>
                        </div>

                        {/* Dicas de Acessibilidade Adaptadas */}
                        {showAccessibilityDicas && generatedActivity.adaptedInstructions && (
                          <div style={{
                            backgroundColor: '#eff6ff',
                            border: '1.5px solid #3b82f6',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            fontSize: '12px',
                            lineHeight: '145%'
                          }}>
                            <span style={{ fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              💡 ORIENTAÇÕES E DICAS DE SUPORTE:
                            </span>
                            <span style={{ fontStyle: 'italic', color: '#1e3a8a' }}>{generatedActivity.adaptedInstructions}</span>
                          </div>
                        )}

                        {/* Lista de Exercícios / Questões Dinâmicas */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '35px',
                          background: borderTheme === 'school' ? 'linear-gradient(#bfdbfe 1px, transparent 1px)' : 'none',
                          backgroundSize: borderTheme === 'school' ? '100% 24px' : 'none',
                          padding: borderTheme === 'school' ? '12px 0' : '0'
                        }}>
                          {generatedActivity.tasks && generatedActivity.tasks.map((task, idx) => (
                            <div key={idx} style={{ pageBreakInside: 'avoid' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', lineHeight: '140%', color: borderTheme === 'classic' ? '#000000' : borderColors[borderTheme] }}>
                                Questão {idx + 1}: {task.question}
                              </h4>

                              {/* Renderização com base no tipo da questão */}
                              {task.type === 'text' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                                  {Array.from({ length: task.spacing === 'small' ? 2 : task.spacing === 'medium' ? 4 : 6 }).map((_, lineIdx) => (
                                    <div key={lineIdx} style={{
                                      borderBottom: '1px dotted #000',
                                      height: '24px',
                                      width: '100%'
                                    }}></div>
                                  ))}
                                </div>
                              )}

                              {task.type === 'drawing' && (
                                <div style={{
                                  border: '2px dashed #94a3b8',
                                  borderRadius: '8px',
                                  height: '220px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: '#f8fafc',
                                  marginTop: '8px',
                                  color: '#64748b'
                                }}>
                                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</span>
                                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Faça o seu desenho ou esquema bem caprichado neste quadro!</span>
                                </div>
                              )}

                              {task.type === 'multiple-choice' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingLeft: '12px' }}>
                                  {task.options && task.options.map((option, optIdx) => (
                                    <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                                      <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '1.5px solid #000',
                                        borderRadius: '4px',
                                        flexShrink: 0
                                      }}></div>
                                      <span>{option}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* RENDERIZAÇÃO DO GABARITO DO PROFESSOR (SE ATIVO) */}
                              {showGabarito && task.teacherAnswer && (
                                <div className="no-print" style={{
                                  backgroundColor: '#fef3c7',
                                  borderLeft: '4px solid #f59e0b',
                                  padding: '10px 14px',
                                  marginTop: '12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  lineHeight: '145%',
                                  color: '#78350f',
                                  fontStyle: 'italic'
                                }}>
                                  <strong>🔑 Resposta Esperada (Gabarito):</strong> {task.teacherAnswer}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Rodapé da Folha */}
                        <div style={{
                          marginTop: '48px',
                          borderTop: `1px solid ${borderColors[borderTheme]}`,
                          paddingTop: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          <span>EduPlan SaaS - Atividade Concluída! 🏆</span>
                          <div style={{ display: 'flex', gap: '10px', width: '50%' }}>
                            <span>VISTO DO PROFESSOR:</span>
                            <span style={{ flexGrow: 1, borderBottom: '1px solid #000' }}></span>
                          </div>
                        </div>

                      </article>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    </>
  );
};
