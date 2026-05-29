import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [envWarning, setEnvWarning] = useState(false);

  const generatePlan = async (payload) => {
    setLoading(true);
    setErrorMsg('');
    setEnvWarning(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setLoading(false);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error === 'Chave API não configurada') {
          setEnvWarning(true);
        } else {
          setErrorMsg(errJson.message || 'Falha ao processar plano de aula no servidor. Verifique o console do backend.');
        }
        return null;
      }

      const planJson = await response.json();
      return planJson;
    } catch (err) {
      setLoading(false);
      console.error(err);
      setErrorMsg(`Erro de Conexão: Não foi possível se comunicar com o backend do EduPlan-SaaS. Certifique-se de que o servidor Node está rodando em ${API_BASE_URL}!`);
      return null;
    }
  };

  const generateActivity = async (payload) => {
    setLoadingActivity(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setLoadingActivity(false);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        setErrorMsg(errJson.message || 'Falha ao processar folha de atividades no servidor. Verifique o console do backend.');
        return null;
      }

      const activityJson = await response.json();
      return activityJson;
    } catch (err) {
      setLoadingActivity(false);
      console.error(err);
      setErrorMsg(`Erro de Conexão: Não foi possível se comunicar com o backend do EduPlan-SaaS para gerar as atividades. Certifique-se de que o servidor está rodando em ${API_BASE_URL}!`);
      return null;
    }
  };

  return {
    generatePlan,
    generateActivity,
    loading,
    loadingActivity,
    errorMsg,
    envWarning,
    setErrorMsg,
    setEnvWarning,
    setLoading
  };
}