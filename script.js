// --- VARIÁVEIS GLOBAIS ---
let perguntasOriginais = [];
let perguntasAtivas = [];
let perguntasFiltradas = [];
let vocabularioOriginal = [];
let vocabularioAtivo = [];
let vocabularioFiltrado = [];
let vocabularioUsado = [];
let currentVocabIndex = 0;
let timerInterval = null;
let timerEnabled = false;
let timerSeconds = 0;
let currentQuestion = null;
let savedQuestions = JSON.parse(localStorage.getItem('savedQuestions')) || [];
let currentMode = 'questions';


// Quiz
let quizVocabulary = [];
let currentQuizQuestion = {};
let quizMode = "en-pt";
let quizVocabularyUsed = [];
let quizVocabularyActive = [];
let quizPoints = 0;
let quizErrors = 0;

// Grammar
// Grammar scoring and control
let grammarActiveExercises = [];
let grammarUsedExercises = [];
let grammarPoints = 0;
let grammarErrors = 0;

const URL_PERGUNTAS = "english_questions_650.json";
const URL_VOCABULARIO = "english_vocabulary.json";
const URL_GRAMMAR = "english_grammar.json";
let grammarTopics = [];

// Phrasal Verbs
let phrasalVerbsOriginal = [];
let phrasalVerbsFiltrados = [];
let phrasalVerbsAtivos = [];
let phrasalVerbsUsados = [];
let currentPhrasalVerb = null;
const URL_PHRASALVERBS = "phrasal_verbs.json";

// --- FUNÇÕES DE CARREGAMENTO ---
async function carregarDados() {
  try {
    const responseQuestions = await fetch(URL_PERGUNTAS);
    if (!responseQuestions.ok) throw new Error(`Failed to load questions from ${URL_PERGUNTAS}`);
    perguntasOriginais = await responseQuestions.json();

    const responseVocab = await fetch(URL_VOCABULARIO);
    if (!responseVocab.ok) throw new Error(`Failed to load vocabulary from ${URL_VOCABULARIO}`);
    vocabularioOriginal = await responseVocab.json();
    quizVocabulary = [...vocabularioOriginal];

    const responseGrammar = await fetch(URL_GRAMMAR);
    if (!responseGrammar.ok) throw new Error(`Failed to load grammar from ${URL_GRAMMAR}`);
    const grammarData = await responseGrammar.json();
    grammarTopics = Array.isArray(grammarData) ? grammarData : grammarData.grammarTopics;

    const responsePhrasalVerbs = await fetch(URL_PHRASALVERBS);
    if (!responsePhrasalVerbs.ok) throw new Error(`Failed to load phrasal verbs from ${URL_PHRASALVERBS}`);
    phrasalVerbsOriginal = await responsePhrasalVerbs.json();

    inicializarInterface();

    // CHAMAR OS FILTROS APÓS CARREGAR OS DADOS
    filtrarPerguntas();
    filtrarVocabulario();
    filtrarQuizVocabulary();
    filtrarPhrasalVerbs();

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    document.getElementById("resultado").innerHTML = `
      <div class="error-message">
        <p>Erro ao carregar os dados. Verifique se os arquivos JSON estão na mesma pasta.</p>
        <p>Detalhes: ${error.message}</p>
      </div>
    `;
  }
}

function inicializarInterface() {
  // Inicializar selects
  inicializarSelects();

  // Inicializar event listeners
  inicializarEventListeners();

  // Atualizar botões
  atualizarBotoes();

  // Preencher selects de gramática e phrasal verbs
  preencherSelects();

  console.log("Interface inicializada com sucesso!");
}

function inicializarSelects() {
  // Level selects
  const levelSelects = [
    'levelSelect', 'vocabLevelSelect', 'quizLevelSelect', 'phrasalLevelSelect'
  ];
  const grammarSelect = document.getElementById('grammarSelect');
  if (grammarSelect) {
    grammarSelect.addEventListener('change', () => {
      // Atualizar automaticamente a exibição de gramática se estiver visível
      if (document.getElementById('grammarDisplay').style.display === 'block') {
        mostrarGramatica();
      }

      // Atualizar automaticamente os exercícios se estiverem visíveis
      if (document.getElementById('grammarPractice').style.display === 'block') {
        praticarGramatica();
      }
    });
  }

  levelSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      // Garantir que tenha um valor selecionado
      if (select.value === '') {
        select.value = 'all';
      }

      select.addEventListener('change', () => {
        atualizarBotoes();
        if (selectId === 'levelSelect') {
          filtrarPerguntas();
        } else if (selectId === 'vocabLevelSelect') {
          filtrarVocabulario();
        } else if (selectId === 'quizLevelSelect') {
          filtrarQuizVocabulary();
        } else if (selectId === 'phrasalLevelSelect') {
          filtrarPhrasalVerbs();
        }
      });
    }
  });

  // Timer
  const timerToggle = document.getElementById('timerToggle');
  if (timerToggle) {
    timerToggle.addEventListener('input', () => {
      const value = parseInt(timerToggle.value) || 0;
      timerEnabled = value > 0;
      timerSeconds = value;
      atualizarBotoes();
    });
  }
  // Grammar mode select
  const grammarModeSelect = document.getElementById('grammarModeSelect');
  if (grammarModeSelect) {
    grammarModeSelect.addEventListener('change', () => {
      // Recarregar exercícios quando o modo mudar
      if (currentGrammarTopic && document.getElementById('grammarPractice').style.display === 'block') {
        praticarGramatica();
      }
    });
  }

  // Quiz mode
  const quizModeSelect = document.getElementById('quizMode');
  if (quizModeSelect) {
    quizModeSelect.addEventListener('change', () => {
      quizMode = quizModeSelect.value;
      if (currentQuizQuestion && currentQuizQuestion.word) {
        exibirQuizQuestion();
      }
    });
  }

  // Phrasal verb select
  const phrasalVerbSelect = document.getElementById('phrasalVerbSelect');
  if (phrasalVerbSelect) {
    phrasalVerbSelect.addEventListener('change', () => {
      filtrarPhrasalVerbs(); // Isso filtra quando o verbo é alterado
      atualizarBotoes();
    });
  }
}

function inicializarEventListeners() {
  // Botões de modo
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.id.replace('btnMode', '').toLowerCase();
      alternarModo(mode);
    });
  });

  // Botões principais
  document.getElementById('btnSortear').addEventListener('click', sortearPergunta);
  document.getElementById('btnVocab').addEventListener('click', sortearVocabulario);
  document.getElementById('btnStartQuiz').addEventListener('click', iniciarQuiz);
  document.getElementById('btnDrawPhrasal').addEventListener('click', sortearPhrasalVerb);

  // Botões secundários
  document.getElementById('btnResetar').addEventListener('click', resetarPerguntas);
  document.getElementById('btnVocabReset').addEventListener('click', resetarVocabulario);
  document.getElementById('btnPhrasalReset').addEventListener('click', resetarPhrasalVerbs);
  document.getElementById('btnShowTranslation').addEventListener('click', mostrarTraducao);
  document.getElementById('btnShowPhrasalMeaning').addEventListener('click', mostrarSignificadoPhrasal);
  document.getElementById('btnNextQuestion').addEventListener('click', proximaPerguntaQuiz);
  document.getElementById('btnSpeakVocab').addEventListener('click', () => falarTexto(document.getElementById('vocabWord').textContent));
  document.getElementById('btnSpeakQuiz').addEventListener('click', () => falarTexto(document.getElementById('quizWord').textContent));
  document.getElementById('btnSpeakPhrasal').addEventListener('click', () => falarTexto(document.getElementById('phrasalVerb').textContent));

  // Botões de gramática
  document.getElementById('btnShowGrammar').addEventListener('click', mostrarGramatica);
  document.getElementById('btnPracticeGrammar').addEventListener('click', praticarGramatica);
  document.getElementById('btnCheckExercise').addEventListener('click', verificarExercicio);
  document.getElementById('btnNextExercise').addEventListener('click', proximoExercicio);
  document.getElementById('btnResetExercises').addEventListener('click', resetarExercicios);

  // Botões de salvamento
  document.getElementById('btnSave').addEventListener('click', salvarPergunta);
  document.getElementById('btnSaved').addEventListener('click', mostrarSalvas);

  // Notificação de tempo
  document.getElementById('dismissNotification').addEventListener('click', () => {
    document.getElementById('timeUpNotification').style.display = 'none';
  });
}

function preencherSelects() {
  // Preencher select de gramática
  const grammarSelect = document.getElementById('grammarSelect');
  if (grammarSelect && grammarTopics.length > 0) {
    grammarSelect.innerHTML = '<option value="">Select a grammar topic</option>';
    grammarSelect.innerHTML += '<option value="random">🎲 Random Topic</option>'; // Adicionar opção Random
    grammarTopics.forEach(topic => {
      const option = document.createElement('option');
      option.value = topic.topic;
      option.textContent = topic.topic;
      grammarSelect.appendChild(option);
    });
  }

  // Preencher select de modo de gramática (SEM random mode)
  const grammarModeSelect = document.getElementById('grammarModeSelect');
  if (grammarModeSelect) {
    grammarModeSelect.innerHTML = `
      <option value="all">All Modes</option>
      <option value="multiple_choice">Multiple Choice</option>
      <option value="fill_in">Fill in the Blanks</option>
      <option value="rewrite">Rewrite Sentences</option>
    `;
  }

  // Preencher select de phrasal verbs
  const phrasalVerbSelect = document.getElementById('phrasalVerbSelect');
  if (phrasalVerbSelect && phrasalVerbsOriginal.length > 0) {
    // Obter verbos principais únicos
    const mainVerbs = [...new Set(phrasalVerbsOriginal.map(pv => pv.verb))].sort();

    phrasalVerbSelect.innerHTML = '<option value="all">All Verbs</option>';
    mainVerbs.forEach(verb => {
      const option = document.createElement('option');
      option.value = verb;
      option.textContent = verb;
      phrasalVerbSelect.appendChild(option);
    });
  }
}

// --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---
function atualizarBotoes() {
  const level = document.getElementById('levelSelect').value;
  const vocabLevel = document.getElementById('vocabLevelSelect').value;
  const quizLevel = document.getElementById('quizLevelSelect').value;
  const phrasalLevel = document.getElementById('phrasalLevelSelect').value;

  document.getElementById('btnSortear').disabled = level === '';
  document.getElementById('btnVocab').disabled = vocabLevel === '';
  document.getElementById('btnStartQuiz').disabled = quizLevel === '';
  document.getElementById('btnDrawPhrasal').disabled = phrasalLevel === '';

  document.getElementById('btnResetar').disabled = perguntasAtivas.length === 0;
  document.getElementById('btnVocabReset').disabled = vocabularioAtivo.length === 0;
  document.getElementById('btnPhrasalReset').disabled = phrasalVerbsAtivos.length === 0;
}

