import { useState, useEffect } from 'react';
import './styles/PremiumUI.css';
import LessonPlanForm from './components/LessonPlanForm';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Buscar perfil correspondente ao id do usuário
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Perfil não encontrado no Supabase. Criando perfil temporário...');
        // Criar perfil padrão fallback para evitar travamentos
        const fallbackProfile = {
          id: userId,
          full_name: 'Professor Municipal',
          role: 'teacher',
          city: '',
          state: '',
          school_1: '',
          school_2: '',
          teaches_multiple_schools: false,
          turma: '',
          horario_aula: ''
        };
        setProfile(fallbackProfile);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Erro ao recuperar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escutar mudanças no estado de autenticação (Login, Logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const handleAuthSuccess = (newSession, newUser) => {
    setSession(newSession);
    setUser(newUser);
    if (newSession?.__isLocal) {
      // Sessão de teste local — perfil mockado, pula Supabase
      setProfile({
        id: newUser.id,
        full_name: 'Admin Teste',
        role: 'admin',
        city: 'Cidade Teste',
        state: 'SP',
        school_1: 'Escola Teste',
        school_2: '',
        teaches_multiple_schools: false,
        turma: '5º Ano A',
        horario_aula: '08:00'
      });
      setLoading(false);
    } else {
      fetchProfile(newUser.id);
    }
  };

  const handleProfileComplete = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  // Loader global inicial
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#090810',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#94a3b8' }}>
          Carregando portal do PlanejaAÍ...
        </p>
      </div>
    );
  }

  // 1. Caso NÃO esteja logado: Exibir Login/Cadastro
  if (!session) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Verificar se o perfil está completo. Se os campos básicos estiverem vazios, aciona Onboarding
  const isProfileIncomplete = 
    !profile || 
    !profile.city || 
    !profile.school_1 || 
    !profile.turma;

  // 2. Caso o perfil de professor esteja pendente: Exibir formulário de Onboarding
  if (isProfileIncomplete) {
    return (
      <ProfileSetup 
        user={user} 
        profile={profile} 
        onProfileComplete={handleProfileComplete} 
      />
    );
  }

  // 3. Caso autenticado e com perfil configurado: Abrir o Painel do PlanejaAÍ
  return (
    <LessonPlanForm 
      user={user} 
      profile={profile} 
      onLogout={handleLogout} 
    />
  );
}

export default App;
