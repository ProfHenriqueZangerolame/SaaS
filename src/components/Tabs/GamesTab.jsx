import { useState } from 'react';

export const GamesTab = () => {
  const [gameRobotPos, setGameRobotPos] = useState([0, 4]);
  const [gameRobotDir, setGameRobotDir] = useState('right');
  const [gameCommands, setGameCommands] = useState([]);
  const [gameIsRunning, setGameIsRunning] = useState(false);
  const [gameActiveStep, setGameActiveStep] = useState(-1);
  const [gameStatus, setGameStatus] = useState('idle');
  const [gameMessage, setGameMessage] = useState('Ajude o robô 🤖 a evitar o fogo 🔥 e alcançar a estrela 🌟!');

  const gameGridMap = [
    [0, 0, 0, 0, 2],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0]
  ];

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

    let currentPos = [0, 4];
    let currentDir = 'right';
    let step = 0;

    setGameRobotPos(currentPos);
    setGameRobotDir(currentDir);

    const executeNextStep = () => {
      if (step >= gameCommands.length) {
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

        if (nextCol < 0 || nextCol > 4 || nextRow < 0 || nextRow > 4) {
          setGameIsRunning(false);
          setGameStatus('fail');
          setGameMessage('💥 O robô saiu do labirinto e colidiu com a parede!');
          setGameActiveStep(-1);
          return;
        }

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
      setTimeout(executeNextStep, 800);
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
    <div className="form-card">
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

      <div className="game-arena">
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
                if (cellType === 0) cellClass += " cell-path";
                if (isRobot) cellClass += " cell-active";
                if (gameStatus === 'success' && cellType === 2) cellClass += " cell-success";
                if (gameStatus === 'fail' && isRobot) cellClass += " cell-fail";

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

        <div className="game-controls-card">
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
  );
};