function alternarModo(modo) {
  currentMode = modo;

  // Esconder todos os painéis de controle
  document.getElementById('questionsControls').style.display = 'none';
  document.getElementById('vocabularyControls').style.display = 'none';
  document.getElementById('quizControls').style.display = 'none';
  document.getElementById('grammarControls').style.display = 'none';
  document.getElementById('phrasalControls').style.display = 'none';

  // Mostrar o painel correspondente ao modo selecionado
  document.getElementById(`${modo}Controls`).style.display = 'block';

  // Atualizar botões
  atualizarBotoes();

  // Resetar timer se estiver ativo
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
function filtrarPerguntas() {
  const nivel = document.getElementById('levelSelect').value;

  if (nivel === 'all') {
    perguntasFiltradas = [...perguntasOriginais];
  } else {
    // Certifique-se de que está comparando corretamente os níveis
    perguntasFiltradas = perguntasOriginais.filter(p => p.level.toUpperCase() === nivel.toUpperCase());
  }

  // Reiniciar perguntas ativas
  perguntasAtivas = [...perguntasFiltradas];

  // Atualizar display
  if (perguntasFiltradas.length === 0) {
    document.getElementById("resultado").innerHTML = `
      <div class="empty-message">
        <p>No questions available for ${nivel} level.</p>
      </div>
    `;
  } else {
    document.getElementById("resultado").innerHTML = `
      <div class="empty-message">
        <p>Ready with ${perguntasFiltradas.length} questions for ${nivel} level</p>
        <p>Click "Draw Question" to begin</p>
      </div>
    `;
  }

  atualizarBotoes();
}

// --- FUNÇÕES DE PERGUNTAS ---
function sortearPergunta() {
  // Primeiro filtrar as perguntas baseado no nível selecionado
  filtrarPerguntas();

  // Verificar se há perguntas disponíveis
  if (perguntasAtivas.length === 0) {
    document.getElementById("resultado").innerHTML = `
      <div class="empty-message">
        <p>No questions available for the selected level.</p>
        <button class="reset-btn" onclick="resetarPerguntas()">Reset Questions</button>
      </div>
    `;
    return;
  }

  // Sortear uma pergunta aleatória
  const indiceSorteado = Math.floor(Math.random() * perguntasAtivas.length);
  currentQuestion = perguntasAtivas[indiceSorteado];

  // Remover a pergunta sorteada do array ativo
  perguntasAtivas.splice(indiceSorteado, 1);

  // Exibir a pergunta
  exibirPergunta(currentQuestion);

  // Iniciar o timer se estiver habilitado
  if (timerEnabled) {
    iniciarTimer();
  }

  // Atualizar botões
  atualizarBotoes();
}
function exibirPergunta(pergunta) {
  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.innerHTML = `
    <div class="difficulty ${pergunta.level}">${pergunta.level}</div>
    <div class="question-text">${pergunta.question}</div>
    <button id="btnSpeakQuestion" class="secondary-button" style="margin-top:10px;">
      🔊 Ouvir Pergunta
    </button>
  `;

  // Adicionar evento de clique para o áudio
  document.getElementById("btnSpeakQuestion").onclick = () => {
    falarTexto(pergunta.question, 'en-US');
  };

  // Adicionar exemplo se existir
  if (pergunta.example) {
    resultadoDiv.innerHTML += `
      <div class="vocab-example">
        <strong>Example:</strong> ${pergunta.example}
      </div>
    `;
  }
}


function resetarPerguntas() {
  filtrarPerguntas(); // Recarrega as perguntas filtradas

  document.getElementById("resultado").innerHTML = `
    <div class="empty-message">
      <p>Questions have been reset.</p>
      <p>${perguntasAtivas.length} questions available for selected level.</p>
    </div>
  `;

  atualizarBotoes();
}

// --- FUNÇÕES DE VOCABULÁRIO ---
function filtrarVocabulario() {
  const nivel = document.getElementById('vocabLevelSelect').value;

  if (nivel === 'all') {
    vocabularioFiltrado = [...vocabularioOriginal];
  } else {
    // CORRIGIR: Verificar se vocabularioOriginal tem itens antes de filtrar
    vocabularioFiltrado = vocabularioOriginal.filter(v => v && v.level === nivel);
  }

  // Reiniciar vocabulário ativo e usado
  vocabularioAtivo = [...vocabularioFiltrado];
  vocabularioUsado = [];
  currentVocabIndex = 0;

  // ATUALIZAR BOTÕES E MENSAGEM
  atualizarBotoes();

  // Mostrar mensagem de status
  if (vocabularioFiltrado.length === 0) {
    document.getElementById('vocabCard').style.display = 'none';
    const vocabularyControls = document.getElementById('vocabularyControls');
    const emptyMessage = vocabularyControls.querySelector('.empty-message');
    if (!emptyMessage) {
      vocabularyControls.insertAdjacentHTML('beforeend', `
        <div class="empty-message">
          <p>No vocabulary found for ${nivel} level.</p>
        </div>
      `);
    }
  } else {
    const emptyMessage = document.querySelector('#vocabularyControls .empty-message');
    if (emptyMessage) emptyMessage.remove();
  }
}

function sortearVocabulario() {
  // Verificar se há vocabulário disponível
  if (vocabularioFiltrado.length === 0) {
    alert('No vocabulary available for the selected level.');
    return;
  }

  // Se não houver palavras ativas, recarregar do vocabulário filtrado
  if (vocabularioAtivo.length === 0) {
    if (vocabularioUsado.length > 0) {
      // Se já usamos todas as palavras, resetar
      vocabularioAtivo = [...vocabularioUsado];
      vocabularioUsado = [];
    } else {
      // Primeira vez usando, carregar do vocabulário filtrado
      vocabularioAtivo = [...vocabularioFiltrado];
    }
  }

  // Sortear uma palavra aleatória
  const indiceSorteado = Math.floor(Math.random() * vocabularioAtivo.length);
  const palavraSorteada = vocabularioAtivo[indiceSorteado];

  // Verificar se a palavra é válida
  if (!palavraSorteada) {
    alert('Error: Invalid vocabulary item.');
    return;
  }

  // Remover a palavra sorteada do array ativo e adicionar ao usado
  vocabularioAtivo.splice(indiceSorteado, 1);
  vocabularioUsado.push(palavraSorteada);

  // Exibir a palavra
  exibirVocabulario(palavraSorteada);

  // Atualizar botões
  atualizarBotoes();
}
function resetarVocabulario() {
  const nivel = document.getElementById('vocabLevelSelect').value;

  if (nivel === 'all') {
    vocabularioAtivo = [...vocabularioOriginal];
  } else {
    vocabularioAtivo = vocabularioOriginal.filter(v => v.level === nivel);
  }

  vocabularioUsado = [];
  currentVocabIndex = 0;

  document.getElementById('vocabCard').style.display = 'none';

  // Remover mensagem de empty se existir
  const emptyMessage = document.querySelector('#vocabularyControls .empty-message');
  if (emptyMessage) {
    emptyMessage.remove();
  }

  atualizarBotoes();

  // Mostrar mensagem de reset
  const vocabularyControls = document.getElementById('vocabularyControls');
  const resetMessage = document.createElement('div');
  resetMessage.className = 'empty-message';
  resetMessage.innerHTML = `
    <p>Vocabulary has been reset.</p>
    <p>Click "Practice Vocabulary" to draw a new word.</p>
  `;

  // Verificar se já existe uma mensagem para não duplicar
  if (!vocabularyControls.querySelector('.empty-message')) {
    vocabularyControls.appendChild(resetMessage);
  }
}
function mostrarTraducao() {
  const translationElement = document.getElementById('vocabTranslation');
  if (translationElement) {
    translationElement.style.display = translationElement.style.display === 'none' ? 'block' : 'none';
  }

  // Mostrar/ocultar também a definição se desejar
  const definitionElement = document.getElementById('vocabDefinition');
  if (definitionElement) {
    definitionElement.style.display = definitionElement.style.display === 'none' ? 'block' : 'none';
  }
}

function exibirVocabulario(vocab) {
  const vocabCard = document.getElementById('vocabCard');
  vocabCard.style.display = 'block';

  document.getElementById('vocabLevel').className = `difficulty ${vocab.level}`;
  document.getElementById('vocabLevel').textContent = vocab.level;
  document.getElementById('vocabWord').textContent = vocab.word;
  document.getElementById('vocabTranslation').textContent = vocab.translation;

  // Definir definição em inglês e português
  document.getElementById('vocabDefinition').innerHTML = `
    <strong>English:</strong> ${vocab.definition_en}<br>
    <strong>Português:</strong> ${vocab.definition_pt}
  `;

  // Destacar a palavra no exemplo
  let exemploDestacado = vocab.example;
  if (vocab.word && vocab.example) {
    const regex = new RegExp(`\\b${vocab.word}\\b`, 'gi');
    exemploDestacado = vocab.example.replace(regex, `<span class="vocab-highlight">$&</span>`);
  }

  document.getElementById('vocabExample').innerHTML = `Example: ${exemploDestacado}`;

  // Esconder a tradução inicialmente
  document.getElementById('vocabTranslation').style.display = 'none';
}

// --- FUNÇÕES DE QUIZ ---

function filtrarQuizVocabulary() {
  const nivel = document.getElementById('quizLevelSelect').value;

  if (nivel === 'all') {
    quizVocabularyActive = [...quizVocabulary];
  } else {
    quizVocabularyActive = quizVocabulary.filter(v => v.level === nivel);
  }

  // Reiniciar quiz
  quizVocabularyUsed = [];
  quizPoints = 0;
  quizErrors = 0;
  atualizarPontuacaoQuiz();

  document.getElementById('quizContainer').innerHTML = `
    <div class="empty-message">
      <p>Vocabulary quiz ready.</p>
      <p>Click "Start Quiz" to begin.</p>
    </div>
  `;

  atualizarBotoes();
}

function iniciarQuiz() {
  // Se não houver palavras ativas, recarregar do vocabulário filtrado
  if (quizVocabularyActive.length === 0) {
    if (quizVocabularyUsed.length > 0) {
      // Se já usamos todas as palavras, resetar
      quizVocabularyActive = [...quizVocabularyUsed];
      quizVocabularyUsed = [];
    } else {
      // Primeira vez usando, carregar do vocabulário filtrado
      quizVocabularyActive = [...quizVocabulary.filter(v => {
        const nivel = document.getElementById('quizLevelSelect').value;
        return nivel === 'all' || v.level === nivel;
      })];
    }
  }

  // Sortear uma palavra aleatória
  const indiceSorteado = Math.floor(Math.random() * quizVocabularyActive.length);
  currentQuizQuestion = quizVocabularyActive[indiceSorteado];

  // Remover a palavra sorteada do array ativo e adicionar ao usado
  quizVocabularyActive.splice(indiceSorteado, 1);
  quizVocabularyUsed.push(currentQuizQuestion);

  // Exibir a pergunta do quiz
  exibirQuizQuestion();

  // Atualizar botões
  document.getElementById('btnNextQuestion').disabled = false;
  atualizarBotoes();
}


function exibirQuizQuestion() {
  const quizContainer = document.getElementById('quizContainer');

  // Gerar opções aleatórias
  const opcoes = gerarOpcoesQuiz(currentQuizQuestion);

  // Exibir a pergunta baseada no modo selecionado
  let pergunta = '';
  let palavraPergunta = '';

  if (quizMode === 'en-pt') {
    pergunta = ``;
    palavraPergunta = currentQuizQuestion.word;
  } else if (quizMode === 'pt-en') {
    pergunta = ``;
    palavraPergunta = currentQuizQuestion.translation;
  } else {
    pergunta = ``;
    palavraPergunta = currentQuizQuestion.word;
  }

  // Criar HTML das opções
  let opcoesHTML = '';
  opcoes.forEach((opcao, index) => {
    opcoesHTML += `
      <button class="quiz-btn" data-answer="${opcao.value.replace(/"/g, '&quot;')}" onclick="verificarRespostaQuiz(this.dataset.answer)">
        ${opcao.text}
      </button>
    `;
  });

  quizContainer.innerHTML = `
    <div class="quiz-question-area" id="quizQuestionArea">
      <div class="difficulty ${currentQuizQuestion.level}">${currentQuizQuestion.level}</div>
      <div class="quiz-word" id="quizWord">${palavraPergunta}</div>
      <div class="quiz-instruction">${pergunta}</div>
    </div>
    <div class="quiz-options">
      ${opcoesHTML}
    </div>
    <div class="quiz-feedback" id="quizFeedback"></div>
  `;

  // Adicionar evento de áudio
  document.getElementById("btnSpeakQuiz").onclick = () => {
    falarTexto(palavraPergunta, 'en-US');
  };
}


function gerarOpcoesQuiz(palavraCorreta) {
  // Selecionar 3 palavras aleatórias do vocabulário (excluindo a correta)
  let outrasPalavras = [];

  if (quizMode === 'en-pt') {
    outrasPalavras = quizVocabulary
      .filter(v => v.translation !== palavraCorreta.translation)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(v => v.translation);
  } else if (quizMode === 'pt-en') {
    outrasPalavras = quizVocabulary
      .filter(v => v.word !== palavraCorreta.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(v => v.word);
  } else {
    outrasPalavras = quizVocabulary
      .filter(v => v.definition_en !== palavraCorreta.definition_en)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(v => v.definition_en);
  }

  // Adicionar a resposta correta
  let todasOpcoes;
  if (quizMode === 'en-pt') {
    todasOpcoes = [palavraCorreta.translation, ...outrasPalavras];
  } else if (quizMode === 'pt-en') {
    todasOpcoes = [palavraCorreta.word, ...outrasPalavras];
  } else {
    todasOpcoes = [palavraCorreta.definition_en, ...outrasPalavras];
  }

  // Embaralhar as opções
  todasOpcoes = todasOpcoes.sort(() => 0.5 - Math.random());

  // Formatar para o HTML
  return todasOpcoes.map(opcao => ({
    value: opcao,
    text: opcao
  }));
}

function verificarRespostaQuiz(respostaSelecionada) {
  const feedbackElement = document.getElementById('quizFeedback');
  const botoes = document.querySelectorAll('.quiz-btn');

  // Desabilitar todos os botões
  botoes.forEach(botao => {
    botao.disabled = true;
  });

  // Determinar a resposta correta baseada no modo
  let respostaCerta;
  if (quizMode === 'en-pt') {
    respostaCerta = currentQuizQuestion.translation;
  } else if (quizMode === 'pt-en') {
    respostaCerta = currentQuizQuestion.word;
  } else {
    respostaCerta = currentQuizQuestion.definition_en;
  }

  // Verificar resposta
  if (respostaSelecionada === respostaCerta) {
    feedbackElement.textContent = 'Correct! 🎉';
    feedbackElement.className = 'quiz-feedback correct';
    quizPoints++;

    // Destacar o botão correto em VERDE
    botoes.forEach(botao => {
      if (botao.dataset.answer === respostaCerta) {
        botao.classList.add('correct');
      }
    });

  } else {
    feedbackElement.textContent = `Incorrect! The correct answer is: ${respostaCerta}`;
    feedbackElement.className = 'quiz-feedback incorrect';
    quizErrors++;

    // Destacar o botão errado em VERMELHO e o correto em VERDE
    botoes.forEach(botao => {
      if (botao.dataset.answer === respostaSelecionada) {
        botao.classList.add('incorrect');
      }
      if (botao.dataset.answer === respostaCerta) {
        botao.classList.add('correct');
      }
    });
  }

  atualizarPontuacaoQuiz();

  // Adicionar delay automático para próxima pergunta (2 segundos)
  setTimeout(() => {
    if (quizVocabularyActive.length > 0 || quizVocabularyUsed.length > 0) {
      proximaPerguntaQuiz();
    }
  }, 2000);
}


function atualizarPontuacaoQuiz() {
  document.getElementById('quizPoints').textContent = quizPoints;
  document.getElementById('quizErrors').textContent = quizErrors;
  document.getElementById('quizTotal').textContent = quizPoints + quizErrors;
}

function proximaPerguntaQuiz() {
  // Limpar feedback e estilos
  const feedbackElement = document.getElementById('quizFeedback');
  const questionArea = document.getElementById('quizQuestionArea');

  feedbackElement.textContent = '';
  feedbackElement.className = 'quiz-feedback';

  // Remover classes dos botões e da área da pergunta
  const botoes = document.querySelectorAll('.quiz-btn');
  botoes.forEach(botao => {
    botao.classList.remove('correct', 'incorrect');
    botao.disabled = false;
  });

  // Remover estilos da área da pergunta
  if (questionArea) {
    questionArea.classList.remove('correct-area', 'incorrect-area');
  }

  // Verificar se ainda há palavras disponíveis
  if (quizVocabularyActive.length === 0) {
    document.getElementById('quizContainer').innerHTML = `
      <div class="empty-message">
        <p>Quiz completed!</p>
        <p>Final score: ${quizPoints} correct out of ${quizPoints + quizErrors}</p>
        <button class="reset-btn" onclick="filtrarQuizVocabulary()">Restart Quiz</button>
      </div>
    `;
    document.getElementById('btnNextQuestion').disabled = true;
  } else {
    iniciarQuiz();
  }
}
function gerenciarBotaoCheckExercicio() {
  const btnCheckExercise = document.getElementById('btnCheckExercise');
  const exerciseContainer = document.getElementById('exerciseContainer');

  // Sempre mostrar o botão principal como fallback
  btnCheckExercise.style.display = 'flex';

  // Se houver botão inline, esconder o principal
  const inlineCheckBtn = document.getElementById('inlineCheckBtn');
  if (inlineCheckBtn) {
    btnCheckExercise.style.display = 'none';
  }
}




// --- FUNÇÕES DE GRAMÁTICA ---
function mostrarGramatica() {
  const topicSelect = document.getElementById('grammarSelect');
  const selectedTopic = topicSelect.value;

  // Se estivermos no modo Random Topic mas já temos um tópico atual (de um exercício)
  // usar esse tópico em vez de sortear um novo
  if (selectedTopic === 'random' && currentGrammarTopic) {
    // Usar o tópico atual do exercício em vez de sortear um novo
    topic = currentGrammarTopic;
  } else if (selectedTopic === 'random') {
    // Se não há tópico atual, sortear um
    const randomIndex = Math.floor(Math.random() * grammarTopics.length);
    topic = grammarTopics[randomIndex];
  } else {
    topic = grammarTopics.find(t => t.topic === selectedTopic);
  }

  if (!topic) return;

  const grammarDisplay = document.getElementById('grammarDisplay');
  grammarDisplay.innerHTML = `
    <div style="margin-bottom:15px;">
      <button id="btnVoltarExercicio" class="secondary-button">⬅️ Voltar para Exercício</button>
    </div>
    <h3>${topic.topic}</h3>
    <div class="grammar-explanation">
      <p><strong>Explanation:</strong> ${topic.explanation}</p>
    </div>
    ${topic.rules ? `
    <div class="grammar-rules">
      <p><strong>Rules:</strong></p>
      <ul>
        ${topic.rules.map(rule => `<li>${rule}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    <div class="grammar-examples">
      <p><strong>Examples:</strong></p>
      <ul>
        ${topic.examples.map(ex => `<li>${ex}</li>`).join('')}
      </ul>
    </div>
  `;

  document.getElementById('grammarPractice').style.display = 'none';
  grammarDisplay.style.display = 'block';

  // 🔹 Ativar botão de voltar
  document.getElementById('btnVoltarExercicio').addEventListener('click', () => {
    grammarDisplay.style.display = 'none';
    document.getElementById('grammarPractice').style.display = 'block';
  });
}




let currentExerciseIndex = 0;
let currentGrammarTopic = null;

function praticarGramatica(forceRefresh = false) {
  const topicSelect = document.getElementById('grammarSelect');
  const modeSelect = document.getElementById('grammarModeSelect');
  const selectedTopic = topicSelect.value;
  const selectedMode = modeSelect.value;

  if (!selectedTopic) {
    alert('Please select a grammar topic first.');
    return;
  }

  let newGrammarTopic;

  // Se for selecionado "Random", escolher um tópico aleatório
  if (selectedTopic === 'random') {
    const randomIndex = Math.floor(Math.random() * grammarTopics.length);
    newGrammarTopic = grammarTopics[randomIndex];
  } else {
    newGrammarTopic = grammarTopics.find(t => t.topic === selectedTopic);
  }

  if (!newGrammarTopic) return;

  // Atualizar o tópico atual apenas se for diferente
  // Esta é a chave: sempre atualizar o currentGrammarTopic com o tópico do exercício
  currentGrammarTopic = newGrammarTopic;
  
  // SEMPRE começar com um exercício aleatório do tópico
  currentExerciseIndex = Math.floor(Math.random() * currentGrammarTopic.exercises.length);

  if (!currentGrammarTopic.exercises || currentGrammarTopic.exercises.length === 0) {
    alert('No exercises available for this topic.');
    return;
  }

  // Filtrar exercícios pelo modo selecionado
  let exerciciosFiltrados = filtrarExerciciosPorModo(currentGrammarTopic.exercises, selectedMode);

  if (exerciciosFiltrados.length === 0) {
    alert(`No ${selectedMode} exercises available for this topic.`);
    return;
  }
  
  grammarActiveExercises = [...exerciciosFiltrados];
  grammarUsedExercises = [];
  grammarPoints = 0;
  grammarErrors = 0;
  atualizarPontuacaoGrammar();

  // Mostrar a seção de prática
  document.getElementById('grammarPractice').style.display = 'block';
  document.getElementById('grammarDisplay').style.display = 'none';

  // Inicializar exercícios FILTRADOS
  iniciarExercicios(exerciciosFiltrados);

  // Gerenciar visibilidade do botão
  gerenciarBotaoCheckExercicio();
}

// Adicionar esta função para verificar se há texto nos campos antes de verificar
function validarCampoPreenchido() {
  const userAnswerElement = document.getElementById('exerciseAnswer');
  if (userAnswerElement && !userAnswerElement.value.trim()) {
    const feedbackElement = document.getElementById('exerciseFeedback');
    feedbackElement.innerHTML = '<span style="color: #FF9800; font-weight: 600;">⚠️ Please provide an answer first!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    return false;
  }
  return true;
}



function iniciarExercicios(exercises) {
  const exerciseContainer = document.getElementById('exerciseContainer');
  const topicSelect = document.getElementById('grammarSelect');
  const selectedTopic = topicSelect.value;

  // Verificar se o índice atual é válido
  if (currentExerciseIndex >= exercises.length) {
    currentExerciseIndex = 0; // Voltar ao início se o índice for inválido
  }

  const exercise = exercises[currentExerciseIndex];
  exerciseContainer.innerHTML = ''; // Limpar container

  // Mostrar o tópico atual quando estiver no modo Random
  let modeDisplay = '';
  if (selectedTopic === 'random') {
    modeDisplay = `<div class="exercise-mode">Current Topic: ${currentGrammarTopic.topic}</div>`;
  } else if (exercise.mode) {
    modeDisplay = `<div class="exercise-mode">${exercise.mode.toUpperCase()}</div>`;
  }

  // VERIFICAR TIPO DE EXERCÍCIO CORRETAMENTE
  // Para exercícios rewrite, SEMPRE usar a caixa única
  if (exercise.mode === 'rewrite') {
    criarExercicioComUmaCaixa(exercise, modeDisplay);
  } else if (exercise.question.includes('_____')) {
    criarExercicioComLacunas(exercise, modeDisplay);
  } else if (exercise.question.includes('_')) {
    criarExercicioComCaixasPorGrupo(exercise, modeDisplay);
  } else {
    criarExercicioComUmaCaixa(exercise, modeDisplay);
  }

  // Atualizar botões de navegação
  document.getElementById('btnNextExercise').disabled = false;
}


// --- FUNÇÕES DE GRAMÁTICA ---
function criarExercicioComCaixasPorGrupo(exercise) {
  // Usar regex para encontrar grupos de underscores consecutivos
  const regex = /(_{2,})/g;
  const parts = exercise.question.split(regex);

  let questionHTML = `
    <div class="exercise-title">${exercise.instruction}</div>
    <div class="exercise-content" style="font-size: 1.1rem; line-height: 1.6; display: flex; flex-wrap: wrap; align-items: center;">
  `;

  let gapCount = 0;

  // CORREÇÃO: Handle both string and array answers properly
  let answers;
  if (Array.isArray(exercise.answer)) {
    answers = exercise.answer;
  } else {
    answers = exercise.answer.split(',');
  }

  parts.forEach(part => {
    if (part.startsWith('_') && part.length >= 2) {
      // É um grupo de underscores - criar UMA caixa de texto
      const answerValue = answers[gapCount] ? String(answers[gapCount]).trim() : '';
      questionHTML += `
         <input type="text" class="gap-input" data-index="${gapCount}" 
               data-answer="${answerValue.replace(/"/g, '&quot;')}"
               style="min-width: 120px; width: 120px; padding: 8px 12px; 
                      margin: 0 5px; border: 2px solid #8A2BE2; border-radius: 6px;"
               placeholder="________" oninput="ajustarLarguraInput(this)">
      `;
      gapCount++;
    } else {
      // É texto normal
      questionHTML += `<span class="sentence-text">${part}</span>`;
    }
  });

  // CORREÇÃO: Display answer correctly for both array and string
  const answerDisplay = Array.isArray(exercise.answer)
    ? exercise.answer.join(', ')
    : exercise.answer;

  questionHTML += `</div>`;

  document.getElementById('exerciseContainer').innerHTML = questionHTML + `
    <div class="exercise-buttons" style="margin-top: 20px; text-align: center;">
      <button class="check-btn" id="inlineCheckBtn" style="padding: 10px 20px;">
        ✓ Verificar Resposta
      </button>
    </div>
    <div class="exercise-feedback" id="exerciseFeedback"></div>
    <div class="exercise-answer" id="exerciseCorrectAnswer" style="display: none;">
      <strong>Resposta correta:</strong> <span>${answerDisplay}</span>
    </div>
  `;

  // Adicionar event listeners
  const gapInputs = document.querySelectorAll('.gap-input');
  gapInputs.forEach((input, index) => {
    input.addEventListener('input', function () {
      ajustarLarguraInput(this);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verificarExercicioComCaixas(exercise.answer);
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIndex = parseInt(this.dataset.index) + 1;
        const nextInput = document.querySelector(`.gap-input[data-index="${nextIndex}"]`);
        if (nextInput) nextInput.focus();
      }
    });
  });

  // Adicionar event listener ao botão de verificação
  document.getElementById('inlineCheckBtn').addEventListener('click', function () {
    verificarExercicioComCaixas(exercise.answer);
  });

  // Focar no primeiro campo
  if (gapInputs.length > 0) {
    setTimeout(() => gapInputs[0].focus(), 100);
  }
}

// Also update the verificarExercicioComCaixas function to handle array answers
function verificarExercicioComCaixas(correctAnswer) {
  const gapInputs = document.querySelectorAll('.gap-input');

  // Handle both string and array answers
  const answers = Array.isArray(correctAnswer)
    ? correctAnswer
    : String(correctAnswer).split(',');

  let allCorrect = true;
  const feedbackElement = document.getElementById('exerciseFeedback');

  gapInputs.forEach((input, index) => {
    const userAnswer = input.value.trim().toLowerCase();
    const possibleAnswers = answers[index]
      ? String(answers[index]).trim().toLowerCase().split('/')
      : [''];

    const isCorrect = possibleAnswers.some(correct =>
      userAnswer === correct.trim().toLowerCase()
    );

    if (isCorrect) {
      input.style.borderColor = '#4CAF50';
      input.style.backgroundColor = 'rgba(76,175,80,0.1)';
    } else {
      input.style.borderColor = '#F44336';
      input.style.backgroundColor = 'rgba(244,67,54,0.1)';
      allCorrect = false;
    }
    input.disabled = true;
  });

  const inlineBtn = document.getElementById('inlineCheckBtn');
  if (inlineBtn) inlineBtn.disabled = true;

  if (allCorrect) {
    grammarPoints++;
    grammarActiveExercises.splice(currentExerciseIndex, 1);

    feedbackElement.innerHTML = '<span style="color:#4CAF50;font-weight:600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';

    atualizarPontuacaoGrammar();
    setTimeout(proximoExercicio, 0.4);
  } else {
    grammarErrors++;

    feedbackElement.innerHTML = '<span style="color:#F44336;font-weight:600;">❌ Algumas respostas estão incorretas.</span>';
    feedbackElement.className = 'exercise-feedback incorrect';

    atualizarPontuacaoGrammar();
    setTimeout(proximoExercicio, 4000);
  }
}


function validarCampoPreenchido() {
  const userAnswerElement = document.getElementById('exerciseAnswer');
  if (userAnswerElement && !userAnswerElement.value.trim()) {
    const feedbackElement = document.getElementById('exerciseFeedback');
    feedbackElement.innerHTML = '<span style="color: #FF9800; font-weight: 600;">⚠️ Please provide an answer first!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    return false;
  }
  return true;
}



function filtrarExerciciosPorModo(exercises, modoSelecionado) {
  if (modoSelecionado === 'all') {
    return exercises;
  }
  return exercises.filter(exercise => exercise.mode === modoSelecionado);
}



// Nova função para criar exercícios com lacunas
function criarExercicioComLacunas(exercise, modeDisplay = '') {
  // Dividir a pergunta nas lacunas
  const parts = exercise.question.split('_____');
  const numGaps = parts.length - 1;

  // Criar HTML com campos de entrada para cada lacuna
  let questionHTML = `
    ${modeDisplay}
    <div class="exercise-title">${exercise.instruction}</div>
    <div class="exercise-content" style="font-size: 1.1rem; line-height: 1.6;">
  `;

  parts.forEach((part, index) => {
    questionHTML += part;
    if (index < numGaps) {
      questionHTML += `
        <input type="text" class="gap-input" id="gap${index}" data-index="${index}" 
               style="min-width: 150px; width: 150px; padding: 10px 20px; font-size: 1.1rem;
                      border: 2px solid #8A2BE2; border-radius: 8px; margin: 0 10px;"
               placeholder="________" oninput="ajustarLarguraInput(this)">
      `;
    }
  });

  questionHTML += `</div>`;

  document.getElementById('exerciseContainer').innerHTML = questionHTML + `
  <div class="exercise-buttons" style="margin-top: 25px; text-align: center;">
    <button class="check-btn" id="inlineCheckBtn" style="padding: 12px 24px; font-size: 1.1rem;">✓ Verificar Resposta</button>
  </div>
  <div class="exercise-feedback" id="exerciseFeedback" style="margin-top: 20px;"></div>
  <div class="exercise-answer" id="exerciseCorrectAnswer" style="display: none; margin-top: 15px;">
    <strong>Resposta correta:</strong> <span style="font-weight: 600;">${exercise.answer.replace(/\//g, ' ou ')}</span>
  </div>
`;

  // Adicionar event listeners
  const gapInputs = document.querySelectorAll('.gap-input');
  gapInputs.forEach((input, index) => {
    input.addEventListener('input', function () {
      ajustarLarguraInput(this);

      // Auto-foco no próximo campo
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verificarExercicioComLacunas(exercise.answer);
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIndex = parseInt(this.dataset.index) + 1;
        const nextInput = document.getElementById(`gap${nextIndex}`);
        if (nextInput) nextInput.focus();
      }
    });
  });

  // Adicionar event listener ao botão de verificação
  document.getElementById('inlineCheckBtn').addEventListener('click', function () {
    verificarExercicioComLacunas(exercise.answer);
  });

  // Focar no primeiro campo
  if (gapInputs.length > 0) {
    setTimeout(() => gapInputs[0].focus(), 100);
  }
}

// FUNÇÃO PARA AJUSTAR LARGURA DINAMICAMENTE
function ajustarLarguraInput(input) {
  // Largura mínima aumentada significativamente
  const minWidth = 150;
  // Largura por caractere (valor mais generoso)
  const charWidth = 12;
  // Padding lateral generoso
  const padding = 40;

  // Calcular largura baseada no conteúdo, mas ser mais generoso
  const contentWidth = Math.max(minWidth, (input.value.length * charWidth) + padding);

  // Aplicar largura (mínimo 150px)
  input.style.width = contentWidth + 'px';

  // Permitir que o campo cresça conforme necessário
  input.style.minWidth = contentWidth + 'px';
}


// Função para calcular a largura do campo de entrada com base no conteúdo - VERSÃO MELHORADA
function calculateInputWidth(text) {
  const minWidth = 100; // Largura mínima significativamente aumentada
  const charWidth = 10; // Largura por caractere aumentada (considerando font-weight: 500)
  const padding = 40; // Espaço para padding lateral (20px de cada lado)
  return Math.max(minWidth, (text.length * charWidth) + padding) + 'px';
}

// Modificar a função criarExercicioComLacunas para garantir melhor visualização
function criarExercicioComLacunas(exercise) {
  // Dividir a pergunta nas lacunas
  const parts = exercise.question.split('_____');
  const numGaps = parts.length - 1;

  // Criar HTML com campos de entrada para cada lacuna
  let questionHTML = `<div class="exercise-title">${exercise.instruction}</div><div class="exercise-content">`;

  parts.forEach((part, index) => {
    questionHTML += part;
    if (index < numGaps) {
      // Obter resposta esperada para este gap (se existir)
      const expectedAnswer = exercise.answer.split(',')[index] || '';
      // Adicionar um pouco de largura extra para garantir que não haja corte
      const extraWidth = 15; // pixels extras para garantir
      const calculatedWidth = parseInt(calculateInputWidth(expectedAnswer)) + extraWidth;

      questionHTML += `<input type="text" class="gap-input" id="gap${index}" data-index="${index}" style="width: ${calculatedWidth}px" placeholder="________">`;
    }
  });

  questionHTML += `</div>`;

  document.getElementById('exerciseContainer').innerHTML = questionHTML + `
  <div class="exercise-buttons" style="margin-top: 20px; text-align: center;">
    <button class="check-btn" id="inlineCheckBtn" style="padding: 10px 20px;">
      ✓ Verificar Resposta
    </button>
  </div>
  <div class="exercise-feedback" id="exerciseFeedback"></div>
  <div class="exercise-answer" id="exerciseCorrectAnswer" style="display: none;">
    <strong>Resposta correta:</strong> <span>${exercise.answer.replace(/\//g, ' ou ')}</span>
  </div>
`;

  // Adicionar event listeners aos campos de entrada
  const gapInputs = document.querySelectorAll('.gap-input');
  gapInputs.forEach(input => {
    // Ajustar a largura inicial baseada no placeholder
    input.style.width = calculateInputWidth("________");

    input.addEventListener('input', function () {
      // Ajustar a largura do campo conforme o conteúdo
      // Adicionar largura extra para garantir que não haja corte
      const extraWidth = 15;
      const calculatedWidth = parseInt(calculateInputWidth(this.value)) + extraWidth;
      this.style.width = calculatedWidth + 'px';

      // Mover para o próximo campo quando este estiver preenchido

    });

    input.addEventListener('keydown', function (e) {
      // Navegar entre campos com a tecla Tab ou Enter
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const nextIndex = parseInt(this.dataset.index) + 1;
        const nextInput = document.getElementById(`gap${nextIndex}`);
        if (nextInput) {
          nextInput.focus();
        } else {
          // Se não há próximo campo, focar no botão de verificação
          document.getElementById('inlineCheckBtn').focus();
        }
      }

      // Voltar para o campo anterior com Shift+Tab
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const prevIndex = parseInt(this.dataset.index) - 1;
        const prevInput = document.getElementById(`gap${prevIndex}`);
        if (prevInput) {
          prevInput.focus();
        }
      }
    });
  });

  // Adicionar event listener ao botão de verificação
  document.getElementById('inlineCheckBtn').addEventListener('click', function () {
    verificarExercicioComLacunas(exercise.answer);
  });

  // Permitir verificação com Enter no último campo
  if (gapInputs.length > 0) {
    const lastInput = gapInputs[gapInputs.length - 1];
    lastInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        verificarExercicioComLacunas(exercise.answer);
      }
    });
  }

  // Focar no primeiro campo
  if (gapInputs.length > 0) {
    setTimeout(() => gapInputs[0].focus(), 100);
  }
}

