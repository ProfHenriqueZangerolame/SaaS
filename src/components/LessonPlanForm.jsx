import { useState } from 'react';
import { GamesTab } from './Tabs/GamesTab';
import { DashboardTab } from './Tabs/DashboardTab';
import { TrainingTab } from './Tabs/TrainingTab';
import { SavedPlansTab } from './Tabs/SavedPlansTab';
import { GeneratorTab } from './Tabs/GeneratorTab';




export const LessonPlanForm = () => {
  const [unidadeEnsino, setUnidadeEnsino] = useState('EMEBTI "JULIETA DEPS TALLON"');
  const [nomeProfessor, setNomeProfessor] = useState('HENRIQUE');
  const [turma, setTurma] = useState('1º ANO A - VESPERTINO');
  
  const [dateStart, setDateStart] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [dateEnd, setDateEnd] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    return nextWeek.toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState('generator');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [envWarning, setEnvWarning] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="app-container">
      {/* 🚀 SIDEBAR PREMIUM */}
      <aside className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-logo">EP</div>
            <div className="brand-name">EduPlan <span className="text-gradient">SaaS</span></div>
          </div>

          {/* Perfil de Usuário Logado */}
          <div className="user-profile" style={{ marginBottom: '24px' }}>
            <div className="user-avatar">MS</div>
            <div className="user-info">
              <span className="user-name">Prof. {nomeProfessor}</span>
              <span className="user-role">Plano Premium ✨</span>
            </div>
          </div>

          <nav className="menu-list">
            <div 
              className={`menu-item ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
            >
              <span className="menu-icon">⚡</span>
              <span>Gerador com IA</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'myplans' ? 'active' : ''}`}
              onClick={() => setActiveTab('myplans')}
            >
              <span className="menu-icon">📂</span>
              <span>Meus Planos Salvos ${savedPlans.length > 0 ? `(${savedPlans.length})` : ''}</span>
            </div>
            <div
              className={`menu-item ${activeTab === 'games' ? 'active' : ''}`}
              onClick={() => setActiveTab('games')}
            >
              <span className="menu-icon">🕹️</span>
              <span>Laboratório de Jogos</span>
            </div>
            <div
              className={`menu-item ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              <span className="menu-icon">🎓</span>
              <span>Formação Continuada</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'prefeitura' ? 'active' : ''}`}
              onClick={() => setActiveTab('prefeitura')}
            >
              <span className="menu-icon">🏛️</span>
              <span>Painel do Município</span>
            </div>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="btn-secondary" 
            style={{ justifyContent: 'center' }}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️ Tema Claro' : '🌙 Tema Escuro'}
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            EduPlan v1.0.0 &copy; 2026
          </div>
        </div>
      </aside>

      {/* 💻 CONTEÚDO PRINCIPAL */}
      <main className="main-content">
        
        {/* Aviso didático de .env pendente */}
        {envWarning && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '32px',
            fontSize: '15px',
            color: 'var(--text-primary)',
            lineHeight: '160%'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#d97706', fontSize: '18px', fontWeight: '800' }}>
              ⚠️ Configuração do Servidor Pendente!
            </h3>
            <p style={{ margin: '0 0 16px 0' }}>
              O backend do EduPlan-SaaS foi contactado com sucesso, mas a chave <strong>`GEMINI_API_KEY`</strong> no arquivo <strong>`.env`</strong> na raiz do projeto ainda está com o valor padrão!
            </p>
            <ol style={{ margin: '0 0 16px 0', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>Abra o arquivo <strong>`.env`</strong> localizado na raiz do projeto.</li>
              <li style={{ marginBottom: '6px' }}>Substitua o valor <code>YOUR_GEMINI_API_KEY</code> pela sua Chave API real do Gemini Pro.</li>
              <li>Salve o arquivo e certifique-se de iniciar/reiniciar o servidor backend!</li>
            </ol>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              💡 <em>Dica: Você pode conseguir uma chave de API gratuita acessando o <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Google AI Studio</a>.</em>
            </p>
          </div>
        )}

        {/* Banner de Erro Geral */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '4px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#ef4444',
            fontWeight: '600'
          }}>
            ❌ {errorMsg}
          </div>
        )}

        <header className="header-section">
          <div className="header-title">
            {activeTab === 'generator' && (
              <>
                <h1>Ficha de Registro <span className="text-gradient">Oficial BNCC</span></h1>
                <p>Gere registros de plano de aula completos prontos para imprimir e entregar na coordenação.</p>
              </>
            )}
            {activeTab === 'myplans' && (
              <>
                <h1>Fichas <span className="text-gradient">Salvas</span></h1>
                <p>Gerencie, edite e exporte seus registros de plano de aula concluídos.</p>
              </>
            )}
            {activeTab === 'prefeitura' && (
              <>
                <h1>Painel da Prefeitura <span className="text-gradient">e Governança</span></h1>
                <p>Monitore escolas, professores e produção de planos de aula alinhados à BNCC.</p>
              </>
            )}
            {activeTab === 'diagnostico' && (
              <>
                <h1>Censo de Letramento <span className="text-gradient">e Impacto Digital</span></h1>
                <p>Realize o diagnóstico digital dos profissionais de educação para medir o impacto da BNCC nas escolas.</p>
              </>
            )}
            {activeTab === 'training' && (
              <>
                <h1>Formação Pedagógica <span className="text-gradient">BNCC Computacional</span></h1>
                <p>Capacite-se nos eixos de Computação escolar e desbloqueie o seu Certificado de Instrutor Oficial.</p>
              </>
            )}
            {activeTab === 'games' && (
              <>
                <h1>Laboratório Lúdico <span className="text-gradient">Computacional</span></h1>
                <p>Desenvolva o pensamento algorítmico resolvendo sequências e depurando programas nos simuladores.</p>
              </>
            )}
          </div>
        </header>



        {/* 1. ABA DO GERADOR DE PLANOS */}
        {activeTab === 'generator' && (
          <GeneratorTab
            unidadeEnsino={unidadeEnsino} setUnidadeEnsino={setUnidadeEnsino}
            nomeProfessor={nomeProfessor} setNomeProfessor={setNomeProfessor}
            turma={turma} setTurma={setTurma}
            dateStart={dateStart} setDateStart={setDateStart}
            dateEnd={dateEnd} setDateEnd={setDateEnd}
            generatedPlan={generatedPlan} setGeneratedPlan={setGeneratedPlan}
            savedPlans={savedPlans} setSavedPlans={setSavedPlans}
            _errorMsg={errorMsg} setErrorMsg={setErrorMsg}
            _envWarning={envWarning} setEnvWarning={setEnvWarning}
          />
        )}


        {/* 2. ABA DE MEUS PLANOS SALVOS */}
        {activeTab === 'myplans' && (
          <SavedPlansTab
            savedPlans={savedPlans}
            setActiveTab={setActiveTab}
            setGeneratedPlan={setGeneratedPlan}
          />
        )}


        {/* 3. ABA DO PAINEL DA PREFEITURA / GOVERNANÇA MUNICIPAL */}
        {activeTab === 'prefeitura' && (
          <DashboardTab savedPlans={savedPlans} />
        )}


        {/* 4. ABA DA FORMAÇÃO PEDAGÓGICA (CURSOS & CERTIFICADOS) */}
        {activeTab === 'training' && (
          <TrainingTab nomeProfessor={nomeProfessor} />
        )}


        {/* 5. ABA DOS JOGOS E SIMULADORES PEDAGÓGICOS */}
        {activeTab === 'games' && (
          <GamesTab />
        )}
      </main>
    </div>
  );
};

export default LessonPlanForm;
