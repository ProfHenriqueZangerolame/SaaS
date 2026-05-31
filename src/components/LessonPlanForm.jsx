import { useState, useEffect } from 'react';
import BNCC_SUGGESTIONS from '../data/bncc_skills.json';
import { supabase } from '../supabaseClient';

// Monta os headers com o token de login (quando houver) para o backend
// identificar o professor e aplicar o controle de créditos.
const authHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Função auxiliar para formatar data do formato YYYY-MM-DD para DD/MM/YYYY
const formatDateToBR = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const LessonPlanForm = ({ user: _user, profile, onLogout }) => {
  // Estados de Registro Oficial (Cabeçalho da Ficha)
  const [unidadeEnsino, setUnidadeEnsino] = useState(() => {
    return profile?.school_1 ? profile.school_1.toUpperCase() : 'EMEBTI "JULIETA DEPS TALLON"';
  });
  const [nomeProfessor, setNomeProfessor] = useState(() => {
    return profile?.full_name ? profile.full_name.toUpperCase() : 'HENRIQUE';
  });
  const [turma, setTurma] = useState(() => {
    if (profile?.turma && profile?.horario_aula) {
      return `${profile.turma.toUpperCase()} - ${profile.horario_aula.toUpperCase()}`;
    }
    return profile?.turma ? profile.turma.toUpperCase() : '1º ANO A - VESPERTINO';
  });
  
  // Seletores de calendário para planos semanais ou quinzenais
  const [dateStart, setDateStart] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  
  const [dateEnd, setDateEnd] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4); // Padrão: 5 dias (segunda a sexta)
    return nextWeek.toISOString().split('T')[0];
  });

  // Estados do Formulário de Filtro
  const [subject, setSubject] = useState('Português');
  const [grade, setGrade] = useState(() => {
    if (profile?.turma) {
      const match = profile.turma.match(/[1-5](?:º|o)?\s*Ano/i);
      if (match) {
        const num = match[0].match(/[1-5]/)[0];
        return `${num}º Ano`;
      }
      const simpleNumMatch = profile.turma.match(/^[1-5]/);
      if (simpleNumMatch) {
        return `${simpleNumMatch[0]}º Ano`;
      }
    }
    return '1º Ano';
  });
  const [trimester, setTrimester] = useState('2º Trimestre');
  const [resource, setResource] = useState('analog');
  const [needsAdaptation, setNeedsAdaptation] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('AUTO_DETECT');
  const [customTopic, setCustomTopic] = useState('');
  const [skillCodesInput, setSkillCodesInput] = useState('');

  // Estados de Fluxo da UI
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [canvasView, setCanvasView] = useState('professor'); // 'professor' ou 'aluno'
  const [generatedActivity, setGeneratedActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showAccessibilityDicas, setShowAccessibilityDicas] = useState(true);
  const [showGabarito, setShowGabarito] = useState(false);
  const [borderTheme, setBorderTheme] = useState('classic'); // 'classic', 'space', 'nature', 'school'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('eduplan_darkMode');
    return saved !== null ? saved === 'true' : true;
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [envWarning, setEnvWarning] = useState(false);
  const [saldo, setSaldo] = useState(null); // saldo de créditos do mês (null = ainda carregando)

  // Busca o saldo de créditos do professor no backend
  const loadSaldo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/saldo`, { headers: await authHeaders() });
      if (res.ok) setSaldo(await res.json());
    } catch {
      /* silencioso: saldo é informativo */
    }
  };

  useEffect(() => {
    loadSaldo();
  }, []);

  // Texto curto do saldo para exibir no perfil/sidebar
  const saldoLabel = () => {
    if (!saldo) return 'Carregando...';
    if (saldo.ilimitado) return saldo.modoMvp ? 'Modo livre ✨' : 'Créditos ilimitados ✨';
    return `${saldo.restantes} de ${saldo.creditos_mensais} créditos`;
  };

  const semCredito = saldo && !saldo.ilimitado && saldo.restantes <= 0;

  // Catálogo de planos para a aba de assinatura
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [assinando, setAssinando] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/planos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPlanosDisponiveis(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Formata centavos em reais (1900 -> "19,00")
  const formatBRL = (cents) => (cents / 100).toFixed(2).replace('.', ',');

  // Inicia a assinatura de um plano (abre o checkout do Asaas em nova aba).
  const handleAssinar = async (slug) => {
    setErrorMsg('');
    setAssinando(slug);
    try {
      const cpfCnpj = window.prompt('Para emitir a cobrança, informe seu CPF (somente números):') || '';
      const res = await fetch(`${API_BASE_URL}/api/assinatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ planoSlug: slug, cpfCnpj }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.message || 'Não foi possível iniciar a assinatura.');
        return;
      }
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank', 'noopener');
      } else if (data.simulado) {
        alert(`✅ ${data.message}`);
      }
      loadSaldo();
    } catch {
      setErrorMsg('Erro de conexão ao iniciar a assinatura.');
    } finally {
      setAssinando('');
    }
  };

  // Controle de Visualização da Sidebar
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(() => {
    return localStorage.getItem('eduplan_showAdvancedMenu') === 'true';
  });

  // === ESTADOS PERSISTIDOS NO LOCALSTORAGE ===
  const [savedPlans, setSavedPlans] = useState(() => {
    const saved = localStorage.getItem('eduplan_savedPlans');
    return saved ? JSON.parse(saved) : [];
  });

  const [censusAnswers, setCensusAnswers] = useState(() => {
    const saved = localStorage.getItem('eduplan_censusAnswers');
    return saved ? JSON.parse(saved) : { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 };
  });

  const [censusSubmitted, setCensusSubmitted] = useState(() => {
    return localStorage.getItem('eduplan_censusSubmitted') === 'true';
  });

  const [censusProfile, setCensusProfile] = useState(() => {
    return localStorage.getItem('eduplan_censusProfile') || '';
  });

  // === ESTADOS DO SAAS DE PREFEITURAS & CAPACITAÇÃO ===
  const [prefeituraName] = useState('CACHOEIRO DE ITAPEMIRIM - ES');
  const [schools, setSchools] = useState(() => {
    const saved = localStorage.getItem('eduplan_schools');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'EMEBTI "JULIETA DEPS TALLON"', adoption: 85, teachers: 14, trained: 12, connected: true },
      { id: 2, name: 'EMEB "CASTRO ALVES"', adoption: 65, teachers: 18, trained: 11, connected: true },
      { id: 3, name: 'EMEB "FLORISBELA CORRÊA LIMA"', adoption: 42, teachers: 10, trained: 4, connected: false },
      { id: 4, name: 'EMEB "PROF. ALBERTO SARTÓRIO"', adoption: 20, teachers: 12, trained: 2, connected: false }
    ];
  });
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolTeachers, setNewSchoolTeachers] = useState(10);

  // Quizes da Formação de Professores (1 pergunta de teste por Eixo)
  const [quizAnswers, setQuizAnswers] = useState(() => {
    const saved = localStorage.getItem('eduplan_quizAnswers');
    return saved ? JSON.parse(saved) : { 0: null, 1: null, 2: null };
  });
  const [quizSubmitted, setQuizSubmitted] = useState(() => {
    const saved = localStorage.getItem('eduplan_quizSubmitted');
    return saved ? JSON.parse(saved) : { 0: false, 1: false, 2: false };
  });
  const [quizResults, setQuizResults] = useState(() => {
    const saved = localStorage.getItem('eduplan_quizResults');
    return saved ? JSON.parse(saved) : { 0: null, 1: null, 2: null };
  });
  const [showCertificate, setShowCertificate] = useState(false);
  
  // Quiz Database
  const trainingQuizzes = [
    {
      title: "Quiz: Pensamento Computacional",
      question: "Qual das seguintes atividades representa melhor o conceito de 'Algoritmos' de forma desplugada na Educação Infantil e Anos Iniciais?",
      options: [
        "A) Pedir para os alunos copiarem comandos de um livro de programação técnica.",
        "B) Criar uma receita de bolo passo a passo ou dar instruções físicas sequenciais para um colega atravessar uma ponte de papel.",
        "C) Deixar as crianças jogando no celular livremente sem orientação pedagógica.",
        "D) Explicar a arquitetura física de processadores e placas-mãe."
      ],
      correctIndex: 1,
      explanation: "Receitas, roteiros de passos físicos e sequências lógicas representam perfeitamente o ensino de algoritmos de forma desplugada, ideal para a faixa etária da educação básica inicial."
    },
    {
      title: "Quiz: Mundo Digital",
      question: "Ao ensinar sobre 'Instrução de Máquina' (EF02CO03), qual a principal noção que o aluno deve compreender?",
      options: [
        "A) Que os computadores pensam como humanos e têm sentimentos próprios.",
        "B) Que computadores apenas funcionam na tomada.",
        "C) Que diferentes máquinas executam conjuntos específicos de instruções pré-definidas por algoritmos e não têm 'vontade' própria.",
        "D) Que a internet transmite dados instantaneamente sem fios."
      ],
      correctIndex: 2,
      explanation: "A habilidade EF02CO03 foca em entender que máquinas apenas interpretam conjuntos estruturados de comandos lógicos que nós criamos."
    },
    {
      title: "Quiz: Cultura Digital",
      question: "Como o professor pode aplicar a habilidade EF01CO07 (Uso seguro de dados) em sala de aula de forma prática?",
      options: [
        "A) Ensinando os alunos a nunca compartilharem senhas, nomes completos ou fotos em redes e plataformas públicas.",
        "B) Mandando os alunos criarem redes sociais e perfis abertos no Instagram.",
        "C) Proibindo os alunos de usarem qualquer tipo de lápis ou borracha.",
        "D) Explicando conceitos matemáticos de criptografia quântica assimétrica."
      ],
      correctIndex: 0,
      explanation: "A cidadania digital segura nos anos iniciais começa por hábitos simples de privacidade de dados básicos, essenciais para a proteção das crianças."
    }
  ];

  // Jogo Interativo: Blocos Mágicos
  const [gameRobotPos, setGameRobotPos] = useState([0, 4]); // [col, row], inicia na ponta inferior esquerda (col 0, row 4)
  const [gameRobotDir, setGameRobotDir] = useState('right'); // 'right', 'down', 'left', 'up'
  const [gameCommands, setGameCommands] = useState([]);
  const [gameIsRunning, setGameIsRunning] = useState(false);
  const [gameActiveStep, setGameActiveStep] = useState(-1);
  const [gameStatus, setGameStatus] = useState('idle'); // 'idle', 'playing', 'success', 'fail'
  const [gameMessage, setGameMessage] = useState('Ajude o robô 🤖 a evitar o fogo 🔥 e alcançar a estrela 🌟!');

  // Mapa 5x5 do Labirinto
  // 0 = caminho livre, 1 = obstáculo de fogo, 2 = estrela (meta na célula [4, 0] no topo direito)
  const gameGridMap = [
    [0, 0, 0, 0, 2], // row 0 (estrela na col 4)
    [0, 1, 1, 0, 0], // row 1
    [0, 0, 1, 1, 0], // row 2
    [1, 0, 0, 0, 0], // row 3
    [0, 0, 1, 0, 0]  // row 4 (início na col 0, row 4)
  ];

  // Filtro de sugestões baseadas na disciplina e ano
  const filteredSkills = BNCC_SUGGESTIONS.filter(
    (skill) => skill.subject === subject && skill.grade === grade
  );

  // Efeito para selecionar 'AUTO_DETECT' (Busca Inteligente) por padrão ao alterar disciplina/série
  useEffect(() => {
    setSelectedSkill('AUTO_DETECT');
  }, [subject, grade]);

  // Efeito para alternar tema dark/light
  useEffect(() => {
    const body = document.body;
    if (darkMode) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
    localStorage.setItem('eduplan_darkMode', darkMode);
  }, [darkMode]);

  // Efeitos para persistência no LocalStorage
  useEffect(() => {
    localStorage.setItem('eduplan_savedPlans', JSON.stringify(savedPlans));
  }, [savedPlans]);

  useEffect(() => {
    localStorage.setItem('eduplan_schools', JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    localStorage.setItem('eduplan_censusSubmitted', censusSubmitted);
  }, [censusSubmitted]);

  useEffect(() => {
    localStorage.setItem('eduplan_censusProfile', censusProfile);
  }, [censusProfile]);

  useEffect(() => {
    localStorage.setItem('eduplan_censusAnswers', JSON.stringify(censusAnswers));
  }, [censusAnswers]);

  useEffect(() => {
    localStorage.setItem('eduplan_quizAnswers', JSON.stringify(quizAnswers));
  }, [quizAnswers]);

  useEffect(() => {
    localStorage.setItem('eduplan_quizSubmitted', JSON.stringify(quizSubmitted));
  }, [quizSubmitted]);

  useEffect(() => {
    localStorage.setItem('eduplan_quizResults', JSON.stringify(quizResults));
  }, [quizResults]);

  useEffect(() => {
    localStorage.setItem('eduplan_showAdvancedMenu', showAdvancedMenu);
  }, [showAdvancedMenu]);

  // Efeito para controlar a orientação da página (retrato/paisagem) dinamicamente na impressão
  useEffect(() => {
    const existingStyle = document.getElementById('dynamic-print-orientation');
    if (existingStyle) {
      existingStyle.remove();
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-orientation';
    
    if (canvasView === 'professor') {
      styleEl.innerHTML = `
        @media print {
          @page {
            size: landscape !important;
            margin: 0.8cm !important;
          }
        }
      `;
    } else {
      styleEl.innerHTML = `
        @media print {
          @page {
            size: portrait !important;
            margin: 1.2cm !important;
          }
        }
      `;
    }
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('dynamic-print-orientation');
      if (el) el.remove();
    };
  }, [canvasView]);

  // Passos do Pedagogical Loader
  const loadingSteps = [
    '🔍 Analisando diretrizes oficiais da BNCC Geral...',
    '🧠 Selecionando estratégias didáticas adequadas à turma...',
    '📋 Estruturando objetivos de aprendizagem (Cognitivo & Socioemocional)...',
    '🎨 Desenhando atividades interativas adaptadas ao recurso...',
    '✍️ Redigindo critérios de avaliação formativa e finalizando...'
  ];

  // Geração do Plano enviando para o Servidor Backend Seguro
  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStepIndex(0);
    setGeneratedPlan(null);
    setCanvasView('professor');
    setGeneratedActivity(null);
    setLoadingActivity(false);
    setShowGabarito(false);
    setBorderTheme('classic');
    setErrorMsg('');
    setEnvWarning(false);

    // Efeito visual dos passos do Loader
    const stepInterval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    // Formatar o intervalo de datas da semana para o padrão brasileiro
    const finalPeriodo = `${formatDateToBR(dateStart)} a ${formatDateToBR(dateEnd)}`;

    // Determinar habilidades e descrições
    let finalSkillCode = selectedSkill;
    let finalSkillDesc;

    if (selectedSkill === 'AUTO_DETECT') {
      finalSkillCode = 'AUTO_DETECT';
      finalSkillDesc = customTopic || 'Desenvolvimento livre com base no tema escolhido pelo professor.';
    } else if (selectedSkill === 'CUSTOM') {
      finalSkillCode = skillCodesInput ? skillCodesInput.toUpperCase() : 'Personalizado';
      finalSkillDesc = customTopic || 'Desenvolvimento livre do tema selecionado pelo professor.';
    } else {
      const selectedSkillObj = BNCC_SUGGESTIONS.find(s => s.code === selectedSkill);
      finalSkillDesc = selectedSkillObj ? selectedSkillObj.description : '';
      if (skillCodesInput) {
        finalSkillCode = `${selectedSkill}, ${skillCodesInput.toUpperCase()}`;
        const extraCodes = skillCodesInput.split(',').map(c => c.trim().toUpperCase());
        const extraDescs = extraCodes.map(code => {
          const found = BNCC_SUGGESTIONS.find(s => s.code === code);
          return found ? `[${code}] ${found.description}` : `[${code}] Habilidade complementar integrada`;
        }).join('; ');
        finalSkillDesc = `${finalSkillDesc} | Habilidades Extras Integradas: ${extraDescs}`;
      }
    }

    try {
      // Chamada HTTP para a nossa API do servidor Node.js local
      const response = await fetch(`${API_BASE_URL}/api/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({
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
        }),
      });

      clearInterval(stepInterval);
      setLoading(false);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        setErrorMsg(errJson.message || 'Falha na comunicação com o servidor de Inteligência Artificial.');
        if (errJson.error === 'Chave API não configurada') {
          setEnvWarning(true); // Exibe o banner amigável de orientação do .env
        }
        clearInterval(stepInterval);
        setLoading(false);
        return;
      }

      const planJson = await response.json();

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
        observacoes: planJson.observacoes,
        roteiroDinamica: planJson.roteiroDinamica
      });

      loadSaldo(); // atualiza o saldo de créditos após consumir 1 crédito

    } catch (err) {
      clearInterval(stepInterval);
      setLoading(false);
      setErrorMsg('Erro de conexão com o servidor backend. Certifique-se de que o backend está ativo na porta 3000.');
      console.error("Erro de conexão com o servidor:", err);
    }
  };

  const handleGenerateActivity = async () => {
    if (!generatedPlan) return;
    setLoadingActivity(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({
          subject: generatedPlan.subject,
          grade: generatedPlan.grade,
          skillCode: generatedPlan.skillCode,
          skillDesc: generatedPlan.skillDesc,
          title: generatedPlan.title,
          objetoConhecimento: generatedPlan.objetoConhecimento,
          desenvolvimentoMetodologico: generatedPlan.desenvolvimentoMetodologico
        }),
      });

      setLoadingActivity(false);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        setErrorMsg(errJson.message || 'Falha ao gerar a folha de atividades via Inteligência Artificial.');
        return;
      }

      const activityJson = await response.json();
      setGeneratedActivity(activityJson);

      loadSaldo(); // atualiza o saldo de créditos após consumir 1 crédito

    } catch (err) {
      setLoadingActivity(false);
      setErrorMsg('Erro de conexão com o servidor ao gerar atividades.');
      console.error("Erro de conexão ao gerar atividades:", err);
    }
  };


  const exportToWord = () => {
    if (!generatedPlan) return;
    
    // Pegar o elemento correspondente ao canvas ativo
    let elementId = canvasView === 'professor' ? 'professor-canvas-content' : 'aluno-canvas-content';
    const element = document.getElementById(elementId);
    if (!element) return;

    // Criar uma cópia do HTML excluindo os elementos marcados com "no-print"
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.innerHTML;
    
    // Remover todos os botões e seletores da cópia temporária para o Word
    const noPrintElements = tempDiv.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());

    let contentHtml = tempDiv.innerHTML;

    // Criar o cabeçalho completo compatível com o MS Word
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <title>PlanejaAÍ Export</title>
            <meta charset='utf-8'>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; color: #000000; }
              table { border-collapse: collapse; width: 100%; margin-top: 15px; }
              th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
              th { background-color: #bfdbfe; font-weight: bold; }
              /* Adaptação de Temas para Bordas no Word */
              .theme-border-classic { border: 3px double #000000; padding: 20px; }
              .theme-border-space { border: 4px double #4f46e5; padding: 20px; }
              .theme-border-nature { border: 4px double #10b981; padding: 20px; }
              .theme-border-school { border: 4px double #f59e0b; padding: 20px; }
            </style>
          </head>
          <body>`;
          
    const footer = "</body></html>";
    const html = header + contentHtml + footer;

    // Criar blob de download tipo aplicativo do Word
    const blob = new Blob(['\ufeff' + html], {
      type: 'application/msword'
    });

    // Definir nome de arquivo amigável
    const filename = canvasView === 'professor' 
      ? `Plano_de_Aula_${generatedPlan.subject}_${generatedPlan.grade}.doc`
      : `Atividade_Aluno_${generatedPlan.subject}_${generatedPlan.grade}.doc`;

    // Trigger de Download do arquivo no navegador
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const savePlan = () => {
    if (generatedPlan) {
      setSavedPlans([generatedPlan, ...savedPlans]);
      alert('🏆 Plano salvo com sucesso no banco de dados do PlanejaAÍ!');
    }
  };

  // === AUXILIARES DO PAINEL DA PREFEITURA ===
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

  // === AUXILIARES DA FORMAÇÃO PEDAGÓGICA ===
  const handleQuizSelect = (moduleIdx, optIdx) => {
    if (quizSubmitted[moduleIdx]) return; // Já enviado
    setQuizAnswers({ ...quizAnswers, [moduleIdx]: optIdx });
  };

  const handleQuizSubmit = (moduleIdx) => {
    const selected = quizAnswers[moduleIdx];
    if (selected === null) {
      alert('Por favor, selecione uma alternativa antes de enviar!');
      return;
    }
    
    const isCorrect = selected === trainingQuizzes[moduleIdx].correctIndex;
    
    setQuizSubmitted({ ...quizSubmitted, [moduleIdx]: true });
    setQuizResults({ ...quizResults, [moduleIdx]: isCorrect });
  };

  const areAllQuizzesPassed = () => {
    return quizResults[0] === true && quizResults[1] === true && quizResults[2] === true;
  };

  // === AUXILIARES DO CENSO E DIAGNÓSTICO ===
  const handleSubmitCensus = (e) => {
    e.preventDefault();
    const score = censusAnswers.q1 + censusAnswers.q2 + censusAnswers.q3 + censusAnswers.q4 + censusAnswers.q5;
    let profile;
    if (score <= 10) {
      profile = 'Pedagogo em Transição Digital (Nível Básico)';
    } else if (score <= 18) {
      profile = 'Inovador Desplugado (Nível Intermediário)';
    } else {
      profile = 'Líder em Tecnologia Educacional (Nível Avançado)';
    }
    setCensusProfile(profile);
    setCensusSubmitted(true);
    
    // Simula a atualização das estatísticas de adoção municipal
    const updatedSchools = schools.map(s => {
      if (s.id === 1) {
        return { ...s, trained: s.trained + 1, adoption: Math.min(100, s.adoption + 5) };
      }
      return s;
    });
    setSchools(updatedSchools);
    alert(`📊 Diagnóstico concluído! Perfil Pedagógico Calculado: ${profile}`);
  };

  const handleCensusSelect = (questionKey, value) => {
    setCensusAnswers({ ...censusAnswers, [questionKey]: parseInt(value) });
  };

  // === AUXILIARES DO JOGO DE BLOCOS LÓGICOS ===
  const addGameCommand = (cmd) => {
    if (gameIsRunning) return;
    if (gameCommands.length >= 10) {
      alert('O limite máximo é de 10 instruções por algoritmo!');
      return;
    }
    setGameCommands([...gameCommands, cmd]);
    setGameStatus('idle');
  };

  const clearGameQueue = () => {
    if (gameIsRunning) return;
    setGameCommands([]);
    setGameStatus('idle');
  };

  const runGameSimulation = () => {
    if (gameCommands.length === 0) {
      setGameMessage('Adicione pelo menos um bloco de comando antes de executar!');
      return;
    }
    
    setGameIsRunning(true);
    setGameStatus('playing');
    setGameMessage('🤖 Executando o seu algoritmo...');
    
    let currentPos = [0, 4]; // [col, row], inicia em col 0, row 4
    let currentDir = 'right';
    let step = 0;
    
    setGameRobotPos(currentPos);
    setGameRobotDir(currentDir);

    const executeNextStep = () => {
      if (step >= gameCommands.length) {
        // Final da fila
        setGameIsRunning(false);
        const mapVal = gameGridMap[currentPos[1]][currentPos[0]];
        if (mapVal === 2) {
          setGameStatus('success');
          setGameMessage('🌟 Incrível! Seu algoritmo funcionou! O robô recolheu a Estrela! Habilidade EF01CO03 exercitada com sucesso!');
        } else {
          setGameStatus('fail');
          setGameMessage('❌ Algoritmo concluído, mas o robô não chegou à Estrela. Tente repensar os passos!');
        }
        setGameActiveStep(-1);
        return;
      }
      
      setGameActiveStep(step);
      const cmd = gameCommands[step];
      
      if (cmd === 'move') {
        let nextCol = currentPos[0];
        let nextRow = currentPos[1];
        
        if (currentDir === 'right') nextCol += 1;
        else if (currentDir === 'left') nextCol -= 1;
        else if (currentDir === 'up') nextRow -= 1;
        else if (currentDir === 'down') nextRow += 1;
        
        // Validar limites
        if (nextCol < 0 || nextCol > 4 || nextRow < 0 || nextRow > 4) {
          setGameIsRunning(false);
          setGameStatus('fail');
          setGameMessage('💥 O robô saiu do labirinto e colidiu com a parede!');
          setGameActiveStep(-1);
          return;
        }
        
        // Validar fogo
        if (gameGridMap[nextRow][nextCol] === 1) {
          setGameIsRunning(false);
          setGameStatus('fail');
          setGameRobotPos([nextCol, nextRow]);
          setGameMessage('🔥 Ah não! O robô colidiu com uma chama de fogo!');
          setGameActiveStep(-1);
          return;
        }
        
        currentPos = [nextCol, nextRow];
        setGameRobotPos(currentPos);
      } else if (cmd === 'turn-right') {
        const dirs = ['right', 'down', 'left', 'up'];
        const idx = dirs.indexOf(currentDir);
        currentDir = dirs[(idx + 1) % 4];
        setGameRobotDir(currentDir);
      } else if (cmd === 'turn-left') {
        const dirs = ['right', 'down', 'left', 'up'];
        const idx = dirs.indexOf(currentDir);
        currentDir = dirs[(idx - 1 + 4) % 4];
        setGameRobotDir(currentDir);
      }
      
      step++;
      setTimeout(executeNextStep, 800); // 800ms por instrução
    };
    
    executeNextStep();
  };

  const resetGame = () => {
    setGameRobotPos([0, 4]);
    setGameRobotDir('right');
    setGameCommands([]);
    setGameIsRunning(false);
    setGameActiveStep(-1);
    setGameStatus('idle');
    setGameMessage('Ajude o robô 🤖 a evitar o fogo 🔥 e alcançar a estrela 🌟!');
  };

  return (
    <div className="app-container">
      {/* 🚀 SIDEBAR PREMIUM */}
      <aside className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-logo" style={{ overflow: 'hidden', padding: 0 }}>
              <img 
                src="/logo.png" 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <div className="brand-name">Planeja<span className="text-gradient">AÍ</span></div>
          </div>

          {/* Perfil de Usuário Logado */}
          <div className="user-profile" style={{ marginBottom: '24px' }}>
            <div className="user-avatar">
              {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'MS'}
            </div>
            <div className="user-info">
              <span className="user-name" style={{ textTransform: 'uppercase' }}>
                Prof. {profile?.full_name ? profile.full_name.split(' ')[0] : nomeProfessor}
              </span>
              <span className="user-role" style={{ fontSize: '11px' }}>
                {profile?.role === 'coordinator' ? 'Pedagogo / Gestor 🗂️' : saldoLabel()}
              </span>
            </div>
          </div>

          {/* Badge de Créditos (somente professor) */}
          {saldo && profile?.role !== 'coordinator' && (
            <div className="sidebar-credits-badge">
              <div className="sidebar-credits-label">
                <span>Créditos do mês</span>
                {saldo.plano?.nome && <span className="sidebar-credits-plan-tag">{saldo.plano.nome}</span>}
                {saldo.modoMvp && <span className="sidebar-credits-plan-tag">Modo livre</span>}
              </div>
              {saldo.ilimitado ? (
                <>
                  <div className="sidebar-credits-count">∞ <span>ilimitado ✨</span></div>
                  <div className="sidebar-credits-bar">
                    <div className="sidebar-credits-bar-fill" style={{ width: '100%' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="sidebar-credits-count">{saldo.restantes} <span>de {saldo.creditos_mensais}</span></div>
                  <div className="sidebar-credits-bar">
                    <div
                      className="sidebar-credits-bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, (saldo.restantes / saldo.creditos_mensais) * 100))}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Seção 1: Espaço do Professor (Foco do dia a dia) */}
          <div style={{ padding: '0 16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Espaço do Professor
            </span>
          </div>
          <nav className="menu-list" style={{ marginBottom: '24px' }}>
            <div 
              className={`menu-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <span className="menu-icon">🏠</span>
              <span>Início / Dashboard</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
            >
              <span className="menu-icon">⚡</span>
              <span>Gerador de Planos</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'myplans' ? 'active' : ''}`}
              onClick={() => setActiveTab('myplans')}
            >
              <span className="menu-icon">📂</span>
              <span>Meus Planos ({savedPlans.length})</span>
            </div>
            <div
              className={`menu-item ${activeTab === 'planos' ? 'active' : ''}`}
              onClick={() => setActiveTab('planos')}
            >
              <span className="menu-icon">💎</span>
              <span>Planos &amp; Assinatura</span>
            </div>
          </nav>

          {/* Seção 2: Secretaria & Gestão (Módulos de Escala/Demonstração) */}
          <div style={{ 
            padding: '0 16px', 
            marginBottom: '8px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Gestão & Computação
            </span>
            <button 
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
            >
              {showAdvancedMenu ? 'Recolher 🔼' : 'Expandir 🔽'}
            </button>
          </div>

          {showAdvancedMenu && (
            <nav className="menu-list fade-in">
              <div 
                className={`menu-item ${activeTab === 'prefeitura' ? 'active' : ''}`}
                onClick={() => setActiveTab('prefeitura')}
              >
                <span className="menu-icon">🏢</span>
                <span>Painel da Prefeitura</span>
              </div>
              <div 
                className={`menu-item ${activeTab === 'diagnostico' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagnostico')}
              >
                <span className="menu-icon">📊</span>
                <span>Censo Digital</span>
              </div>
              <div 
                className={`menu-item ${activeTab === 'training' ? 'active' : ''}`}
                onClick={() => setActiveTab('training')}
              >
                <span className="menu-icon">🎓</span>
                <span>Formação de Professores</span>
              </div>
              <div 
                className={`menu-item ${activeTab === 'games' ? 'active' : ''}`}
                onClick={() => setActiveTab('games')}
              >
                <span className="menu-icon">🕹️</span>
                <span>Laboratório de Jogos</span>
              </div>
            </nav>
          )}
        </div>

        {/* Rodapé da Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            style={{ justifyContent: 'center' }}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️ Tema Claro' : '🌙 Tema Escuro'}
          </button>
          
          {onLogout && (
            <button 
              type="button"
              className="btn-secondary" 
              style={{ 
                justifyContent: 'center', 
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#fca5a5',
                borderColor: 'rgba(239, 68, 68, 0.2)'
              }}
              onClick={onLogout}
            >
              <span>🚪 Sair da Minha Conta</span>
            </button>
          )}

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            PlanejaAÍ v1.0.0 &copy; 2026
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
              O backend do PlanejaAÍ foi contactado com sucesso, mas a chave <strong>`GEMINI_API_KEY`</strong> no arquivo <strong>`.env`</strong> na raiz do projeto ainda está com o valor padrão!
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

        {/* Aviso de créditos esgotados */}
        {semCredito && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '24px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            fontWeight: '600'
          }}>
            ⚠️ Seus créditos do mês acabaram. Faça upgrade do seu plano para continuar gerando planos e atividades.
          </div>
        )}

        <header className="header-section">
          <div className="header-title">
            {activeTab === 'home' && (
              <>
                <h1>Olá, Prof. <span className="text-gradient">{nomeProfessor}</span>! 👋</h1>
                <p>Bem-vindo ao portal PlanejaAÍ. O que vamos planejar de incrível hoje?</p>
              </>
            )}
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
            {activeTab === 'planos' && (
              <>
                <h1>Planos &amp; <span className="text-gradient">Assinatura</span></h1>
                <p>Escolha o plano ideal e gere quantos planos de aula precisar com inteligência artificial.</p>
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

        {/* 0. ABA DE INÍCIO (DASHBOARD) */}
        {activeTab === 'home' && (
          <div className="fade-in">
            {/* Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(217, 70, 239, 0.08) 100%)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-premium)'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--primary)',
                  backgroundColor: 'var(--primary-glow)',
                  padding: '4px 10px',
                  borderRadius: '50px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'inline-block',
                  marginBottom: '12px'
                }}>
                  💡 DICA PEDAGÓGICA DO DIA
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 12px 0', fontFamily: 'var(--font-heading)' }}>
                  A Computação Desplugada transforma a aprendizagem!
                </h2>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '160%', maxWidth: '800px' }}>
                  Integrar o <strong>Pensamento Computacional</strong> sem o uso imediato de telas (usando o corpo, desenhos e receitas lógicas) ajuda a reter o foco de estudantes da Educação Infantil e Anos Iniciais, reduzindo fobias digitais e gerando excelente letramento conceitual.
                </p>
              </div>
              <div style={{
                position: 'absolute',
                right: '-20px',
                bottom: '-30px',
                fontSize: '140px',
                opacity: 0.05,
                userSelect: 'none',
                pointerEvents: 'none'
              }}>
                💡
              </div>
            </div>

            {/* Grid de Métricas Rápidas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {/* Card 1: Planos */}
              <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📂</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planos Salvos</span>
                <strong style={{ fontSize: '28px', color: 'var(--primary)', margin: '4px 0' }}>{savedPlans.length}</strong>
                <span 
                  onClick={() => setActiveTab('myplans')}
                  style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}
                >
                  Ver meus planos ➔
                </span>
              </div>

              {/* Card 2: Escola */}
              <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🏫</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unidade Principal</span>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', margin: '8px 0' }}>
                  {unidadeEnsino}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Homologada na Rede</span>
              </div>

              {/* Card 3: Turma */}
              <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🧑‍🏫</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Classe / Turno</span>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '8px 0' }}>
                  {turma}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ensino Fundamental</span>
              </div>

              {/* Card 4: Certificação */}
              <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Formação BNCC</span>
                <strong style={{ fontSize: '15px', color: (quizSubmitted[0] && quizSubmitted[1] && quizSubmitted[2]) ? '#10b981' : '#f59e0b', margin: '8px 0' }}>
                  {(quizSubmitted[0] && quizSubmitted[1] && quizSubmitted[2]) ? '✓ Certificado Liberado' : 'Em Andamento'}
                </strong>
                <span 
                  onClick={() => {
                    setShowAdvancedMenu(true);
                    setActiveTab('training');
                  }}
                  style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}
                >
                  Ir para Formação ➔
                </span>
              </div>
            </div>

            {/* Painel de Ações Rápidas */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🛠️ Ações Rápidas do Portal
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {/* Ação 1: Gerador de Planos */}
              <div 
                className="form-card" 
                onClick={() => setActiveTab('generator')}
                style={{ cursor: 'pointer', padding: '32px', transition: 'var(--transition)', border: '1px solid var(--border-color)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white'
                  }}>
                    ⚡
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Gerador de Planos</h4>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>Criar Novo Registro</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '150%' }}>
                  Crie planos de aula pedagógicos estruturados e alinhados à BNCC oficial do município com o auxílio da nossa IA.
                </p>
              </div>

              {/* Ação 2: Formação */}
              <div 
                className="form-card" 
                onClick={() => {
                  setShowAdvancedMenu(true);
                  setActiveTab('training');
                }}
                style={{ cursor: 'pointer', padding: '32px', transition: 'var(--transition)', border: '1px solid var(--border-color)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white'
                  }}>
                    🎓
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Formação Continuada</h4>
                    <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: '700' }}>Estudar Módulos</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '150%' }}>
                  Responda os eixos de Pensamento Computacional, Cultura Digital e Mundo Digital para receber seu certificado oficial de 40 horas.
                </p>
              </div>

              {/* Ação 3: Simulador */}
              <div 
                className="form-card" 
                onClick={() => {
                  setShowAdvancedMenu(true);
                  setActiveTab('games');
                }}
                style={{ cursor: 'pointer', padding: '32px', transition: 'var(--transition)', border: '1px solid var(--border-color)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white'
                  }}>
                    🕹️
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Laboratório de Jogos</h4>
                    <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: '700' }}>Praticar Lógica</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '150%' }}>
                  Exercite a construção de algoritmos e depuração visual de maneira interativa e gamificada no simulador de blocos lógicos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 1. ABA DO GERADOR DE PLANOS */}
        {activeTab === 'planos' && (
          <div className="fade-in">
            {saldo && !saldo.ilimitado && saldo.creditos_mensais != null && (
              <div className="form-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seu uso este mês</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>{saldo.consumidos} de {saldo.creditos_mensais} créditos</div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Restam <strong>{saldo.restantes}</strong> créditos</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              {planosDisponiveis.map((p) => (
                <div key={p.slug} className="form-card" style={{ padding: '28px', position: 'relative', border: p.destaque ? '2px solid var(--primary)' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {p.destaque && (
                    <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '4px 14px', borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>⭐ Mais Popular</span>
                  )}
                  <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{p.nome}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>R$</span>
                    <span style={{ fontSize: '34px', fontWeight: '900', color: 'var(--primary)' }}>{formatBRL(p.preco_centavos)}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/mês</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <li>✅ {p.creditos_mensais == null ? 'Créditos ilimitados' : `${p.creditos_mensais} créditos por mês`}</li>
                    <li>✅ IA {p.modelo_ia === 'pro' ? 'avançada (Pro)' : 'rápida (Flash)'}</li>
                    <li>{p.permite_imagem ? '✅ Atividades com figuras' : '⛔ Sem atividades com figuras'}</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleAssinar(p.slug)}
                    disabled={assinando === p.slug}
                    style={{ marginTop: 'auto', padding: '12px', borderRadius: '10px', border: 'none', background: p.destaque ? 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' : 'var(--primary)', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: assinando === p.slug ? 'not-allowed' : 'pointer' }}
                  >
                    {assinando === p.slug ? 'Processando...' : 'Assinar este plano'}
                  </button>
                </div>
              ))}
            </div>

            <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Pagamento via Pix, boleto ou cartão pelo Asaas. Cancele quando quiser.
            </p>
          </div>
        )}

        {activeTab === 'generator' && (
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
                      <span>📋 Registro Oficial</span>
                    </button>
                    <button 
                      type="button"
                      className={`btn-canvas-tab ${canvasView === 'dinamica' ? 'active' : ''}`}
                      style={{
                        border: 'none',
                        background: canvasView === 'dinamica' ? 'var(--primary)' : 'transparent',
                        color: canvasView === 'dinamica' ? 'white' : 'var(--text-secondary)',
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
                      onClick={() => setCanvasView('dinamica')}
                    >
                      <span>🎭 Roteiro da Dinâmica</span>
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
                      <span>✏️ Folha de Atividades</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                      <span>🖨️ Imprimir {canvasView === 'professor' ? 'Plano' : 'Atividades'}</span>
                    </button>
                    <button className="btn-secondary" onClick={exportToWord}>
                      <span>📝 Baixar no Word (.doc)</span>
                    </button>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={savePlan}>
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

                {/* 1.5. VISUALIZAÇÃO DO ROTEIRO DA DINÂMICA (EXCLUSIVO DO PROFESSOR) */}
                {canvasView === 'dinamica' && (
                  <article id="dinamica-canvas-content" className="plan-canvas" style={{ padding: '40px', backgroundColor: '#fff', color: '#1e293b', border: '3px solid var(--primary)' }}>
                    
                    {/* Cabeçalho do Roteiro */}
                    <div style={{ borderBottom: '2px solid var(--primary-glow)', paddingBottom: '20px', marginBottom: '24px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        🎭 ROTEIRO DE DINÂMICA DE SALA DE AULA (PARA O PROFESSOR)
                      </span>
                      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '6px 0 0 0', color: 'var(--text-primary)' }}>
                        Como conduzir a aula: {generatedPlan.title}
                      </h2>
                      <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Este roteiro didático especial foi elaborado para guiar suas dinâmicas, falas e mediações com os estudantes em sala de aula de forma lúdica.
                      </p>
                    </div>

                    {/* Corpo do Roteiro */}
                    <div style={{ fontSize: '15px', lineHeight: '165%', whiteSpace: 'pre-line', color: '#0f172a' }}>
                      {generatedPlan.roteiroDinamica || (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🎭</span>
                          <h4>Nenhum roteiro detalhado de dinâmica gerado.</h4>
                          <p>O seu plano de aula antigo não possui este campo, mas as novas gerações online e offline trarão o roteiro de dinâmica completo!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Selo do Roteiro */}
                    <div style={{ 
                      marginTop: '40px', 
                      borderTop: '1px solid var(--border-color)', 
                      paddingTop: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: '700'
                    }}>
                      <span>PlanejaAÍ - Facilitando o engajamento lúdico em sala! 🌟</span>
                      <span>Professor: {generatedPlan.nomeProfessor}</span>
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
                                <span>PlanejaAÍ - Atividade Concluída! 🏆</span>
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
        )}

        {/* 2. ABA DE MEUS PLANOS SALVOS */}
        {activeTab === 'myplans' && (
          <div className="form-card">
            {savedPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📂</span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0' }}>Nenhum plano salvo ainda</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                  Os registros de plano de aula que você decidir salvar ficarão organizados nesta área para edição e exportação rápida.
                </p>
                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setActiveTab('generator')}>
                  <span>Gerar meu Primeiro Registro ✨</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {savedPlans.map((plan, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '24px', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-app)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>{plan.title}</h4>
                      <div className="plan-badge-container" style={{ margin: 0 }}>
                        <span className="plan-badge badge-subject">{plan.subject}</span>
                        <span className="plan-badge badge-grade">{plan.grade}</span>
                        <span className="plan-badge badge-skill">{plan.skillCode}</span>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={() => setGeneratedPlan(plan)}>
                      <span>🔍 Abrir Plano</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ABA DO PAINEL DA PREFEITURA / GOVERNANÇA MUNICIPAL */}
        {activeTab === 'prefeitura' && (
          <div className="prefeitura-dashboard">
            {/* Linha de KPIs Municipais */}
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
                <div className="kpi-change">▲ +5 formados hoje</div>
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

            {/* Gestão de Escolas da Rede */}
            <div className="schools-container">
              <div className="section-title-row">
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                  🏫 Gestão de Adoção de Escolas da Rede Municipal
                </h3>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                  {prefeituraName}
                </span>
              </div>

              <form onSubmit={handleAddSchool} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: '16px',
                marginBottom: '32px',
                backgroundColor: 'var(--bg-app)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)'
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>🏢 Nome da EMEB / Escola Municipal</label>
                  <input 
                    type="text" 
                    placeholder="Ex: EMEB DOM PEDRO II" 
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    style={{ padding: '10px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>👥 Nº total de professores</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newSchoolTeachers}
                    onChange={(e) => setNewSchoolTeachers(e.target.value)}
                    style={{ padding: '10px' }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ height: '42px', alignSelf: 'flex-end', padding: '0' }}>
                  <span>➕ Adicionar Escola</span>
                </button>
              </form>

              <div className="schools-list">
                {schools.map(school => (
                  <div key={school.id} className="school-item">
                    <div className="school-info">
                      <span className="school-name">{school.name}</span>
                      <span className="school-details">
                        {school.teachers} Professores Alocados &bull; {school.trained} Capacitados
                      </span>
                    </div>

                    <div className="school-bar-container">
                      <div className="school-bar-label">Uso do PlanejaAÍ nos planejamentos BNCC</div>
                      <div className="school-progress-outer">
                        <div className="school-progress-inner" style={{ width: `${school.adoption}%` }}></div>
                      </div>
                    </div>

                    <span className={`school-badge ${school.adoption >= 60 ? 'badge-connected' : 'badge-training'}`}>
                      {school.adoption >= 60 ? '⚡ Conectada' : '⏳ Em Transição'}
                    </span>

                    <button className="btn-remove-school" onClick={() => handleRemoveSchool(school.id)} title="Excluir Escola">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Leis Federais & Diretrizes Inclusivas */}
            <div className="form-card">
              <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
                ♿ Compliance e Acessibilidade (Diretrizes de Adaptação Escolar)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Nosso gerador de planos de aula mapeia adaptações curriculares físicas e digitais garantindo que a prefeitura cumpra integralmente as seguintes leis estaduais e municipais de proteção ao estudante:
              </p>
              
              <div className="laws-grid">
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
        )}

        {/* === NOVA ABA: CENSO E DIAGNÓSTICO DE IMPACTO === */}
        {activeTab === 'diagnostico' && (
          <div className="prefeitura-dashboard">
            {/* Se o professor ainda NÃO respondeu ao censo */}
            {!censusSubmitted ? (
              <form onSubmit={handleSubmitCensus} className="form-card fade-in">
                <h3 style={{ fontSize: '18px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '20px' }}>
                  📊 Censo de Letramento Digital - Diagnóstico Individual
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '150%' }}>
                  Prezado(a) profissional da educação, responda com sinceridade a este diagnóstico de 5 perguntas. Suas respostas alimentarão o mapa de calor e a projeção de impacto de implementação da BNCC Computacional na Secretaria de Educação de <strong>{prefeituraName}</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                  {/* Pergunta 1 */}
                  <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      <strong>1. Familiaridade Geral com Computadores:</strong> Qual é o seu nível de facilidade ao manusear arquivos, internet e softwares de produtividade (como Word, Excel ou portais educacionais)?
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Muito Básico / Fobia digital</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="q1" 
                              checked={censusAnswers.q1 === v}
                              onChange={() => handleCensusSelect('q1', v)}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{v}</span>
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Avançado / Crio conteúdos</span>
                    </div>
                  </div>

                  {/* Pergunta 2 */}
                  <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      <strong>2. Bases do Pensamento Computacional:</strong> Você conhece os 4 pilares do raciocínio lógico-computacional (Algoritmos, Decomposição, Reconhecimento de Padrões e Abstração)?
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nunca ouvi falar</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="q2" 
                              checked={censusAnswers.q2 === v}
                              onChange={() => handleCensusSelect('q2', v)}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{v}</span>
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Conheço e já aplico</span>
                    </div>
                  </div>

                  {/* Pergunta 3 */}
                  <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      <strong>3. Computação Desplugada:</strong> Já organizou dinâmicas de lógica, caminhos ou jogos sequenciais com seus alunos sem usar computadores (apenas com papel, giz ou sucatas)?
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nunca realizei</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="q3" 
                              checked={censusAnswers.q3 === v}
                              onChange={() => handleCensusSelect('q3', v)}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{v}</span>
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Organizo com frequência</span>
                    </div>
                  </div>

                  {/* Pergunta 4 */}
                  <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      <strong>4. Programação Visual em Blocos:</strong> Qual a sua familiaridade em criar pequenos jogos, narrativas ou animações utilizando softwares de blocos de encaixe (como o Scratch)?
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nenhuma familiaridade</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="q4" 
                              checked={censusAnswers.q4 === v}
                              onChange={() => handleCensusSelect('q4', v)}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{v}</span>
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Domino e crio projetos</span>
                    </div>
                  </div>

                  {/* Pergunta 5 */}
                  <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', marginBottom: '10px', color: 'var(--text-primary)' }}>
                      <strong>5. Cidadania e Leis Digitais:</strong> Você se sente capacitado(a) para orientar crianças sobre segurança de dados, privacidade (LGPD escolar) e combate ao cyberbullying?
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Não me sinto preparado</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <label key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="q5" 
                              checked={censusAnswers.q5 === v}
                              onChange={() => handleCensusSelect('q5', v)}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{v}</span>
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Totalmente seguro</span>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  <span>Submeter Respostas ao Censo Digital &amp; Calcular Impacto 📊</span>
                </button>
              </form>
            ) : (
              // Se o professor JÁ respondeu ao censo: RENDERIZAR O MUNICIPAL IMPACT DASHBOARD
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Banner de Feedback Individual */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  borderLeft: '4px solid #10b981',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      ✓ Diagnóstico Salvo com Sucesso!
                    </span>
                    <h3 style={{ margin: '4px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Perfil Calculado: <span className="text-gradient">{censusProfile}</span>
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Suas respostas individuais foram enfileiradas anonimamente no banco central da Secretaria Municipal de Educação.
                    </p>
                  </div>
                  <button className="btn-secondary" onClick={() => setCensusSubmitted(false)}>
                    <span>🔄 Refazer Diagnóstico</span>
                  </button>
                </div>

                {/* Dashboard Analítico da Prefeitura (Impact Report) */}
                <div className="schools-container">
                  <div className="section-title-row">
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                      📊 Relatório Consolidado de Letramento e Diagnóstico de Impacto Escolar
                    </h3>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>
                      {prefeituraName} &bull; Sensor de Impacto Oficial 2026
                    </span>
                  </div>

                  {/* 🚨 ALERTA CRÍTICO DE ALTO IMPACTO (DANGER ALERT BANNER) */}
                  <div className="danger-banner-alert">
                    <span className="danger-alert-icon">⚠️</span>
                    <div className="danger-alert-content">
                      <h3 className="danger-alert-title">🚨 ALERTA CRÍTICO: URGÊNCIA DE CAPACITAÇÃO</h3>
                      <p className="danger-alert-desc" style={{ fontSize: '19px', fontWeight: '800', lineHeight: '145%' }}>
                        82% dos profissionais da educação municipal em {prefeituraName} NÃO possuem letramento básico ou conhecimentos adequados para ensinar a nova BNCC Computacional!
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#fca5a5', lineHeight: '140%' }}>
                        Isso cria uma barreira curricular direta de impacto em toda a rede escolar. Sem um plano emergencial de formação, as escolas ficarão em desconformidade com as metas federais de educação digital.
                      </p>
                    </div>
                  </div>

                  {/* 📊 GRÁFICOS DE ROSCA DE ALTO IMPACTO COM CONIC GRADIENTS */}
                  <div className="glowing-gauge-row">
                    {/* Gauge 1 */}
                    <div className="gauge-chart-card">
                      <div 
                        className="circular-gauge" 
                        style={{ background: 'conic-gradient(#ef4444 0% 38%, #e2e8f0 38% 100%)' }}
                      >
                        <div className="gauge-inner">
                          <span className="gauge-value-text" style={{ color: '#ef4444' }}>38%</span>
                          <span className="gauge-status-sub" style={{ color: '#ef4444' }}>Muito Baixo</span>
                        </div>
                      </div>
                      <h4 className="gauge-label">Letramento Geral</h4>
                      <p className="gauge-subdesc">
                        Profissionais que dominam o uso regular de arquivos e informática básica escolar.
                      </p>
                    </div>

                    {/* Gauge 2 */}
                    <div className="gauge-chart-card">
                      <div 
                        className="circular-gauge" 
                        style={{ background: 'conic-gradient(#f59e0b 0% 18%, #e2e8f0 18% 100%)' }}
                      >
                        <div className="gauge-inner">
                          <span className="gauge-value-text" style={{ color: '#f59e0b' }}>18%</span>
                          <span className="gauge-status-sub" style={{ color: '#f59e0b' }}>Crítico</span>
                        </div>
                      </div>
                      <h4 className="gauge-label">Prontidão BNCC</h4>
                      <p className="gauge-subdesc">
                        Profissionais com domínio prático nos eixos de Pensamento Computacional e Programação em Blocos.
                      </p>
                    </div>

                    {/* Gauge 3 */}
                    <div className="gauge-chart-card">
                      <div 
                        className="circular-gauge" 
                        style={{ background: 'conic-gradient(#dc2626 0% 82%, #e2e8f0 82% 100%)' }}
                      >
                        <div className="gauge-inner">
                          <span className="gauge-value-text" style={{ color: '#dc2626' }}>82%</span>
                          <span className="gauge-status-sub" style={{ color: '#dc2626' }}>Déficit</span>
                        </div>
                      </div>
                      <h4 className="gauge-label">Gargalo de Adequação</h4>
                      <p className="gauge-subdesc">
                        Defasagem imediata de profissionais que necessitam de capacitação urgente de 40 horas.
                      </p>
                    </div>
                  </div>

                  {/* Mapa de Gaps por Eixo da BNCC */}
                  <h4 className="impact-large-title">
                    🎯 Mapa de Defasagens e Gaps por Eixo da BNCC Computacional
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                    {/* Eixo 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                        <span>🧠 Eixo 1: Pensamento Computacional (Lógica e Algoritmos)</span>
                        <span style={{ color: '#10b981' }}>35% de Domínio</span>
                      </div>
                      <div className="school-progress-outer" style={{ height: '12px' }}>
                        <div className="school-progress-inner" style={{ width: '35%', backgroundColor: '#10b981' }}></div>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        💡 <strong>Oportunidade de Impacto Rápido:</strong> Professores têm boa aderência a atividades desplugadas corporais, porém sentem enorme dificuldade de transição para a lógica estruturada de programação.
                      </p>
                    </div>

                    {/* Eixo 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                        <span>🌐 Eixo 2: Mundo Digital (Redes, Hardware e Sistemas)</span>
                        <span style={{ color: '#ef4444' }}>12% de Domínio</span>
                      </div>
                      <div className="school-progress-outer" style={{ height: '12px' }}>
                        <div className="school-progress-inner" style={{ width: '12%', backgroundColor: '#ef4444' }}></div>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        ⚠️ <strong>Gargalo de Infraestrutura Lógica:</strong> Quase nenhum pedagogo ou regente compreende a arquitetura de processamento de computadores ou roteamento físico de internet das escolas.
                      </p>
                    </div>

                    {/* Eixo 3 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                        <span>🛡️ Eixo 3: Cultura Digital (Segurança cibernética e LGPD)</span>
                        <span style={{ color: '#f59e0b' }}>22% de Domínio</span>
                      </div>
                      <div className="school-progress-outer" style={{ height: '12px' }}>
                        <div className="school-progress-inner" style={{ width: '22%', backgroundColor: '#f59e0b' }}></div>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        ⚠️ <strong>Risco de Privacidade:</strong> Altíssima urgência de capacitação em ética de compartilhamento de fotos, controle de privacidade (LGPD Escolar) e combate ativo a cyberbullying.
                      </p>
                    </div>
                  </div>

                  {/* Ações Estruturantes Recomendadas para a Prefeitura */}
                  <div style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px',
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
                        <strong>Adoção Emergencial do PlanejaAÍ:</strong> Utilizar o banco com as 103 habilidades computacionais mescladas e o gerador de planos por inteligência artificial para que os professores consigam dar aulas de qualidade imediatamente, sem depender de criar apostilas próprias do zero.
                      </li>
                    </ol>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                  <button className="btn-secondary" style={{ width: 'auto', padding: '14px 28px', fontSize: '15px' }} onClick={() => window.print()}>
                    <span>🖨️ Exportar Diagnóstico de Impacto para a SME (PDF / Impressão)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ABA DA FORMAÇÃO PEDAGÓGICA (CURSOS & CERTIFICADOS) */}
        {activeTab === 'training' && (
          <div className="courses-container">
            {/* Certificação Alerta */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#b45309' }}>
                  🏆 Certificado de Instrutor Oficial BNCC Computacional
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Conclua com sucesso os 3 miniquizes avaliativos dos módulos de capacitação abaixo para emitir o seu Certificado de Capacitação Docente de 40 Horas!
                </p>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', background: areAllQuizzesPassed() ? 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' : '#cbd5e1', cursor: areAllQuizzesPassed() ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  if (areAllQuizzesPassed()) {
                    setShowCertificate(true);
                  } else {
                    alert('Por favor, conclua os 3 quizes com 100% de acertos para desbloquear o seu Certificado!');
                  }
                }}
              >
                <span>{areAllQuizzesPassed() ? '🎓 Emitir Meu Certificado ✨' : '🔒 Certificado Bloqueado'}</span>
              </button>
            </div>

            {/* Módulos de Formação */}
            <div className="modules-grid">
              {trainingQuizzes.map((quiz, moduleIdx) => (
                <div key={moduleIdx} className="module-card">
                  <div className="module-header bg-gradient-premium" style={{
                    background: moduleIdx === 0 ? 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' :
                                moduleIdx === 1 ? 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' :
                                'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}>
                    <span className="module-tag">Módulo 0{moduleIdx + 1}</span>
                    <h4>{moduleIdx === 0 ? 'Pensamento Computacional' : moduleIdx === 1 ? 'Mundo Digital' : 'Cultura Digital'}</h4>
                  </div>

                  <div className="module-body">
                    <div>
                      <p className="module-desc">
                        {moduleIdx === 0 ? 'Aprenda a aplicar algoritmos, decomposição, reconhecimento de padrões e abstração de forma desplugada nas rotinas regulares escolares.' :
                         moduleIdx === 1 ? 'Explore como computadores interpretam instruções básicas de máquina, hardware, software, redes de comunicação e representações de dados.' :
                         'Ensine a importância do uso seguro, ético e responsável de dados, privacidade cibernética e cidadania digital para crianças da rede pública.'}
                      </p>
                      
                      <ul className="module-bullets" style={{ marginTop: '16px' }}>
                        <li>Carga horária estimada: 15h</li>
                        <li>Alinhado com diretrizes do MEC</li>
                        <li>Atividades desplugadas práticas</li>
                      </ul>
                    </div>

                    {/* Quiz do Módulo */}
                    <div className="quiz-box">
                      <div className="quiz-status-bar">
                        <span>Avaliador de Eixo</span>
                        <span style={{ color: quizResults[moduleIdx] ? '#10b981' : quizResults[moduleIdx] === false ? '#ef4444' : 'inherit' }}>
                          {quizResults[moduleIdx] ? '✓ Aprovado' : quizResults[moduleIdx] === false ? '❌ Tente Novamente' : '⏳ Pendente'}
                        </span>
                      </div>
                      
                      <div className="quiz-question">{quiz.question}</div>
                      
                      <div className="quiz-options">
                        {quiz.options.map((opt, optIdx) => {
                          let optClass = "quiz-option-btn";
                          if (quizAnswers[moduleIdx] === optIdx) optClass += " selected";
                          if (quizSubmitted[moduleIdx]) {
                            if (optIdx === quiz.correctIndex) optClass += " correct";
                            else if (quizAnswers[moduleIdx] === optIdx) optClass += " incorrect";
                          }
                          return (
                            <button 
                              key={optIdx} 
                              className={optClass}
                              onClick={() => handleQuizSelect(moduleIdx, optIdx)}
                              disabled={quizSubmitted[moduleIdx]}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {!quizSubmitted[moduleIdx] ? (
                        <button 
                          className="btn-secondary" 
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => handleQuizSubmit(moduleIdx)}
                        >
                          Enviar Resposta
                        </button>
                      ) : (
                        <div style={{ fontSize: '11px', lineHeight: '140%', color: 'var(--text-secondary)' }}>
                          <strong>Explicação:</strong> {quiz.explanation}
                          {quizResults[moduleIdx] === false && (
                            <button 
                              className="btn-secondary" 
                              style={{ width: '100%', marginTop: '10px', justifyContent: 'center', fontSize: '10px', padding: '6px' }}
                              onClick={() => {
                                setQuizSubmitted({ ...quizSubmitted, [moduleIdx]: false });
                                setQuizAnswers({ ...quizAnswers, [moduleIdx]: null });
                                setQuizResults({ ...quizResults, [moduleIdx]: null });
                              }}
                            >
                              Recomeçar Quiz
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL DE EMISSÃO DO CERTIFICADO */}
            {showCertificate && (
              <div className="certificate-modal-overlay no-print" onClick={() => setShowCertificate(false)}>
                <div className="certificate-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="certificate-diploma" id="official-diploma-print">
                    {/* Cantos decorativos */}
                    <div className="cert-border-corner cert-corner-tl"></div>
                    <div className="cert-border-corner cert-corner-tr"></div>
                    <div className="cert-border-corner cert-corner-bl"></div>
                    <div className="cert-border-corner cert-corner-br"></div>

                    <div className="cert-crest">🏛️</div>
                    <div className="cert-municipality">Secretaria Municipal de Educação</div>
                    <div className="cert-sub">{prefeituraName}</div>
                    
                    <div className="cert-main-title">Certificado de Formação</div>
                    
                    <p className="cert-body-text">
                      Certificamos, para os devidos fins de progressão funcional e capacitação didática, que o(a) docente
                    </p>
                    
                    <div className="cert-recipient">PROF. {nomeProfessor.toUpperCase()}</div>
                    
                    <p className="cert-body-text" style={{ maxWidth: '680px', marginTop: '12px' }}>
                      concluiu com êxito a <strong>Formação Continuada em Raciocínio Algorítmico, Computação e Cidadania Digital Aplicada</strong>, estruturada em conformidade com as diretrizes da nova <strong>BNCC Computacional</strong> no Ensino Fundamental, totalizando carga horária de <strong>40 horas letivas</strong>.
                    </p>

                    <div className="cert-signatures">
                      <div className="cert-sign-line">
                        Coordenação Pedagógica Municipal
                        <div className="cert-sign-title">PlanejaAÍ &amp; Gestão Pública</div>
                      </div>
                      <div className="cert-sign-line">
                        Secretário(a) Municipal de Educação
                        <div className="cert-sign-title">Diretoria de Formação Docente</div>
                      </div>
                    </div>

                    {/* Selo decorativo */}
                    <div className="cert-seal-ribbon">
                      <div className="cert-ribbon-1"></div>
                      <div className="cert-ribbon-2"></div>
                    </div>
                    <div className="cert-seal">
                      HOMOLOGADO<br/>MEC &amp; BNCC<br/>2026
                    </div>
                  </div>

                  <div className="cert-footer-actions">
                    <button className="btn-secondary" onClick={() => setShowCertificate(false)}>
                      <span>Fechar Janela</span>
                    </button>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={() => window.print()}>
                      <span>🖨️ Imprimir Diploma</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. ABA DOS JOGOS E SIMULADORES PEDAGÓGICOS */}
        {activeTab === 'games' && (
          <div className="form-card">
            {/* Header Geral de Jogos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0' }}>
                  🕹️ Laboratório de Jogos e Raciocínio Computacional
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                  Exercite algoritmos físicos e depuração de loops de forma 100% interativa com os estudantes.
                </p>
              </div>
              {gameStatus !== 'idle' && (
                <button className="btn-secondary" onClick={resetGame}>
                  <span>🔄 Reiniciar Tabuleiro</span>
                </button>
              )}
            </div>

            {/* TABULEIRO DE JOGO INTERATIVO: BLOCOS MÁGICOS */}
            <div className="game-arena">
              {/* Lado Esquerdo: O Tabuleiro de Grid 5x5 */}
              <div className="game-board-card">
                <div style={{ alignSelf: 'flex-start' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800' }}>Labirinto do Pensamento</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Instrução EF01CO03: Crie rotas para o robô 🤖 chegar na Estrela 🌟</span>
                </div>

                <div className="game-grid">
                  {gameGridMap.map((rowArr, rowIdx) => 
                    rowArr.map((cellType, colIdx) => {
                      const isRobot = gameRobotPos[0] === colIdx && gameRobotPos[1] === rowIdx;
                      
                      let cellClass = "game-cell";
                      if (cellType === 0) cellClass += " cell-path"; // caminho normal
                      if (isRobot) cellClass += " cell-active";
                      if (gameStatus === 'success' && cellType === 2) cellClass += " cell-success";
                      if (gameStatus === 'fail' && isRobot) cellClass += " cell-fail";

                      // Direção do Robô emoji rotacionado
                      let rotateDeg = '0deg';
                      if (gameRobotDir === 'down') rotateDeg = '90deg';
                      else if (gameRobotDir === 'left') rotateDeg = '180deg';
                      else if (gameRobotDir === 'up') rotateDeg = '270deg';

                      return (
                        <div key={`${rowIdx}-${colIdx}`} className={cellClass}>
                          {isRobot ? (
                            <span 
                              className="game-avatar-icon" 
                              style={{ transform: `rotate(${rotateDeg})`, transition: 'transform 0.2s ease-in-out' }}
                            >
                              🤖
                            </span>
                          ) : cellType === 1 ? (
                            <span>🔥</span>
                          ) : cellType === 2 ? (
                            <span>🌟</span>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{
                  backgroundColor: gameStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : gameStatus === 'fail' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-app)',
                  border: `1px solid ${gameStatus === 'success' ? '#10b981' : gameStatus === 'fail' ? '#ef4444' : 'var(--border-color)'}`,
                  color: gameStatus === 'success' ? '#10b981' : gameStatus === 'fail' ? '#ef4444' : 'var(--text-primary)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: '700',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {gameMessage}
                </div>
              </div>

              {/* Lado Direito: Paleta de Blocos e Enfileiramento de Algoritmo */}
              <div className="game-controls-card">
                {/* Paleta de Comandos */}
                <div className="blocks-palette">
                  <h4>🧩 Paleta de Blocos de Ação</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '4px 0 12px 0' }}>
                    Clique nos blocos para inseri-los no algoritmo em sequência de execução física.
                  </p>
                  
                  <div className="blocks-grid">
                    <button 
                      className="code-block-btn btn-move" 
                      onClick={() => addGameCommand('move')}
                      disabled={gameIsRunning}
                    >
                      <span>➡️ Mover p/ Frente</span>
                    </button>
                    <button 
                      className="code-block-btn btn-right" 
                      onClick={() => addGameCommand('turn-right')}
                      disabled={gameIsRunning}
                    >
                      <span>↪️ Girar 90º Dir.</span>
                    </button>
                    <button 
                      className="code-block-btn btn-left" 
                      onClick={() => addGameCommand('turn-left')}
                      disabled={gameIsRunning}
                    >
                      <span>↩️ Girar 90º Esq.</span>
                    </button>
                  </div>
                </div>

                {/* Queue / Fila de Execução */}
                <div className="execution-queue-box">
                  <div className="execution-queue-header">
                    <h4>📋 Algoritmo Escrito ({gameCommands.length}/10 passos)</h4>
                    {gameCommands.length > 0 && (
                      <button className="btn-clear-queue" onClick={clearGameQueue} disabled={gameIsRunning}>
                        Limpar Código
                      </button>
                    )}
                  </div>

                  <div className="execution-queue-list">
                    {gameCommands.length === 0 ? (
                      <span className="queue-empty-text">Seu algoritmo está vazio. Insira comandos acima!</span>
                    ) : (
                      gameCommands.map((cmd, idx) => (
                        <div 
                          key={idx} 
                          className={`queue-block-badge ${gameActiveStep === idx ? 'active-step' : ''}`}
                        >
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                          <span>
                            {cmd === 'move' ? '➡️ MOVER' : cmd === 'turn-right' ? '↪️ GIRO_DIR' : '↩️ GIRO_ESQ'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Botões de Ação Final */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ flexGrow: 2 }}
                    onClick={runGameSimulation}
                    disabled={gameIsRunning || gameCommands.length === 0}
                  >
                    <span>⚡ Executar Algoritmo</span>
                  </button>
                  
                  <button 
                    className="btn-secondary" 
                    onClick={resetGame}
                    disabled={gameIsRunning}
                  >
                    <span>Apagar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Biblioteca Estática de Outros Jogos */}
            <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '32px 0 16px 0', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              📚 Outros Simuladores BNCC Computacional (Módulos de Apoio)
            </h4>
            <div className="games-grid">
              <article className="game-card" style={{ opacity: 0.8 }}>
                <div className="game-banner bg-gradient-premium">
                  <span>🌉</span>
                  <span className="game-badge">1º ao 3º Ano</span>
                </div>
                <div className="game-details">
                  <div>
                    <h4>O Construtor de Pontes 🌉</h4>
                    <p>Desenvolve lógica de sequenciamento e resistência estrutural através da criação de rotas seguras desplugadas.</p>
                  </div>
                  <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled>
                    <span>🔒 Conectado com o Scratch</span>
                  </button>
                </div>
              </article>

              <article className="game-card" style={{ opacity: 0.8 }}>
                <div className="game-banner bg-gradient-accent">
                  <span>👾</span>
                  <span className="game-badge">3º ao 5º Ano</span>
                </div>
                <div className="game-details">
                  <div>
                    <h4>Detetive dos Bugs 👾</h4>
                    <p>Estimula a depuração de código (debugging). As crianças buscam comandos incorretos para consertar o robô.</p>
                  </div>
                  <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled>
                    <span>🔒 Conectado com o Scratch</span>
                  </button>
                </div>
              </article>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LessonPlanForm;