function criarExercicioComCaixasPorGrupo(exercise) {
  // Usar regex para encontrar grupos de underscores consecutivos
  const regex = /(_{2,})/g;
  const parts = exercise.question.split(regex);

  let questionHTML = `
    <div class="exercise-title">${exercise.instruction}</div>
    <div class="exercise-content" style="font-size: 1.1rem; line-height: 1.6; display: flex; flex-wrap: wrap; align-items: center;">
  `;

  let gapCount = 0;

  // CORREÇÃO: Handle both string and array answers properly
  let answers;
  if (Array.isArray(exercise.answer)) {
    answers = exercise.answer;
  } else {
    // Se for string, converter para array (separando por vírgula se necessário)
    answers = typeof exercise.answer === 'string' ? exercise.answer.split(',') : [exercise.answer];
  }

  parts.forEach(part => {
    if (part.startsWith('_') && part.length >= 2) {
      // É um grupo de underscores - criar UMA caixa de texto
      const answerValue = answers[gapCount] ? String(answers[gapCount]).trim() : '';
      questionHTML += `
         <input type="text" class="gap-input" data-index="${gapCount}" 
               data-answer="${answerValue.replace(/"/g, '&quot;')}"
               style="min-width: 120px; width: 120px; padding: 8px 12px; 
                      margin: 0 5px; border: 2px solid #8A2BE2; border-radius: 6px;"
               placeholder="________" oninput="ajustarLarguraInput(this)">
      `;
      gapCount++;
    } else {
      // É texto normal
      questionHTML += `<span class="sentence-text">${part}</span>`;
    }
  });

  // CORREÇÃO: Display answer correctly for both array and string
  const answerDisplay = Array.isArray(exercise.answer)
    ? exercise.answer.join(', ')
    : exercise.answer;

  questionHTML += `</div>`;

  document.getElementById('exerciseContainer').innerHTML = questionHTML + `
    <div class="exercise-buttons" style="margin-top: 20px; text-align: center;">
      <button class="check-btn" id="inlineCheckBtn" style="padding: 10px 20px;">
        ✓ Verificar Resposta
      </button>
    </div>
    <div class="exercise-feedback" id="exerciseFeedback"></div>
    <div class="exercise-answer" id="exerciseCorrectAnswer" style="display: none;">
      <strong>Resposta correta:</strong> <span>${answerDisplay}</span>
    </div>
  `;

  // Adicionar event listeners
  const gapInputs = document.querySelectorAll('.gap-input');
  gapInputs.forEach((input, index) => {
    input.addEventListener('input', function () {
      ajustarLarguraInput(this);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verificarExercicioComCaixas(exercise.answer);
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIndex = parseInt(this.dataset.index) + 1;
        const nextInput = document.querySelector(`.gap-input[data-index="${nextIndex}"]`);
        if (nextInput) nextInput.focus();
      }
    });
  });

  // Adicionar event listener ao botão de verificação
  document.getElementById('inlineCheckBtn').addEventListener('click', function () {
    verificarExercicioComCaixas(exercise.answer);
  });

  // Focar no primeiro campo
  if (gapInputs.length > 0) {
    setTimeout(() => gapInputs[0].focus(), 100);
  }
}

