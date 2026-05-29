import { useState } from 'react';

export const TrainingTab = ({ nomeProfessor }) => {
  const [quizAnswers, setQuizAnswers] = useState({ 0: null, 1: null, 2: null });
  const [quizSubmitted, setQuizSubmitted] = useState({ 0: false, 1: false, 2: false });
  const [quizResults, setQuizResults] = useState({ 0: null, 1: null, 2: null });
  const [showCertificate, setShowCertificate] = useState(false);
  const prefeituraName = 'CACHOEIRO DE ITAPEMIRIM - ES';

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
      question: "No eixo Mundo Digital da BNCC, ao ensinar sobre Artefatos Tecnológicos, qual o foco principal nos Anos Iniciais?",
      options: [
        "A) Ensinar a desmontar e soldar placas de circuito impresso.",
        "B) Focar unicamente em aulas de digitação rápida no teclado.",
        "C) Compreender a diferença entre objetos digitais e analógicos e como eles impactam e facilitam atividades do cotidiano.",
        "D) Proibir completamente o uso de tablets na escola."
      ],
      correctIndex: 2,
      explanation: "O foco inicial é o letramento digital básico: entender o que é o digital e o papel de diferentes artefatos no dia a dia da criança."
    },
    {
      title: "Quiz: Cultura Digital",
      question: "No Eixo de Cultura Digital, qual atitude o professor deve incentivar nas crianças desde cedo?",
      options: [
        "A) Compartilhar senhas e dados pessoais livremente com qualquer pessoa na internet.",
        "B) Consumir conteúdos online sem critério e acreditar em todas as notícias recebidas.",
        "C) Entender as normas de conduta, empatia, segurança da informação (proteção de dados) e respeito em ambientes virtuais.",
        "D) Evitar qualquer debate sobre internet, deixando isso apenas para os pais em casa."
      ],
      correctIndex: 2,
      explanation: "Cidadania digital começa cedo. A escola deve fomentar empatia virtual e segurança no uso da internet."
    }
  ];

  const handleQuizSelect = (moduleIdx, optIdx) => {
    if (quizSubmitted[moduleIdx]) return;
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

  return (
    <div className="form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0' }}>
            🎓 Formação Continuada em BNCC Computacional
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Responda aos módulos rápidos para destravar seu certificado da Secretaria de Educação.
          </p>
        </div>
        {areAllQuizzesPassed() && (
          <button className="btn-primary pulse-animation" onClick={() => setShowCertificate(true)}>
            <span>🏆 Emitir Certificado</span>
          </button>
        )}
      </div>

      <div className="quizzes-container">
        {trainingQuizzes.map((quiz, moduleIdx) => (
          <div key={moduleIdx} className="quiz-module-card">
            <div className="quiz-header">
              <span className="quiz-title">{quiz.title}</span>
              {quizSubmitted[moduleIdx] && (
                <span className={`quiz-status-badge ${quizResults[moduleIdx] ? 'status-pass' : 'status-fail'}`}>
                  {quizResults[moduleIdx] ? '✅ Aprovado' : '❌ Tente Novamente'}
                </span>
              )}
            </div>

            <div className="quiz-content">
              <p className="quiz-question">{quiz.question}</p>

              <div className="quiz-options">
                {quiz.options.map((opt, optIdx) => {
                  let optClass = "quiz-opt-btn";
                  if (quizAnswers[moduleIdx] === optIdx) optClass += " selected";

                  if (quizSubmitted[moduleIdx]) {
                    if (optIdx === quiz.correctIndex) optClass += " correct-ans";
                    else if (quizAnswers[moduleIdx] === optIdx) optClass += " wrong-ans";
                  }

                  return (
                    <button
                      key={optIdx}
                      className={optClass}
                      onClick={() => handleQuizSelect(moduleIdx, optIdx)}
                      disabled={quizSubmitted[moduleIdx]}
                    >
                      <div className="opt-radio">
                        {quizAnswers[moduleIdx] === optIdx && <div className="opt-radio-fill"></div>}
                      </div>
                      <span className="opt-text">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Resultado do Módulo */}
              <div style={{ marginTop: '16px' }}>
                {!quizSubmitted[moduleIdx] ? (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleQuizSubmit(moduleIdx)}
                  >
                    Confirmar Resposta
                  </button>
                ) : (
                  <div className={`quiz-feedback-box ${quizResults[moduleIdx] ? 'feedback-success' : 'feedback-error'}`}>
                    <div style={{ fontWeight: '800', marginBottom: '8px' }}>
                      {quizResults[moduleIdx] ? '🎉 Resposta Exata!' : '💡 Opa, não foi bem isso!'}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '150%' }}>
                      {quiz.explanation}
                    </p>

                    {!quizResults[moduleIdx] && (
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

              <div className="cert-header">
                <h2>CERTIFICADO DE CAPACITAÇÃO</h2>
                <div className="cert-subtitle">FORMAÇÃO CONTINUADA EM PENSAMENTO COMPUTACIONAL E BNCC</div>
              </div>

              <div className="cert-body">
                <p>Certificamos, para os devidos fins pedagógicos e de progressão de carreira, que</p>
                <h3 className="cert-name">{nomeProfessor.toUpperCase() || 'PROFESSOR(A)'}</h3>
                <p>
                  concluiu com êxito a trilha de letramento digital estruturada no <strong>EduPlan SaaS</strong>,
                  demonstrando proficiência prática e teórica nos três eixos computacionais da Base Nacional Comum Curricular (Cultura Digital, Mundo Digital e Pensamento Computacional).
                </p>
              </div>

              <div className="cert-footer">
                <div className="cert-signature-block">
                  <div className="cert-signature-line"></div>
                  <div className="cert-signature-title">Secretaria Municipal de Educação</div>
                  <div className="cert-signature-subtitle">{prefeituraName}</div>
                </div>

                <div className="cert-stamp">
                  <div className="cert-stamp-inner">
                    <span>SELO</span>
                    <br/>
                    <strong>BNCC</strong>
                    <br/>
                    <span>SaaS</span>
                  </div>
                </div>

                <div className="cert-signature-block">
                  <div className="cert-signature-line"></div>
                  <div className="cert-signature-title">Diretoria de Tecnologia Educacional</div>
                  <div className="cert-signature-subtitle">Validação Automática IA</div>
                </div>
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
  );
};
