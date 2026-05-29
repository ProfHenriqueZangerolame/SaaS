export const SavedPlansTab = ({ savedPlans, setActiveTab, setGeneratedPlan }) => {
  return (
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
              <button className="btn-secondary" onClick={() => {
                setGeneratedPlan(plan);
                setActiveTab('generator');
              }}>
                <span>🔍 Abrir Plano</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