// Nova função para verificar exercícios com lacunas - COM AUTOAVANÇO
// Na função verificarExercicioComLacunas:
function verificarExercicioComLacunas(correctAnswer) {
  const gapInputs = document.querySelectorAll('.gap-input');

  // Garantir que as respostas sejam um array
  let answers;
  if (Array.isArray(correctAnswer)) {
    answers = correctAnswer;
  } else {
    answers = correctAnswer.split(',');
  }

  let allCorrect = true;
  const feedbackElement = document.getElementById('exerciseFeedback');

  gapInputs.forEach((input, index) => {
    const userAnswer = input.value.trim().toLowerCase();

    // Verificar se há múltiplas respostas possíveis (separadas por "/")
    let possibleAnswers;
    if (Array.isArray(answers[index])) {
      possibleAnswers = answers[index].map(a => a.trim().toLowerCase());
    } else {
      possibleAnswers = answers[index] ?
        answers[index].trim().toLowerCase().split('/') :
        [''];
    }

    // ... resto do código permanece o mesmo


    // Verificar se a resposta do usuário corresponde a qualquer uma das possibilidades
    const isCorrect = possibleAnswers.some(correct =>
      userAnswer === correct.trim().toLowerCase()
    );

    if (isCorrect) {
      input.style.borderColor = '#4CAF50';
      input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
      input.style.color = '#2E7D32';
    } else {
      input.style.borderColor = '#F44336';
      input.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
      input.style.color = '#C62828';
      allCorrect = false;

      // Mostrar as respostas corretas possíveis
      const originalPlaceholder = input.placeholder;
      input.placeholder = possibleAnswers.join(' ou ');
      setTimeout(() => {
        input.placeholder = originalPlaceholder;
      }, 3000);
    }

    // Desabilitar a edição após verificação
    input.disabled = true;
  });

  // Resto da função permanece igual...
  document.getElementById('inlineCheckBtn').disabled = true;

  if (allCorrect) {
    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';
    iniciarContagemRegressiva();
    setTimeout(() => {
      proximoExercicio();
    }, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color: #F44336; font-weight: 600;">❌ Algumas respostas estão incorretas. Tente novamente!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';
    document.getElementById('exerciseCorrectAnswer').style.display = 'block';



    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.textContent = '🔄 Tentar Novamente';
    tryAgainBtn.className = 'reset-btn';
    tryAgainBtn.style.marginTop = '15px';
    tryAgainBtn.onclick = () => {
      gapInputs.forEach(input => {
        input.disabled = false;
        input.style.borderColor = '#8A2BE2';
        input.style.backgroundColor = 'white';
        input.style.color = 'inherit';
        input.value = ''; // Limpar o campo
      });
      document.getElementById('inlineCheckBtn').disabled = false;
      feedbackElement.innerHTML = '';
      document.getElementById('exerciseCorrectAnswer').style.display = 'none';
      tryAgainBtn.remove();
      if (gapInputs.length > 0) {
        gapInputs[0].focus();
      }
    };
    feedbackElement.appendChild(tryAgainBtn);
  }
}
// Adicione esta função temporária para debug



function verificarExercicioComCaixas(correctAnswer) {
  const gapInputs = document.querySelectorAll('.gap-input');

  // Handle both string and array answers
  const answers = Array.isArray(correctAnswer)
    ? correctAnswer
    : String(correctAnswer).split(',');

  let allCorrect = true;
  const feedbackElement = document.getElementById('exerciseFeedback');

  gapInputs.forEach((input, index) => {
    const userAnswer = input.value.trim().toLowerCase();
    const possibleAnswers = answers[index]
      ? String(answers[index]).trim().toLowerCase().split('/')
      : [''];

    const isCorrect = possibleAnswers.some(correct =>
      userAnswer === correct.trim().toLowerCase()
    );

    if (isCorrect) {
      input.style.borderColor = '#4CAF50';
      input.style.backgroundColor = 'rgba(76,175,80,0.1)';
    } else {
      input.style.borderColor = '#F44336';
      input.style.backgroundColor = 'rgba(244,67,54,0.1)';
      allCorrect = false;
    }
    input.disabled = true;
  });

  const inlineBtn = document.getElementById('inlineCheckBtn');
  if (inlineBtn) inlineBtn.disabled = true;

  if (allCorrect) {
    feedbackElement.innerHTML = '<span style="color:#4CAF50;font-weight:600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';
    setTimeout(proximoExercicio, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color:#F44336;font-weight:600;">❌ Algumas respostas estão incorretas.</span>';
    feedbackElement.className = 'exercise-feedback incorrect';
    const correct = document.getElementById('exerciseCorrectAnswer');
    if (correct) correct.style.display = 'block';
    setTimeout(proximoExercicio, 4000);
  }
}
function iniciarContagemRegressiva() {
  const feedbackElement = document.getElementById('exerciseFeedback');
  let secondsLeft = 2;

  // Atualizar imediatamente
  feedbackElement.innerHTML = `<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Avançando em ${secondsLeft}...</span>`;

  const countdownInterval = setInterval(() => {
    secondsLeft--;

    if (secondsLeft >= 0) {
      feedbackElement.innerHTML = `<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Avançando em ${secondsLeft}...</span>`;
    }

    if (secondsLeft < 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}
function filtrarExerciciosPorModo(exercises, modoSelecionado) {
  if (modoSelecionado === 'all') {
    return exercises;
  }
  return exercises.filter(exercise => exercise.mode === modoSelecionado);
}

// Modificar a função verificarExercicio para também ter autoavanço
// Modificar a função verificarExercicio para lidar corretamente com exercícios rewrite
function verificarExercicio() {
  const userAnswerElement = document.getElementById('exerciseAnswer');

  // Verificar se o elemento existe
  if (!userAnswerElement) {
    console.error('Elemento exerciseAnswer não encontrado!');
    return;
  }

  const userAnswer = userAnswerElement.value.trim();

  // VALIDAÇÃO RIGOROSA: Não permitir resposta vazia
  if (!userAnswer) {
    const feedbackElement = document.getElementById('exerciseFeedback');
    feedbackElement.innerHTML = '<span style="color: #FF9800; font-weight: 600;">⚠️ Por favor, digite uma resposta primeiro!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    feedbackElement.style.display = 'block';
    return;
  }

  const feedbackElement = document.getElementById('exerciseFeedback');
  const exercise = currentGrammarTopic.exercises[currentExerciseIndex];

  // Obter as respostas válidas do exercício
  const possibleAnswers = obterRespostasValidas(exercise.answer);

  // Normalizar a resposta do usuário
  const normalizedUserAnswer = userAnswer.toLowerCase().replace(/\s+/g, ' ').trim();

  // Verificar se a resposta do usuário corresponde a qualquer uma das possibilidades
  const isCorrect = possibleAnswers.some(correct => {
    const normalizedCorrect = correct.toLowerCase().replace(/\s+/g, ' ').trim();
    console.log('Comparando:', normalizedUserAnswer, 'vs', normalizedCorrect);
    return normalizedUserAnswer === normalizedCorrect;
  });

  console.log('Está correto:', isCorrect, 'Respostas possíveis:', possibleAnswers);

  if (isCorrect) {
    grammarPoints++;
    grammarActiveExercises.splice(currentExerciseIndex, 1); // remove da pool

    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';
    feedbackElement.style.display = 'block';

    userAnswerElement.disabled = true;
    const inlineCheckBtn = document.getElementById('inlineCheckBtn');
    if (inlineCheckBtn) inlineCheckBtn.disabled = true;

    atualizarPontuacaoGrammar();

    iniciarContagemRegressiva();
    setTimeout(() => {
      proximoExercicio();
    }, 0.4);
  } else {
    grammarErrors++; // erro → volta pra pool

    feedbackElement.innerHTML = '<span style="color: #F44336; font-weight: 600;">❌ Incorreto. Tente novamente!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';
    feedbackElement.style.display = 'block';



    // Mostrar resposta correta
    const correctAnswerElement = document.getElementById('exerciseCorrectAnswer');
    if (correctAnswerElement) {
      correctAnswerElement.style.display = 'block';
      correctAnswerElement.innerHTML = `<strong>Resposta correta:</strong> ${possibleAnswers.join(' ou ')}`;
    }
    atualizarPontuacaoGrammar();
  }
}

// Nova função para obter respostas válidas do exercício
function obterRespostasValidas(answer) {
  let possibleAnswers = [];

  if (Array.isArray(answer)) {
    // Se for array, usar diretamente
    possibleAnswers = answer.map(a => a.trim());
  } else if (typeof answer === 'string') {
    // Se for string, dividir por "/" para obter múltiplas respostas válidas
    possibleAnswers = answer.split('/').map(a => a.trim());
  } else {
    console.error('Formato de resposta inválido:', answer);
    possibleAnswers = [''];
  }

  // Filtrar possíveis respostas vazias
  return possibleAnswers.filter(a => a !== '');
}

// Modificar a função criarExercicioComUmaCaixa para mostrar as respostas corretas
function criarExercicioComUmaCaixa(exercise, modeDisplay = '') {
  const exerciseContainer = document.getElementById('exerciseContainer');

  // Obter respostas válidas para exibir
  const possibleAnswers = obterRespostasValidas(exercise.answer);
  const answerText = possibleAnswers.join(' ou ');

  exerciseContainer.innerHTML = `
    ${modeDisplay}
    <div class="exercise-title">${exercise.instruction}</div>
    <div class="exercise-content">
      <div class="exercise-question">${exercise.question}</div>
      <div class="exercise-input-container">
        <input type="text" id="exerciseAnswer" 
               placeholder="Digite sua resposta aqui..." 
               class="exercise-input"
               style="width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #8A2BE2; border-radius: 8px; font-size: 16px;">
      </div>
    </div>
    <div class="exercise-buttons" style="margin-top: 20px; text-align: center;">
      <button class="check-btn" id="inlineCheckBtn" style="padding: 12px 24px; font-size: 16px; background-color: #8A2BE2; color: white; border: none; border-radius: 8px; cursor: pointer;">
        ✓ Verificar Resposta
      </button>
    </div>
    <div class="exercise-feedback" id="exerciseFeedback" style="margin-top: 15px; padding: 10px; border-radius: 5px;"></div>
    <div class="exercise-answer" id="exerciseCorrectAnswer" style="display: none; margin-top: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
      <strong>Resposta correta:</strong> <span>${answerText}</span>
    </div>
  `;

  // Adicionar event listener ao botão de verificação
  document.getElementById('inlineCheckBtn').addEventListener('click', function () {
    verificarExercicio();
  });

  // Permitir verificação com Enter
  document.getElementById('exerciseAnswer').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      verificarExercicio();
    }
  });

  // Focar no campo de resposta
  setTimeout(() => {
    document.getElementById('exerciseAnswer').focus();
  }, 100);
}

// Adicionar esta função para debug (pode remover depois)


// Nova função específica para verificar exercícios de rewrite
function verificarExercicioRewrite() {
  const userAnswerElement = document.getElementById('exerciseAnswer');
  if (!userAnswerElement) {
    alert('No answer field found.');
    return;
  }

  const userAnswer = userAnswerElement.value.trim();

  // VERIFICAÇÃO CRÍTICA: Não permitir resposta vazia
  if (!userAnswer) {
    const feedbackElement = document.getElementById('exerciseFeedback');
    feedbackElement.innerHTML = '<span style="color: #FF9800; font-weight: 600;">⚠️ Please provide an answer first!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    return;
  }

  const feedbackElement = document.getElementById('exerciseFeedback');
  const exercise = currentGrammarTopic.exercises[currentExerciseIndex];

  // Garantir que as respostas sejam um array
  let possibleAnswers;
  if (Array.isArray(exercise.answer)) {
    possibleAnswers = exercise.answer.map(a => a.trim());
  } else {
    // Dividir por "/" para múltiplas respostas aceitáveis
    possibleAnswers = exercise.answer.split('/').map(a => a.trim());
  }

  // Normalizar a resposta do usuário (remover espaços extras, tornar minúscula)
  const normalizedUserAnswer = userAnswer.toLowerCase().replace(/\s+/g, ' ').trim();

  // Verificar se a resposta do usuário corresponde a qualquer uma das possibilidades
  const isCorrect = possibleAnswers.some(correct => {
    const normalizedCorrect = correct.toLowerCase().replace(/\s+/g, ' ').trim();
    console.log('Comparing:', normalizedUserAnswer, 'vs', normalizedCorrect);
    return normalizedUserAnswer === normalizedCorrect;
  });

  console.log('Is correct:', isCorrect, 'Possible answers:', possibleAnswers);

  if (isCorrect) {
    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correct! Well done!</span>';
    feedbackElement.className = 'exercise-feedback correct';

    // Desabilitar campos e botões
    userAnswerElement.disabled = true;
    const inlineCheckBtn = document.getElementById('inlineCheckBtn');
    if (inlineCheckBtn) inlineCheckBtn.disabled = true;

    // Autoavanço após 2 segundos
    setTimeout(() => {
      proximoExercicio();
    }, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color: #F44336; font-weight: 600;">❌ Incorrect. Try again!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';

    // Mostrar resposta correta
    const correctAnswerElement = document.getElementById('exerciseCorrectAnswer');
    if (correctAnswerElement) {
      correctAnswerElement.style.display = 'block';
      correctAnswerElement.innerHTML = `<strong>Correct answer:</strong> ${possibleAnswers.join(' or ')}`;
    }
  }
}
function verificarRespostaNormal(userAnswer, exercise) {
  const feedbackElement = document.getElementById('exerciseFeedback');

  // Garantir que as respostas sejam um array
  let possibleAnswers;
  if (Array.isArray(exercise.answer)) {
    possibleAnswers = exercise.answer.map(a => a.trim());
  } else {
    // Dividir por "/" para múltiplas respostas aceitáveis
    possibleAnswers = exercise.answer.split('/').map(a => a.trim());
  }

  // Normalizar a resposta do usuário
  const normalizedUserAnswer = userAnswer.toLowerCase().replace(/\s+/g, ' ').trim();

  // Verificar se a resposta do usuário corresponde a qualquer uma das possibilidades
  const isCorrect = possibleAnswers.some(correct => {
    const normalizedCorrect = correct.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalizedUserAnswer === normalizedCorrect;
  });

  if (isCorrect) {
    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correct! Well done!</span>';
    feedbackElement.className = 'exercise-feedback correct';

    // Desabilitar campos e botões
    const userAnswerElement = document.getElementById('exerciseAnswer');
    if (userAnswerElement) userAnswerElement.disabled = true;
    const inlineCheckBtn = document.getElementById('inlineCheckBtn');
    if (inlineCheckBtn) inlineCheckBtn.disabled = true;

    // Autoavanço após 2 segundos
    setTimeout(() => {
      proximoExercicio();
    }, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color: #F44336; font-weight: 600;">❌ Incorrect. Try again!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';

    // Mostrar resposta correta
    const correctAnswerElement = document.getElementById('exerciseCorrectAnswer');
    if (correctAnswerElement) {
      correctAnswerElement.style.display = 'block';
      correctAnswerElement.innerHTML = `<strong>Correct answer:</strong> ${possibleAnswers.join(' or ')}`;
    }
  }
}

// Adicionar contagem regressiva visual para o autoavanço
function iniciarContagemRegressiva() {
  const feedbackElement = document.getElementById('exerciseFeedback');
  let secondsLeft = 2;

  const countdownInterval = setInterval(() => {
    feedbackElement.innerHTML = `<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Avançando em ${secondsLeft}...</span>`;
    secondsLeft--;

    if (secondsLeft < 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}



function verificarExercicio() {
  // Verificar se é exercício com lacunas
  const gapInputs = document.querySelectorAll('.gap-input');
  if (gapInputs.length > 0) {
    const exercise = currentGrammarTopic.exercises[currentExerciseIndex];
    verificarExercicioComLacunas(exercise.answer);
    return;
  }

  // Verificar se é exercício com caixas
  const gapInputsUnderscore = document.querySelectorAll('input[type="text"]');
  if (gapInputsUnderscore.length > 0) {
    const exercise = currentGrammarTopic.exercises[currentExerciseIndex];
    verificarExercicioComCaixas(exercise.answer);
    return;
  }

  // Exercício normal com campo único (como rewrite)
  const userAnswerElement = document.getElementById('exerciseAnswer');
  if (!userAnswerElement) {
    alert('No answer field found.');
    return;
  }

  const userAnswer = userAnswerElement.value.trim();

  // VERIFICAÇÃO CRÍTICA: Não permitir resposta vazia
  if (!userAnswer) {
    const feedbackElement = document.getElementById('exerciseFeedback');
    feedbackElement.innerHTML = '<span style="color: #FF9800; font-weight: 600;">⚠️ Please provide an answer first!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    return;
  }

  const feedbackElement = document.getElementById('exerciseFeedback');
  const exercise = currentGrammarTopic.exercises[currentExerciseIndex];

  // Garantir que as respostas sejam um array (caso answer seja string ou array)
  let possibleAnswers;
  if (Array.isArray(exercise.answer)) {
    possibleAnswers = exercise.answer.map(a => a.trim());
  } else {
    // Dividir por "/" primeiro, depois por "," se necessário
    possibleAnswers = exercise.answer.split('/').map(a => a.trim());
  }


  // E também remover espaços extras para comparação mais flexível
  const normalizedUserAnswer = userAnswer.toLowerCase().replace(/\s+/g, ' ').trim();

  const isCorrect = possibleAnswers.some(correct => {
    const normalizedCorrect = correct.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalizedUserAnswer === normalizedCorrect;
  });

  if (isCorrect) {
    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correct! Well done!</span>';
    feedbackElement.className = 'exercise-feedback correct';

    // Desabilitar campos e botões
    userAnswerElement.disabled = true;
    const inlineCheckBtn = document.getElementById('inlineCheckBtn');
    if (inlineCheckBtn) inlineCheckBtn.disabled = true;

    // Autoavanço após 2 segundos
    setTimeout(() => {
      proximoExercicio();
    }, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color: #F44336; font-weight: 600;">❌ Incorrect. Try again!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';

    // Mostrar resposta correta
    const correctAnswerElement = document.getElementById('exerciseCorrectAnswer');
    if (correctAnswerElement) {
      correctAnswerElement.style.display = 'block';
      correctAnswerElement.innerHTML = `<strong>Correct answer:</strong> ${possibleAnswers.join(' or ')}`;
    }
  }
}

function mostrarResposta() {
  const exercise = currentGrammarTopic.exercises[currentExerciseIndex];
  const correctAnswerElement = document.getElementById('exerciseCorrectAnswer');

  correctAnswerElement.style.display = 'block';

  // Desabilitar o botão de mostrar resposta após clicar
  document.getElementById('btnShowAnswer').disabled = true;
}

function proximoExercicio() {
  const topicSelect = document.getElementById('grammarSelect');
  const selectedTopic = topicSelect.value;
  const modeSelect = document.getElementById('grammarModeSelect');
  const selectedMode = modeSelect.value;

  // Se estiver no modo Random Topic, escolher um novo tópico aleatório
  if (selectedTopic === 'random') {
    const randomIndex = Math.floor(Math.random() * grammarTopics.length);
    const randomTopic = grammarTopics[randomIndex];

    currentGrammarTopic = randomTopic;
    // Escolher um exercício aleatório do novo tópico
    currentExerciseIndex = Math.floor(Math.random() * currentGrammarTopic.exercises.length);

    console.log(`Random topic selected: ${randomTopic.topic}`);
  } else {
    // Para tópicos específicos, avançar para o próximo exercício
    // Mas escolher aleatoriamente em vez de sequencialmente
    const exerciciosFiltrados = filtrarExerciciosPorModo(currentGrammarTopic.exercises, selectedMode);
    currentExerciseIndex = Math.floor(Math.random() * exerciciosFiltrados.length);
  }

  // Limpar estilos e reativar campos
  const gapInputs = document.querySelectorAll('.gap-input');
  gapInputs.forEach(input => {
    input.disabled = false;
    input.style.borderColor = '';
    input.style.backgroundColor = '';
  });

  const exerciseInput = document.getElementById('exerciseAnswer');
  if (exerciseInput) {
    exerciseInput.disabled = false;
    exerciseInput.value = '';
  }

  const inlineCheckBtn = document.getElementById('inlineCheckBtn');
  if (inlineCheckBtn) {
    inlineCheckBtn.disabled = false;
  }

  // Filtrar exercícios pelo modo selecionado
  let exerciciosFiltrados = filtrarExerciciosPorModo(currentGrammarTopic.exercises, selectedMode);

  // Continuar com os exercícios FILTRADOS
  iniciarExercicios(exerciciosFiltrados);
}

function resetarExercicios() {
  grammarActiveExercises = [];
  grammarUsedExercises = [];
  grammarPoints = 0;
  grammarErrors = 0;
  atualizarPontuacaoGrammar();

  document.getElementById('exerciseContainer').innerHTML = `
    <div class="empty-message">
      <p>Exercises have been reset.</p>
      <p>Select a grammar topic and click "Practice Grammar" to begin.</p>
    </div>
  `;

  document.getElementById('grammarPractice').style.display = 'none';
  document.getElementById('btnCheckExercise').disabled = true;
  document.getElementById('btnNextExercise').disabled = false;

  // Resetar botão de verificação
  document.getElementById('btnCheckExercise').style.display = 'flex';
}

function atualizarPontuacaoGrammar() {
  document.getElementById('grammarPoints').textContent = grammarPoints;
  document.getElementById('grammarErrors').textContent = grammarErrors;
  document.getElementById('grammarTotal').textContent = grammarPoints + grammarErrors;
}


// --- FUNÇÕES DE PHRASAL VERBS ---
function filtrarPhrasalVerbs() {
  const nivel = document.getElementById('phrasalLevelSelect').value;

  let listaFiltrada = [...phrasalVerbsOriginal];

  // Filtrar por nível
  if (nivel !== 'all') {
    listaFiltrada = listaFiltrada.filter(pv => pv && pv.level === nivel);
  }

  phrasalVerbsFiltrados = listaFiltrada;
  phrasalVerbsAtivos = [...phrasalVerbsFiltrados];
  phrasalVerbsUsados = [];
  currentPhrasalVerb = null;

  // Atualizar o select de main verbs com base no nível selecionado
  atualizarSelectMainVerbs(nivel);

  // Filtrar também por main verb se algum estiver selecionado
  const mainVerb = document.getElementById('phrasalVerbSelect').value;
  if (mainVerb !== 'all') {
    phrasalVerbsFiltrados = phrasalVerbsFiltrados.filter(pv => pv && pv.verb === mainVerb);
    phrasalVerbsAtivos = [...phrasalVerbsFiltrados];
  }

  // Atualizar o botão baseado na disponibilidade
  document.getElementById("btnDrawPhrasal").disabled = phrasalVerbsFiltrados.length === 0;

  // Limpar display se não houver resultados
  if (phrasalVerbsFiltrados.length === 0) {
    document.getElementById("phrasalCard").style.display = "none";
    const emptyMsg = document.querySelector('#phrasalControls .empty-message');
    if (!emptyMsg) {
      document.getElementById("phrasalControls").insertAdjacentHTML('beforeend',
        '<div class="empty-message">No phrasal verbs found for the selected filters.</div>');
    }
  } else {
    const emptyMsg = document.querySelector('#phrasalControls .empty-message');
    if (emptyMsg) emptyMsg.remove();
  }

  atualizarBotoes();
}

// Adicionar esta função para garantir que os selects tenham valores válidos


// Nova função para atualizar o select de main verbs baseado no nível
function atualizarSelectMainVerbs(nivel) {
  const phrasalVerbSelect = document.getElementById('phrasalVerbSelect');

  // Obter todos os phrasal verbs do nível selecionado (ou todos se for 'all')
  let phrasalVerbsParaFiltrar;
  if (nivel === 'all') {
    phrasalVerbsParaFiltrar = [...phrasalVerbsOriginal];
  } else {
    phrasalVerbsParaFiltrar = phrasalVerbsOriginal.filter(pv => pv.level === nivel);
  }

  // Obter verbos principais únicos do nível selecionado
  const mainVerbs = [...new Set(phrasalVerbsParaFiltrar.map(pv => pv.verb))].sort();

  // Salvar o valor atual selecionado
  const valorAtual = phrasalVerbSelect.value;

  // Atualizar o select
  phrasalVerbSelect.innerHTML = '<option value="all">All Verbs</option>';
  mainVerbs.forEach(verb => {
    const option = document.createElement('option');
    option.value = verb;
    option.textContent = verb;
    phrasalVerbSelect.appendChild(option);
  });

  // Tentar manter a seleção anterior se ainda estiver disponível
  if (mainVerbs.includes(valorAtual)) {
    phrasalVerbSelect.value = valorAtual;
  } else {
    phrasalVerbSelect.value = 'all';
  }
}
function atualizarSelectMainVerbs(nivel) {
  const phrasalVerbSelect = document.getElementById('phrasalVerbSelect');

  // Obter todos os phrasal verbs do nível selecionado (ou todos se for 'all')
  let phrasalVerbsParaFiltrar;
  if (nivel === 'all') {
    phrasalVerbsParaFiltrar = [...phrasalVerbsOriginal];
  } else {
    phrasalVerbsParaFiltrar = phrasalVerbsOriginal.filter(pv => pv.level === nivel);
  }

  // Obter verbos principais únicos do nível selecionado
  const mainVerbs = [...new Set(phrasalVerbsParaFiltrar.map(pv => pv.verb))].sort();

  // Salvar o valor atual selecionado
  const valorAtual = phrasalVerbSelect.value;

  // Atualizar o select
  phrasalVerbSelect.innerHTML = '<option value="all">All Verbs</option>';
  mainVerbs.forEach(verb => {
    const option = document.createElement('option');
    option.value = verb;
    option.textContent = verb;
    phrasalVerbSelect.appendChild(option);
  });

  // Tentar manter a seleção anterior se ainda estiver disponível
  if (mainVerbs.includes(valorAtual)) {
    phrasalVerbSelect.value = valorAtual;
  } else {
    phrasalVerbSelect.value = 'all';
  }
}

function sortearPhrasalVerb() {
  const container = document.getElementById("phrasalControls");
  const existingEmptyMessage = document.querySelector('#phrasalControls .empty-message');

  if (existingEmptyMessage) existingEmptyMessage.remove();

  if (phrasalVerbsAtivos.length === 0) {
    if (phrasalVerbsUsados.length > 0) {
      container.insertAdjacentHTML('beforeend',
        '<div class="empty-message">🎉 All phrasal verbs for this filter have been practiced!<br><button class="reset-btn" onclick="resetarPhrasalVerbs()">Reset</button></div>');
    } else {
      container.insertAdjacentHTML('beforeend',
        '<div class="empty-message">No phrasal verbs found for the current filters.</div>');
    }
    document.getElementById("btnDrawPhrasal").disabled = true;
    return;
  }

  const randomIndex = Math.floor(Math.random() * phrasalVerbsAtivos.length);
  currentPhrasalVerb = phrasalVerbsAtivos[randomIndex];
  phrasalVerbsAtivos.splice(randomIndex, 1);
  phrasalVerbsUsados.push(currentPhrasalVerb);

  // Exibir o phrasal verb
  exibirPhrasalVerb(currentPhrasalVerb);

  atualizarBotoes();
}


// Na função exibirPhrasalVerb, altere para:
// Na função exibirPhrasalVerb, altere para:
function exibirPhrasalVerb(phrasalVerb) {
  const phrasalCard = document.getElementById('phrasalCard');
  phrasalCard.style.display = 'block';

  document.getElementById('phrasalLevel').className = `difficulty ${phrasalVerb.level}`;
  document.getElementById('phrasalLevel').textContent = phrasalVerb.level;
  document.getElementById('phrasalVerb').textContent = phrasalVerb.phrasal_verb;
  document.getElementById('phrasalTranslation').textContent = phrasalVerb.translation;

  // ✅ Definir a definição em inglês e português (sempre visível)
  document.getElementById("phrasalDefinition").innerHTML = `
    <strong>English:</strong> ${phrasalVerb.definition_en || "—"}<br>
    <strong>Português:</strong> ${phrasalVerb.definition_pt || "—"}
  `;

  // Destacar o phrasal verb no exemplo
  let exemploDestacado = phrasalVerb.example;
  if (phrasalVerb.phrasal_verb && phrasalVerb.example) {
    const regex = new RegExp(`\\b${phrasalVerb.phrasal_verb}\\b`, 'gi');
    exemploDestacado = phrasalVerb.example.replace(regex, `<span class="vocab-highlight">$&</span>`);
  }

  document.getElementById('phrasalExample').innerHTML = `Example: ${exemploDestacado}`;

  // Garantir que a definição está sempre visível
  document.getElementById('phrasalDefinition').style.display = 'block';

  // Esconder apenas a tradução inicialmente
  document.getElementById('phrasalTranslation').style.display = 'none';
}

// Na função mostrarSignificadoPhrasal, altere para:
function mostrarSignificadoPhrasal() {
  const translationElement = document.getElementById('phrasalTranslation');

  // Apenas mostrar/ocultar a tradução, mantendo a definição sempre visível
  if (translationElement.style.display === 'none') {
    translationElement.style.display = 'block';
  } else {
    translationElement.style.display = 'none';
  }

  // A definição deve permanecer sempre visível
  document.getElementById('phrasalDefinition').style.display = 'block';
}

// Na função mostrarSignificadoPhrasal, altere para:
function mostrarSignificadoPhrasal() {
  const translationElement = document.getElementById('phrasalTranslation');

  // Apenas mostrar/ocultar a tradução
  if (translationElement.style.display === 'none') {
    translationElement.style.display = 'block';
  } else {
    translationElement.style.display = 'none';
  }

  // Forçar a definição a permanecer visível (em caso de algum bug)
  document.getElementById('phrasalDefinition').style.display = 'block';
}


function resetarPhrasalVerbs() {
  filtrarPhrasalVerbs(); // Isso recarrega os phrasal verbs com os filtros atuais

  const emptyMessage = document.querySelector('#phrasalControls .empty-message');
  if (emptyMessage) emptyMessage.remove();

  document.getElementById("phrasalCard").style.display = "none";

  atualizarBotoes();
}

function mostrarSignificadoPhrasal() {
  const translationElement = document.getElementById('phrasalTranslation');
  const definitionElement = document.getElementById('phrasalDefinition');

  translationElement.style.display = translationElement.style.display === 'none' ? 'block' : 'none';
  definitionElement.style.display = definitionElement.style.display === 'none' ? 'block' : 'none';
}

// --- FUNÇÕES DE UTILIDADE ---
function iniciarTimer() {
  const timerDisplay = document.getElementById('timerDisplay');
  const timeRemaining = document.getElementById('timeRemaining');

  // Mostrar o display do timer
  timerDisplay.style.display = 'flex';

  let secondsLeft = timerSeconds;
  timeRemaining.textContent = secondsLeft;

  // Atualizar a classe com base no tempo restante
  if (secondsLeft <= 10) {
    timerDisplay.classList.add('danger');
    timerDisplay.classList.remove('warning');
  } else if (secondsLeft <= 30) {
    timerDisplay.classList.add('warning');
    timerDisplay.classList.remove('danger');
  } else {
    timerDisplay.classList.remove('warning', 'danger');
  }

  // Limpar qualquer timer existente
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Iniciar novo timer
  timerInterval = setInterval(() => {
    secondsLeft--;
    timeRemaining.textContent = secondsLeft;

    // Atualizar a classe com base no tempo restante
    if (secondsLeft <= 10) {
      timerDisplay.classList.add('danger');
      timerDisplay.classList.remove('warning');
    } else if (secondsLeft <= 30) {
      timerDisplay.classList.add('warning');
      timerDisplay.classList.remove('danger');
    }

    // Quando o tempo acabar
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;

      // Mostrar notificação de tempo esgotado
      document.getElementById('timeUpNotification').style.display = 'block';
    }
  }, 1000);
}

function falarTexto(texto, idioma = 'en-US') {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = idioma;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Seu navegador não suporta síntese de voz.');
  }
}

function salvarPergunta() {
  if (!currentQuestion) {
    alert('No question to save. Please draw a question first.');
    return;
  }

  // Verificar se a pergunta já foi salva
  const alreadySaved = savedQuestions.some(q => q.question === currentQuestion.question);

  if (!alreadySaved) {
    savedQuestions.push(currentQuestion);
    localStorage.setItem('savedQuestions', JSON.stringify(savedQuestions));
    alert('Question saved successfully!');
  } else {
    alert('This question is already saved.');
  }
}

function mostrarSalvas() {
  if (savedQuestions.length === 0) {
    alert('No saved questions yet.');
    return;
  }

  const savedList = savedQuestions.map((q, index) => `
    <div class="saved-item">
      <div class="difficulty ${q.level}">${q.level}</div>
      <div class="question-text">${q.question}</div>
      ${q.example ? `<div class="vocab-example"><strong>Example:</strong> ${q.example}</div>` : ''}
      <button class="secondary-button" onclick="removerSalva(${index})">Remove</button>
    </div>
  `).join('');

  document.getElementById("resultado").innerHTML = `
    <h3>Saved Questions (${savedQuestions.length})</h3>
    <div class="saved-questions">
      ${savedList}
    </div>
    <button class="reset-btn" onclick="limparSalvas()">Clear All Saved Questions</button>
  `;
}

function removerSalva(index) {
  savedQuestions.splice(index, 1);
  localStorage.setItem('savedQuestions', JSON.stringify(savedQuestions));
  mostrarSalvas();
}

function limparSalvas() {
  if (confirm('Are you sure you want to clear all saved questions?')) {
    savedQuestions = [];
    localStorage.removeItem('savedQuestions');
    document.getElementById("resultado").innerHTML = `
      <div class="empty-message">
        <p>All saved questions have been cleared.</p>
      </div>
    `;
  }
}
// === FIX: auto-avança em 2s mesmo quando ERRA ===
// Cole no FINAL do arquivo para sobrescrever versões anteriores.

function verificarExercicioComLacunas(correctAnswer) {
  const gapInputs = document.querySelectorAll('.gap-input');
  const answers = Array.isArray(correctAnswer) ? correctAnswer : String(correctAnswer).split(',');
  let allCorrect = true;
  const feedbackElement = document.getElementById('exerciseFeedback');

  gapInputs.forEach((input, index) => {
    const userAnswer = input.value.trim().toLowerCase();
    const possibleAnswers = Array.isArray(answers[index])
      ? answers[index].map(a => String(a).trim().toLowerCase())
      : (answers[index] ? String(answers[index]).trim().toLowerCase().split('/') : ['']);

    const isCorrect = possibleAnswers.some(correct => userAnswer === String(correct).trim().toLowerCase());

    if (isCorrect) {
      input.style.borderColor = '#4CAF50';
      input.style.backgroundColor = 'rgba(76,175,80,0.1)';
      input.style.color = '#2E7D32';
    } else {
      input.style.borderColor = '#F44336';
      input.style.backgroundColor = 'rgba(244,67,54,0.1)';
      input.style.color = '#C62828';
      allCorrect = false;
    }
    input.disabled = true;
  });

  const inlineBtn = document.getElementById('inlineCheckBtn');
  if (inlineBtn) inlineBtn.disabled = true;

  if (allCorrect) {
    grammarPoints++;
    grammarActiveExercises.splice(currentExerciseIndex, 1);

    feedbackElement.innerHTML = '<span style="color: #4CAF50; font-weight: 600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';


    setTimeout(proximoExercicio, 0.4);
  } else {
    grammarErrors++; // volta pra pool

    feedbackElement.innerHTML = '<span style="color:#F44336;font-weight:600;">❌ Algumas respostas estão incorretas.</span>';
    feedbackElement.className = 'exercise-feedback incorrect';

    // Mostrar resposta correta
    const correct = document.getElementById('exerciseCorrectAnswer');
    if (correct) correct.style.display = 'block';

    atualizarPontuacaoGrammar();
    setTimeout(proximoExercicio, 4000);
  }

}

function verificarExercicioComCaixas(correctAnswer) {
  const gapInputs = document.querySelectorAll('.gap-input');
  const answers = String(correctAnswer).split(',');
  let allCorrect = true;
  const feedbackElement = document.getElementById('exerciseFeedback');

  gapInputs.forEach((input, index) => {
    const userAnswer = input.value.trim().toLowerCase();
    const possibleAnswers = answers[index] ? answers[index].trim().toLowerCase().split('/') : [''];
    const isCorrect = possibleAnswers.some(correct => userAnswer === correct.trim().toLowerCase());

    if (isCorrect) {
      input.style.borderColor = '#4CAF50';
      input.style.backgroundColor = 'rgba(76,175,80,0.1)';
    } else {
      input.style.borderColor = '#F44336';
      input.style.backgroundColor = 'rgba(244,67,54,0.1)';
      allCorrect = false;
    }
    input.disabled = true;
  });

  const inlineBtn = document.getElementById('inlineCheckBtn');
  if (inlineBtn) inlineBtn.disabled = true;

  if (allCorrect) {
    grammarPoints++;
    grammarActiveExercises.splice(currentExerciseIndex, 1);

    feedbackElement.innerHTML = '<span style="color:#4CAF50;font-weight:600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';

    atualizarPontuacaoGrammar();
    setTimeout(proximoExercicio, 1000);
  } else {
  grammarErrors++;

  feedbackElement.innerHTML = '<span style="color:#F44336;font-weight:600;">❌ Algumas respostas estão incorretas.</span>';
  feedbackElement.className = 'exercise-feedback incorrect';

  // Mostrar resposta correta
  const correct = document.getElementById('exerciseCorrectAnswer');
  if (correct) correct.style.display = 'block';

  atualizarPontuacaoGrammar();
  setTimeout(proximoExercicio, 4000);
  }

}

function verificarExercicio() {
  // Se for exercício com lacunas/caixas, delega:
  const gaps = document.querySelectorAll('.gap-input');
  if (gaps.length) {
    const exercise = currentGrammarTopic.exercises[currentExerciseIndex];
    return verificarExercicioComLacunas(exercise.answer);
  }

  const userAnswerElement = document.getElementById('exerciseAnswer');
  if (!userAnswerElement) return;

  const userAnswer = userAnswerElement.value.trim();
  const feedbackElement = document.getElementById('exerciseFeedback');

  if (!userAnswer) {
    feedbackElement.innerHTML = '<span style="color:#FF9800;font-weight:600;">⚠️ Por favor, digite uma resposta primeiro!</span>';
    feedbackElement.className = 'exercise-feedback warning';
    return;
  }

  const exercise = currentGrammarTopic.exercises[currentExerciseIndex];
  const possibleAnswers = Array.isArray(exercise.answer) ? exercise.answer : String(exercise.answer).split('/');
  const normalizedUser = userAnswer.toLowerCase().replace(/\s+/g, ' ').trim();
  const isCorrect = possibleAnswers.some(a => normalizedUser === String(a).toLowerCase().replace(/\s+/g, ' ').trim());

  if (isCorrect) {
    feedbackElement.innerHTML = '<span style="color:#4CAF50;font-weight:600;">✅ Correto! Parabéns!</span>';
    feedbackElement.className = 'exercise-feedback correct';
    userAnswerElement.disabled = true;
    const inlineBtn = document.getElementById('inlineCheckBtn'); if (inlineBtn) inlineBtn.disabled = true;
    setTimeout(proximoExercicio, 0.4);
  } else {
    feedbackElement.innerHTML = '<span style="color:#F44336;font-weight:600;">❌ Incorreto. Tente novamente!</span>';
    feedbackElement.className = 'exercise-feedback incorrect';
    const correct = document.getElementById('exerciseCorrectAnswer');
    if (correct) correct.style.display = 'block';
    userAnswerElement.disabled = true;
    const inlineBtn = document.getElementById('inlineCheckBtn'); if (inlineBtn) inlineBtn.disabled = true;
    setTimeout(proximoExercicio, 4000);
  }
}


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', carregarDados);
