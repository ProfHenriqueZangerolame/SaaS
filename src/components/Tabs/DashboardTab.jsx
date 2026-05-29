import { useState } from 'react';

export const DashboardTab = ({ savedPlans = [] }) => {
  const [censusAnswers, setCensusAnswers] = useState({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 });
  const [censusSubmitted, setCensusSubmitted] = useState(false);
  const [censusProfile, setCensusProfile] = useState('');

  const [schools, setSchools] = useState([
    { id: 1, name: 'EMEBTI "JULIETA DEPS TALLON"', adoption: 85, teachers: 14, trained: 12, connected: true },
    { id: 2, name: 'EMEB "CASTRO ALVES"', adoption: 65, teachers: 18, trained: 11, connected: true },
    { id: 3, name: 'EMEB "FLORISBELA CORRÊA LIMA"', adoption: 42, teachers: 10, trained: 4, connected: false },
    { id: 4, name: 'EMEB "PROF. ALBERTO SARTÓRIO"', adoption: 20, teachers: 12, trained: 2, connected: false }
  ]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolTeachers, setNewSchoolTeachers] = useState(10);

  const handleAddSchool = (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    const newSchool = {
      id: Date.now(),
      name: newSchoolName.toUpperCase(),
      teachers: parseInt(newSchoolTeachers) || 8,
      trained: 0,
      adoption: 0,
      connected: false
    };
    setSchools([...schools, newSchool]);
    setNewSchoolName('');
    setNewSchoolTeachers(10);
    alert('🏢 Escola cadastrada com sucesso na rede municipal!');
  };

  const handleRemoveSchool = (id) => {
    if (confirm('Tem certeza que deseja remover esta escola da rede municipal?')) {
      setSchools(schools.filter(school => school.id !== id));
    }
  };

  const submitCensus = (e) => {
    e.preventDefault();
    const totalScore = censusAnswers.q1 + censusAnswers.q2 + censusAnswers.q3 + censusAnswers.q4 + censusAnswers.q5;
    let profileStr;
    let connectedStatus = false;
    let adoptionBonus = 0;

    if (totalScore <= 8) {
      profileStr = 'Tradicional (Baixa Adoção)';
      adoptionBonus = 10;
    } else if (totalScore <= 12) {
      profileStr = 'Em Transição (Adoção Moderada)';
      connectedStatus = true;
      adoptionBonus = 40;
    } else {
      profileStr = 'Inovadora (Alta Adoção Computacional)';
      connectedStatus = true;
      adoptionBonus = 75;
    }

    setCensusProfile(profileStr);
    setCensusSubmitted(true);

    const updatedSchools = schools.map(school => {
      if (school.name.includes('JULIETA DEPS TALLON')) {
        return {
          ...school,
          adoption: Math.min(100, school.adoption + adoptionBonus),
          connected: connectedStatus
        };
      }
      return school;
    });
    setSchools(updatedSchools);
    alert(`📊 Diagnóstico concluído! Perfil Pedagógico Calculado: ${profileStr}`);
  };

  const handleCensusSelect = (questionKey, value) => {
    setCensusAnswers({ ...censusAnswers, [questionKey]: parseInt(value) });
  };

  return (
    <>
      <div className="prefeitura-dashboard">
        <div className="metrics-row">
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Adoção da BNCC</span>
              <span className="kpi-icon">📈</span>
            </div>
            <div className="kpi-value">
              {Math.round(schools.reduce((acc, curr) => acc + curr.adoption, 0) / schools.length)}%
            </div>
            <div className="kpi-change">▲ +12% este mês</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Professores Capacitados</span>
              <span className="kpi-icon">🎓</span>
            </div>
            <div className="kpi-value">
              {schools.reduce((acc, curr) => acc + curr.trained, 0)} / {schools.reduce((acc, curr) => acc + curr.teachers, 0)}
            </div>
            <div className="kpi-change">Em formação continuada</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Escolas na Rede</span>
              <span className="kpi-icon">🏢</span>
            </div>
            <div className="kpi-value">{schools.length}</div>
            <div className="kpi-change" style={{ color: 'var(--text-muted)' }}>100% mapeadas</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Planos de Aula BNCC</span>
              <span className="kpi-icon">⚡</span>
            </div>
            <div className="kpi-value">{142 + savedPlans.length}</div>
            <div className="kpi-change">▲ +18 esta semana</div>
          </div>
        </div>

        <div className="schools-container">
          <div className="schools-list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Monitoramento de Escolas</h3>
              <span className="badge-connected">Ao Vivo</span>
            </div>

            <div className="table-responsive">
              <table className="schools-table">
                <thead>
                  <tr>
                    <th>Unidade Escolar</th>
                    <th>Professores</th>
                    <th>Adoção Computação</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map(school => (
                    <tr key={school.id}>
                      <td style={{ fontWeight: '600' }}>{school.name}</td>
                      <td>{school.trained}/{school.teachers} formados</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar-bg" style={{ width: '100px', height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${school.adoption}%`,
                              height: '100%',
                              backgroundColor: school.adoption > 70 ? '#10b981' : school.adoption > 40 ? '#f59e0b' : '#ef4444'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{school.adoption}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={school.connected ? 'status-pill active' : 'status-pill inactive'}>
                          {school.connected ? 'Conectada' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon-danger" onClick={() => handleRemoveSchool(school.id)} title="Remover Escola">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="add-school-card form-card">
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800' }}>➕ Cadastrar Nova Escola</h4>
            <form onSubmit={handleAddSchool} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Nome da Unidade Escolar (EMEB):</label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Ex: EMEB MACHADO DE ASSIS"
                  required
                />
              </div>
              <div className="form-group">
                <label>Total de Professores:</label>
                <input
                  type="number"
                  value={newSchoolTeachers}
                  onChange={(e) => setNewSchoolTeachers(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Salvar Unidade
              </button>
            </form>

            <div className="laws-grid" style={{ marginTop: '24px' }}>
              <div className="law-card">
                <span className="law-title">📚 Educação Especial (Público-Alvo)</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--secondary)' }}>Lei Municipal nº 881/2010</span>
                <p className="law-desc">
                  Garante adaptação física, aumento de fontes e uso de materiais desplugados táteis (como EVA e tampinhas) para alunos com deficiência visual, auditiva ou motora nos laboratórios de informática municipais.
                </p>
              </div>
              <div className="law-card state">
                <span className="law-title">🧠 Foco e Inclusão de TDAH</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent)' }}>Lei Estadual nº 11.076/2019</span>
                <p className="law-desc">
                  Regulamenta o fornecimento de metodologias ágeis e auxílios visuais estruturados em blocos curtos para alunos com TDAH, evitando dispersão em atividades de programação plugada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="prefeitura-dashboard" style={{ marginTop: '32px' }}>
        {!censusSubmitted ? (
          <form onSubmit={submitCensus} className="form-card fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
              📊 Censo de Letramento Digital - Diagnóstico Individual
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '150%' }}>
              Responda com sinceridade. O objetivo não é avaliar você, mas sim mapear as necessidades reais da nossa rede para direcionar a infraestrutura e os treinamentos da Prefeitura!
            </p>

            <div className="form-group">
              <label>1. Como você se sente ao usar recursos digitais (computador, lousa digital) em sala de aula?</label>
              <select value={censusAnswers.q1} onChange={(e) => handleCensusSelect('q1', e.target.value)} className="select-input">
                <option value="1">Tenho muita dificuldade, prefiro evitar.</option>
                <option value="2">Uso apenas o básico (passar vídeo, usar Word).</option>
                <option value="3">Uso com frequência, mas gostaria de mais treinamento para inovar.</option>
                <option value="4">Sou muito confiante e gosto de explorar novas tecnologias com os alunos.</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>2. Com qual frequência você consegue abordar temas como "Segurança na Internet" ou "Cidadania Digital" com seus alunos?</label>
              <select value={censusAnswers.q2} onChange={(e) => handleCensusSelect('q2', e.target.value)} className="select-input">
                <option value="1">Nunca abordei, não sinto que é minha responsabilidade ou não tenho material.</option>
                <option value="2">Abordo raramente, apenas quando acontece algum problema específico (ex: cyberbullying).</option>
                <option value="3">Tento abordar pelo menos uma vez por semestre ou trimestre.</option>
                <option value="4">Faz parte constante do meu currículo e dialogamos frequentemente.</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>3. Qual o maior obstáculo para integrar a Computação e a Tecnologia nas suas aulas hoje?</label>
              <select value={censusAnswers.q3} onChange={(e) => handleCensusSelect('q3', e.target.value)} className="select-input">
                <option value="1">Falta total de infraestrutura (internet ruim, computadores quebrados).</option>
                <option value="2">Falta de conhecimento técnico da minha parte (não sei programar).</option>
                <option value="3">Falta de tempo para planejar ou encontrar materiais alinhados à BNCC.</option>
                <option value="4">Não vejo obstáculos, consigo integrar normalmente.</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>4. Sobre "Pensamento Computacional Desplugado" (ensinar lógica sem usar computadores):</label>
              <select value={censusAnswers.q4} onChange={(e) => handleCensusSelect('q4', e.target.value)} className="select-input">
                <option value="1">Nunca ouvi falar.</option>
                <option value="2">Já ouvi falar, mas não sei como aplicar na prática.</option>
                <option value="3">Aplico algumas vezes usando jogos de tabuleiro ou brincadeiras de seguir passos.</option>
                <option value="4">Aplico regularmente com intencionalidade pedagógica clara.</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>5. Como você avalia o preparo dos seus alunos em relação à Cultura Digital?</label>
              <select value={censusAnswers.q5} onChange={(e) => handleCensusSelect('q5', e.target.value)} className="select-input">
                <option value="1">Eles sabem usar redes sociais/jogos, mas não entendem riscos ou pesquisa escolar.</option>
                <option value="2">Eles têm noções básicas de pesquisa, mas se distraem muito.</option>
                <option value="3">Eles conseguem usar as ferramentas razoavelmente para o aprendizado sob minha tutela.</option>
                <option value="4">Eles são autônomos, críticos e produzem conteúdo com fluência.</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '24px', width: '100%', fontSize: '16px', padding: '16px' }}>
              <span>🚀 Enviar Censo para a Secretaria de Educação</span>
            </button>
          </form>
        ) : (
          <div className="form-card fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
              ✅ Diagnóstico de Impacto Finalizado
            </h3>

            <div style={{ backgroundColor: 'var(--bg-app)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Seu Perfil Pedagógico Identificado pela IA:</h4>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '24px' }}>
                🎯 {censusProfile}
              </div>

              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderLeft: '4px solid var(--primary)',
                padding: '16px 20px',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ Ações Emergenciais Sugeridas pelo Censo para a Secretaria de Educação
                </h4>
                <ol style={{ margin: 0, paddingLeft: '24px', fontSize: '14px', lineHeight: '165%', color: 'var(--text-secondary)' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Iniciar pela Computação Desplugada:</strong> Mapear e adotar imediatamente o módulo de *Pensamento Computacional sem telas*, reduzindo o atrito de capacitação dos professores comuns que têm fobia digital.
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Oficinas de Segurança da Informação (LGPD):</strong> Implementar oficinas rápidas sobre ética de uso seguro de dados nas escolas, visando sanar a brecha crítica identificada em Cultura Digital.
                  </li>
                  <li>
                    <strong>Adoção Emergencial do EduPlan SaaS:</strong> Utilizar o banco com as 103 habilidades computacionais mescladas e o gerador de planos por inteligência artificial para que os professores consigam dar aulas de qualidade imediatamente, sem depender de criar apostilas próprias do zero.
                  </li>
                </ol>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ width: 'auto', padding: '14px 28px', fontSize: '15px' }} onClick={() => window.print()}>
                <span>🖨️ Exportar Diagnóstico de Impacto para a SME (PDF / Impressão)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
