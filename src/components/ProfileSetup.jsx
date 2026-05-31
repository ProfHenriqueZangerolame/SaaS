import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const ProfileSetup = ({ user, profile, onProfileComplete }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [city, setCity] = useState(profile?.city || 'Cachoeiro de Itapemirim');
  const [state, setState] = useState(profile?.state || 'ES');
  const [teachesMultipleSchools, setTeachesMultipleSchools] = useState(profile?.teaches_multiple_schools || false);
  const [school1, setSchool1] = useState(profile?.school_1 || 'EMEBTI "JULIETA DEPS TALLON"');
  const [school2, setSchool2] = useState(profile?.school_2 || '');
  const [turma, setTurma] = useState(profile?.turma || '1º Ano A');
  const [horarioAula, setHorarioAula] = useState(profile?.horario_aula || 'Vespertino');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const profileData = {
      full_name: fullName,
      city,
      state,
      teaches_multiple_schools: teachesMultipleSchools,
      school_1: school1,
      school_2: teachesMultipleSchools ? school2 : '',
      turma,
      horario_aula: horarioAula,
      updated_at: new Date().toISOString()
    };
    // Se for o login local de teste (bypass Supabase)
    if (user?.id === 'admin-test-local') {
      onProfileComplete({ ...profile, ...profileData });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      onProfileComplete({ ...profile, ...profileData });
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      if (err.message && err.message.includes("profiles' in the schema cache")) {
        setErrorMsg('⚠️ A tabela "profiles" ainda não foi criada no banco de dados do seu Supabase! Por favor, acesse o painel do Supabase, vá em "SQL Editor", cole e execute o script SQL que está no arquivo walkthrough.md deste projeto para criá-la.');
      } else {
        setErrorMsg(err.message || 'Erro ao gravar informações do perfil no banco.');
      }
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
      <div className="auth-card" style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: 'rgba(25, 22, 44, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxSizing: 'border-box'
      }}>
        {/* Onboarding Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            color: '#a855f7',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            display: 'block',
            marginBottom: '8px'
          }}>
            Onboarding de Professor
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            Configure o seu <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '900'
            }}>Perfil Docente</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px', lineHeight: '140%' }}>
            Estas informações serão utilizadas para auto-preencher os dados do cabeçalho oficial nos seus registros de plano de aula BNCC.
          </p>
        </div>

        {/* Alerta de erro */}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Nome de Exibição */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Nome do Professor (Como sairá no plano)</label>
            <input 
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value.toUpperCase())}
              required
              placeholder="Ex: HENRIQUE ZANGEROLAME"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(15, 12, 26, 0.5)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
          </div>

          {/* Localidade (Cidade e Estado) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Cidade</label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="Ex: Cachoeiro de Itapemirim"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(15, 12, 26, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Estado</label>
              <select 
                value={state}
                onChange={(e) => setState(e.target.value)}
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
                <option value="ES">ES</option>
                <option value="RJ">RJ</option>
                <option value="SP">SP</option>
                <option value="MG">MG</option>
                <option value="BA">BA</option>
                <option value="PR">PR</option>
                <option value="SC">SC</option>
                <option value="RS">RS</option>
              </select>
            </div>
          </div>

          {/* Switch: Multiplas Escolas */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>Leciona em mais de uma escola?</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Habilita o cadastro de uma unidade secundária.</span>
            </div>
            <label className="toggle-switch" style={{ margin: 0, scale: '0.9' }}>
              <input 
                type="checkbox"
                checked={teachesMultipleSchools}
                onChange={(e) => setTeachesMultipleSchools(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Nome da Escola 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
              {teachesMultipleSchools ? '🏫 Escola Principal (Unidade 1)' : '🏫 Unidade de Ensino / Escola'}
            </label>
            <input 
              type="text"
              value={school1}
              onChange={(e) => setSchool1(e.target.value.toUpperCase())}
              required
              placeholder='Ex: EMEBTI "JULIETA DEPS TALLON"'
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(15, 12, 26, 0.5)',
                color: '#ffffff',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
          </div>

          {/* Nome da Escola 2 (Condicional) */}
          {teachesMultipleSchools && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="fade-in">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>🏫 Segunda Escola (Unidade 2)</label>
              <input 
                type="text"
                value={school2}
                onChange={(e) => setSchool2(e.target.value.toUpperCase())}
                required={teachesMultipleSchools}
                placeholder='Ex: EMEB "CASTRO ALVES"'
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(15, 12, 26, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
              />
            </div>
          )}

          {/* Turma e Horário de Aula */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Turma / Série Regular</label>
              <input 
                type="text"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                required
                placeholder="Ex: 1º Ano A"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(15, 12, 26, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Horário / Turno</label>
              <select 
                value={horarioAula}
                onChange={(e) => setHorarioAula(e.target.value)}
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
                <option value="Matutino">🌅 Matutino</option>
                <option value="Vespertino">🌇 Vespertino</option>
                <option value="Noturno">🌃 Noturno</option>
                <option value="Integral">🏫 Integral</option>
              </select>
            </div>
          </div>

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
              marginTop: '15px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, borderWidth: '2px' }}></span>
            ) : (
              <span>✓ Salvar e Ir para o Gerador de Planos</span>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
