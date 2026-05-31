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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Login local de teste — bypass Supabase (suporta senhas >= 6 caracteres que começam com admin ou dmin, ex: admin123, dmin12)
    if (!isSignUp && email === 'admin@admin' && (password.startsWith('admin') || password.startsWith('dmin'))) {
      const mockUser = { id: 'admin-test-local', email: 'admin@admin', role: 'admin' };
      const mockSession = { user: mockUser, access_token: 'mock-local-token', __isLocal: true };
      onAuthSuccess(mockSession, mockUser);
      return;
    }

    try {
      if (isSignUp) {
        // Fluxo de Cadastro
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });

        if (error) throw error;
        
        if (data.session) {
          setSuccessMsg('Conta criada com sucesso! Redirecionando...');
          setTimeout(() => {
            onAuthSuccess(data.session, data.user);
          }, 1000);
        } else {
          setSuccessMsg('✓ Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, verifique a sua caixa de entrada para ativar a conta e depois faça o login.');
          setLoading(false);
          // Voltar para a aba de login após 7 segundos para que o usuário faça o login
          setTimeout(() => {
            setIsSignUp(false);
            setSuccessMsg('');
            setEmail('');
            setPassword('');
          }, 7000);
        }
      } else {
        // Fluxo de Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

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



  return (
    <div className="auth-wrapper" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 20%, rgb(18, 16, 32) 0%, rgb(9, 8, 16) 90%)',
      padding: '20px',
      color: '#ffffff',
      fontFamily: '"Plus Jakarta Sans", "Outfit", system-ui, sans-serif'
    }}>
      {/* Container Principal */}
      <div className="auth-card" style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'rgba(25, 22, 44, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxSizing: 'border-box'
      }}>
        {/* Logo / Nome do SaaS */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.png" 
            alt="PlanejaAÍ Logo" 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
              marginBottom: '16px',
              objectFit: 'cover'
            }}
          />
          <h2 style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            Planeja<span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '900'
            }}>AÍ</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px', lineHeight: '140%', marginBottom: '12px' }}>
            Plataforma Inteligente de Planejamento de Aula Oficial BNCC
          </p>
          <span style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: '800',
            color: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            padding: '6px 12px',
            borderRadius: '50px',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🟢 SISTEMA ONLINE
          </span>
        </div>

        {/* Tabs de Seleção */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 12, 26, 0.6)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.04)'
        }}>
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: !isSignUp ? '#6366f1' : 'transparent',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Acessar Conta
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: isSignUp ? '#6366f1' : 'transparent',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cadastrar-se
          </button>
        </div>

        {/* Mensagens de Alerta */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '4px solid #ef4444',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '20px'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderLeft: '4px solid #10b981',
            color: '#a7f3d0',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '20px'
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Nome Completo (Apenas Cadastro) */}
          {isSignUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Nome Completo</label>
              <input 
                type="text"
                placeholder="Ex: Prof. Henrique Zangerolame"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(15, 12, 26, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          )}

          {/* E-mail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Endereço de E-mail</label>
            <input 
              type="email"
              placeholder="Ex: professor@escola.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(15, 12, 26, 0.5)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Senha de Acesso</label>
            <input 
              type="password"
              placeholder="Minimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(15, 12, 26, 0.5)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {/* Função / Papel (Apenas Cadastro) */}
          {isSignUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Papel / Função Profissional</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(15, 12, 26, 0.9)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="teacher">🧑‍🏫 Professor Regente / Auxiliar</option>
                <option value="coordinator">🗂️ Coordenador / Pedagogo Escolar</option>
              </select>
            </div>
          )}

          {/* Botão de Enviar */}
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
              marginTop: '10px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, borderWidth: '2px' }}></span>
            ) : (
              <span>{isSignUp ? 'Criar Minha Conta Pedagógica' : 'Entrar no Painel do PlanejaAÍ'}</span>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};

export default Auth;
