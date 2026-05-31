import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const Auth = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('teacher');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [consent, setConsent] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // null | 'terms' | 'privacy'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Login local de teste — bypass Supabase
    if (!isSignUp && email === 'admin@admin' && (password.startsWith('admin') || password.startsWith('dmin'))) {
      const mockUser = { id: 'admin-test-local', email: 'admin@admin', role: 'admin' };
      const mockSession = { user: mockUser, access_token: 'mock-local-token', __isLocal: true };
      onAuthSuccess(mockSession, mockUser);
      return;
    }

    if (isSignUp && !consent) {
      setErrorMsg('É necessário aceitar os Termos de Uso e a Política de Privacidade para criar a conta.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role, lgpd_consent: true, lgpd_consent_at: new Date().toISOString() } },
        });
        if (error) throw error;
        if (data.session) {
          setSuccessMsg('Conta criada com sucesso! Redirecionando...');
          setTimeout(() => onAuthSuccess(data.session, data.user), 1000);
        } else {
          setSuccessMsg('✓ Conta criada! Verifique seu e-mail para ativar a conta e depois faça o login.');
          setLoading(false);
          setTimeout(() => {
            setIsSignUp(false);
            setSuccessMsg('');
            setEmail('');
            setPassword('');
          }, 7000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess(data.session, data.user);
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      setErrorMsg(error.message || 'Ocorreu um erro ao processar sua requisição.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (signUp) => {
    setIsSignUp(signUp);
    setErrorMsg('');
    setSuccessMsg('');
    setConsent(false);
  };

  return (
    <div className="auth-layout" style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#060511',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      color: '#fff',
    }}>
      {/* ── LEFT HERO PANEL ── */}
      <div className="auth-hero" style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0e0c1e 0%, #130e2b 50%, #0a0d1f 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
      }}>
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '480px', height: '480px', background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-40px', width: '360px', height: '360px', background: 'radial-gradient(circle,rgba(217,70,239,0.14) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '60%', width: '260px', height: '260px', background: 'radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Decorative dots */}
        <div style={{ position: 'absolute', top: '15%', right: '12%', width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: '28%', right: '22%', width: '4px', height: '4px', borderRadius: '50%', background: '#a855f7', opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: '68%', right: '8%', width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4', opacity: 0.4 }} />
        <div style={{ position: 'absolute', bottom: '22%', left: '18%', width: '5px', height: '5px', borderRadius: '50%', background: '#d946ef', opacity: 0.5 }} />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <img src="/logo.png" alt="PlanejaAÍ" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }} />
            <span style={{ fontFamily: '"Outfit", sans-serif', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Planeja<span style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AÍ</span>
            </span>
          </div>

          <h1 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '44px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '20px', margin: '0 0 20px 0' }}>
            Planejamento de<br />
            <span style={{ background: 'linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Aulas com IA
            </span><br />
            alinhado à BNCC
          </h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '420px', margin: 0 }}>
            Gere planos de aula personalizados, atividades pedagógicas e avaliações em segundos. Plataforma oficial alinhada às diretrizes da Base Nacional Comum Curricular.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: '✨', title: 'IA Pedagógica Avançada', desc: 'Gemini + GPT-4 calibrados para educação' },
            { icon: '📚', title: 'BNCC Computacional Integrada', desc: 'Competências digitais + pensamento computacional' },
            { icon: '🖨️', title: 'Exportação Oficial em PDF', desc: 'Formato paisagem pronto para entrega à coordenação' },
          ].map((f) => (
            <div key={f.title} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '13px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              width: 'fit-content',
            }}>
              <span style={{ fontSize: '20px' }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{f.title}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex' }}>
            {['P', 'M', 'A'].map((letter, i) => (
              <div key={letter} style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: i === 0 ? 'linear-gradient(135deg,#6366f1,#a855f7)' : i === 1 ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : 'linear-gradient(135deg,#d946ef,#f97316)',
                border: '2px solid #060511',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                marginRight: i < 2 ? '-8px' : '0',
                zIndex: 3 - i,
              }}>{letter}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>+1.200 professores ativos</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>em municípios do ES, SP, RJ e MG</div>
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTH PANEL ── */}
      <div className="auth-form-panel" style={{
        width: '520px',
        flexShrink: 0,
        background: '#0c0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 44px',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
              padding: '5px 12px', borderRadius: '50px', marginBottom: '20px',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Sistema Online</span>
            </div>
            <h2 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 8px 0' }}>
              {isSignUp ? 'Crie sua conta gratuita' : 'Bem-vindo de volta'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              {isSignUp ? 'Comece a planejar aulas com IA hoje mesmo.' : 'Entre na sua conta para continuar planejando.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px',
            padding: '4px', marginBottom: '28px',
          }}>
            {[['Acessar Conta', false], ['Cadastrar-se', true]].map(([label, signUp]) => (
              <button
                key={label}
                type="button"
                onClick={() => switchTab(signUp)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: isSignUp === signUp ? '#6366f1' : 'transparent',
                  color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid #ef4444',
              color: '#fca5a5', padding: '12px 16px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, marginBottom: '20px',
            }}>⚠️ {errorMsg}</div>
          )}
          {successMsg && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', borderLeft: '4px solid #10b981',
              color: '#a7f3d0', padding: '12px 16px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, marginBottom: '20px',
            }}>✓ {successMsg}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Nome (sign-up only) */}
            {isSignUp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Henrique Zangerolame"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    padding: '13px 16px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px',
                  }}
                />
              </div>
            )}

            {/* E-mail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Endereço de E-mail</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#475569', pointerEvents: 'none' }}>✉</span>
                <input
                  type="email"
                  placeholder="professor@escola.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    padding: '13px 16px 13px 42px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px',
                    width: '100%', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Senha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Senha de Acesso</label>
                {!isSignUp && (
                  <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}>Esqueci a senha</span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#475569', pointerEvents: 'none' }}>🔒</span>
                <input
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    padding: '13px 16px 13px 42px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px',
                    width: '100%', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Role (sign-up only) */}
            {isSignUp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Papel / Função Profissional</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    padding: '13px 16px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,12,26,0.9)', color: '#fff', fontSize: '14px',
                    width: '100%', boxSizing: 'border-box', cursor: 'pointer',
                  }}
                >
                  <option value="teacher">🧑‍🏫 Professor Regente / Auxiliar</option>
                  <option value="coordinator">🗂️ Coordenador / Pedagogo Escolar</option>
                </select>
              </div>
            )}

            {/* Consentimento LGPD (sign-up only) */}
            {isSignUp && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#6366f1', flexShrink: 0, cursor: 'pointer' }}
                />
                <span>
                  Li e concordo com os{' '}
                  <span onClick={(e) => { e.preventDefault(); setLegalModal('terms'); }} style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Termos de Uso</span>{' '}
                  e a{' '}
                  <span onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }} style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>Política de Privacidade</span>, e autorizo o tratamento dos meus dados conforme a LGPD.
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '15px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
                color: '#fff', fontWeight: 800, fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 30px rgba(99,102,241,0.35)',
                marginTop: '4px', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                letterSpacing: '0.2px',
              }}
            >
              {loading
                ? <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, borderWidth: '2px' }} />
                : <><span>{isSignUp ? 'Criar Minha Conta Pedagógica' : 'Entrar no Painel do PlanejaAÍ'}</span><span style={{ fontSize: '18px' }}>→</span></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>ou continue com</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Google SSO (visual) */}
          <button
            type="button"
            style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#e2e8f0',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '16px' }}>G</span>
            <span>Entrar com Google Workspace</span>
          </button>

          {/* Footer note */}
          <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', marginTop: '24px', lineHeight: 1.6 }}>
            Ao entrar, você concorda com os nossos<br />
            <span onClick={() => setLegalModal('terms')} style={{ color: '#6366f1', cursor: 'pointer' }}>Termos de Uso</span> e <span onClick={() => setLegalModal('privacy')} style={{ color: '#6366f1', cursor: 'pointer' }}>Política de Privacidade</span>
          </p>

        </div>
      </div>

      {/* ── MODAL LEGAL (Termos / Política) ── */}
      {legalModal && (
        <div
          onClick={() => setLegalModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(3,2,10,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '560px', maxHeight: '82vh', overflowY: 'auto',
              background: '#0e0c1e', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px', padding: '32px 30px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '20px', fontWeight: 800, margin: 0 }}>
                {legalModal === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
              >✕</button>
            </div>

            <div style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.7 }}>
              {legalModal === 'terms' ? (
                <>
                  <p><strong>1. Objeto.</strong> O PlanejaAÍ é uma plataforma de geração de planos de aula e atividades pedagógicas alinhados à BNCC, com auxílio de inteligência artificial.</p>
                  <p><strong>2. Conta.</strong> O usuário é responsável pela veracidade dos dados informados e pela guarda das suas credenciais de acesso.</p>
                  <p><strong>3. Uso da IA.</strong> O conteúdo gerado é uma sugestão pedagógica e deve ser revisado pelo professor antes de qualquer uso oficial. O PlanejaAÍ não substitui o julgamento profissional do educador.</p>
                  <p><strong>4. Créditos e planos.</strong> O acesso às funcionalidades pode ser limitado por créditos mensais conforme o plano contratado. Créditos não utilizados não acumulam para o mês seguinte, salvo indicação em contrário.</p>
                  <p><strong>5. Pagamentos.</strong> As assinaturas são processadas via gateway de pagamento (Asaas). O cancelamento encerra a renovação, mantendo o acesso até o fim do ciclo vigente.</p>
                  <p><strong>6. Propriedade.</strong> Os planos gerados pertencem ao usuário. A tecnologia e a marca PlanejaAÍ permanecem de propriedade da plataforma.</p>
                </>
              ) : (
                <>
                  <p>Esta Política descreve como o PlanejaAÍ trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).</p>
                  <p><strong>Dados coletados.</strong> Nome, e-mail, função profissional e os conteúdos que você gera na plataforma.</p>
                  <p><strong>Finalidade.</strong> Autenticação, geração de planos de aula, controle de créditos/assinatura e melhoria do serviço.</p>
                  <p><strong>Base legal.</strong> Execução do contrato e consentimento, fornecido no momento do cadastro.</p>
                  <p><strong>Compartilhamento.</strong> Dados podem ser processados por provedores de infraestrutura (Supabase), pagamento (Asaas) e IA (Google Gemini), estritamente para a operação do serviço.</p>
                  <p><strong>Seus direitos.</strong> Você pode solicitar acesso, correção ou <strong>exclusão</strong> dos seus dados a qualquer momento pelo e-mail de suporte. A exclusão da conta remove os dados pessoais associados.</p>
                  <p><strong>Retenção.</strong> Os dados são mantidos enquanto a conta estiver ativa ou conforme exigência legal.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLegalModal(null)}
              style={{
                marginTop: '24px', width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Entendi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
