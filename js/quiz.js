// Biến lưu trạng thái quiz
let quizState = {
  currentQuestion: 0,
  answers: [],
  timer: {
    minutes: 0,
    seconds: 0,
    interval: null
  },
  quizStarted: false,
  quizCompleted: false,
  selectedQuestionFile: 'full_questions.json', // File câu hỏi mặc định
  mode: 'exam', // 'exam' hoặc 'study'
  studyMode: {
    answerRevealed: false,
    currentAnswer: null
  }
};

// Biến lưu dữ liệu quiz được load từ file
let quizData = null;

// Hàm đảo thứ tự mảng (Fisher-Yates shuffle)
function shuffleArray(array) {
  const shuffled = [...array]; // Tạo bản sao để không thay đổi mảng gốc
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Load dữ liệu từ file câu hỏi đã chọn
async function loadQuizData() {
  try {
    let data;
    
    // Kiểm tra xem có đang chạy từ file system không
    if (window.location.protocol === 'file:') {
      // Nếu chạy từ file system, sử dụng dữ liệu từ data.js
      console.log('Chạy từ file system, sử dụng dữ liệu từ data.js');
      data = await loadDataFromFile(quizState.selectedQuestionFile);
    } else {
      // Nếu chạy từ web server, sử dụng fetch
      try {
        const response = await fetch(quizState.selectedQuestionFile);
        data = await response.json();
      } catch (fetchError) {
        console.log('Fetch thất bại, sử dụng dữ liệu fallback:', fetchError);
        data = await loadDataFromFile(quizState.selectedQuestionFile);
      }
    }
    
    // Đảo thứ tự câu hỏi
    const shuffledQuestions = shuffleArray(data.questions);
    
    quizData = {
      pass_percent: data.pass_percent,
      questions: shuffledQuestions
    };
    
    console.log(`Đã load ${quizData.questions.length} câu hỏi và đảo thứ tự từ ${quizState.selectedQuestionFile}`);
    return true;
  } catch (error) {
    console.error('Lỗi khi load dữ liệu câu hỏi:', error);
    alert('Không thể tải dữ liệu câu hỏi. Vui lòng thử lại.');
    return false;
  }
}

// Load dữ liệu từ file khi chạy từ file system
async function loadDataFromFile(filename) {
  // Sử dụng dữ liệu từ data.js cho tất cả các file
  const dataFiles = {
    'full_questions.json': fullQuestionsData,
    'test002_questions.json': test002QuestionsData,
    'test003_questions.json': test003QuestionsData,
    'test004_questions.json': test004QuestionsData,
    'test005_questions.json': test005QuestionsData,
    'test006_questions.json': test006QuestionsData,
    'questions.json': questionsData
  };
  
  if (dataFiles[filename]) {
    return dataFiles[filename];
  } else {
    throw new Error(`File ${filename} không tồn tại`);
  }
}

// Thiết lập sự kiện cho màn hình chọn bộ đề
function setupQuizSelection() {
  const startButton = document.getElementById('start-quiz-button');
  const radioButtons = document.querySelectorAll('input[name="test-selection"]');
  const modeButtons = document.querySelectorAll('input[name="mode-selection"]');
  
  // Xử lý sự kiện click vào các test-item
  document.querySelectorAll('.test-item').forEach(item => {
    item.addEventListener('click', () => {
      const radio = item.querySelector('input[type="radio"]');
      radio.checked = true;
      quizState.selectedQuestionFile = radio.value;
    });
  });
  
  // Xử lý sự kiện khi thay đổi radio button
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      quizState.selectedQuestionFile = e.target.value;
    });
  });
  
  // Xử lý sự kiện khi thay đổi chế độ
  modeButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      quizState.mode = e.target.value;
    });
  });
  
  // Xử lý sự kiện khi nhấn nút "Bắt đầu"
  startButton.addEventListener('click', async () => {
    // Lấy giá trị bộ đề được chọn
    const selectedOption = document.querySelector('input[name="test-selection"]:checked');
    if (selectedOption) {
      quizState.selectedQuestionFile = selectedOption.value;
    }
    
    // Lấy chế độ được chọn
    const selectedMode = document.querySelector('input[name="mode-selection"]:checked');
    if (selectedMode) {
      quizState.mode = selectedMode.value;
    }
    
    // Ẩn màn hình chọn bộ đề
    document.getElementById('quiz-selection').style.display = 'none';
    
    // Hiển thị thông báo đang tải
    const container = document.querySelector('.container');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'loading-message';
    loadingMessage.textContent = 'Đang tải dữ liệu câu hỏi...';
    loadingMessage.style.textAlign = 'center';
    loadingMessage.style.padding = '20px';
    loadingMessage.style.fontSize = '18px';
    container.appendChild(loadingMessage);
    
    // Load dữ liệu và khởi tạo quiz
    const loaded = await loadQuizData();
    
    // Xóa thông báo đang tải
    container.removeChild(loadingMessage);
    
    if (loaded) {
      // Hiện thông tin quiz và nội dung quiz
      document.querySelector('.quiz-info').style.display = 'flex';
      document.getElementById('quiz-container').style.display = 'grid';
      
      // Cập nhật giao diện theo chế độ
      updateUIForMode();
      
      // Khởi tạo quiz với dữ liệu đã load
      initializeQuiz();
    } else {
      // Nếu không load được, hiện lại màn hình chọn bộ đề
      document.getElementById('quiz-selection').style.display = 'block';
    }
  });
}

// Cập nhật giao diện theo chế độ
function updateUIForMode() {
  const timerContainer = document.getElementById('timer-container');
  const modeIndicator = document.getElementById('mode-indicator');
  const modeText = document.getElementById('mode-text');
  const studyControls = document.getElementById('study-controls');
  const submitButton = document.getElementById('submit-button');
  
  if (quizState.mode === 'study') {
    // Ẩn timer trong study mode
    if (timerContainer) {
      timerContainer.style.display = 'none';
    }
    
    // Hiển thị chỉ báo chế độ study
    if (modeIndicator) {
      modeIndicator.style.display = 'block';
    }
    if (modeText) {
      modeText.textContent = 'Chế độ học';
    }
    
    // Ẩn nút submit, hiện study controls
    if (submitButton) {
      submitButton.style.display = 'none';
    }
    if (studyControls) {
      studyControls.style.display = 'block';
    }
  } else {
    // Exam mode - hiển thị timer, ẩn study controls
    if (timerContainer) {
      timerContainer.style.display = 'block';
    }
    if (modeIndicator) {
      modeIndicator.style.display = 'none';
    }
    if (studyControls) {
      studyControls.style.display = 'none';
    }
    if (submitButton) {
      submitButton.style.display = 'block';
    }
  }
}

// Khởi tạo bài kiểm tra
function initializeQuiz() {
  // Khởi tạo các câu trả lời trống
  quizState.answers = Array(quizData.questions.length).fill(null);
  
  // Reset study mode state
  quizState.studyMode.answerRevealed = false;
  quizState.studyMode.currentAnswer = null;
  
  // Tạo khung hiển thị chỉ mục câu hỏi
  createQuestionIndex();
  
  // Hiển thị câu hỏi đầu tiên
  displayQuestion(0);
  
  // Hiển thị thông tin về bài kiểm tra
  const totalQuestionsElement = document.getElementById('total-questions');
  if (totalQuestionsElement) {
    totalQuestionsElement.textContent = quizData.questions.length;
  }
  
  const currentQuestionElement = document.getElementById('current-question');
  if (currentQuestionElement) {
    currentQuestionElement.textContent = 1;
  }
  
  const passPercentElement = document.getElementById('pass-percent');
  if (passPercentElement) {
    passPercentElement.textContent = quizData.pass_percent;
  }
  
  // Khởi tạo timer chỉ trong exam mode
  if (quizState.mode === 'exam') {
    startTimer();
  }
  
  // Xử lý nút điều hướng
  setupNavigation();
  
  // Xử lý nút nộp bài hoặc study controls
  if (quizState.mode === 'exam') {
    setupSubmitButton();
  } else {
    setupStudyControls();
  }
  
  quizState.quizStarted = true;
}

// Tạo khung hiển thị chỉ mục câu hỏi
function createQuestionIndex() {
  // Tạo container cho khung chỉ mục
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer) return;
  
  const indexContainer = document.createElement('div');
  indexContainer.className = 'question-index-container';
  indexContainer.id = 'question-index';
  
  // Tạo tiêu đề
  const indexTitle = document.createElement('div');
  indexTitle.className = 'index-title';
  indexTitle.textContent = 'Câu hỏi:';
  indexContainer.appendChild(indexTitle);
  
  // Tạo lưới số câu hỏi
  const indexGrid = document.createElement('div');
  indexGrid.className = 'index-grid';
  
  // Tạo các số từ 1 đến số câu hỏi
  for (let i = 0; i < quizData.questions.length; i++) {
    const indexItem = document.createElement('div');
    indexItem.className = 'index-item';
    indexItem.textContent = i + 1;
    indexItem.dataset.index = i;
    
    // Thêm sự kiện click để nhảy đến câu hỏi
    indexItem.addEventListener('click', () => {
      displayQuestion(i);
    });
    
    indexGrid.appendChild(indexItem);
  }
  
  indexContainer.appendChild(indexGrid);
  
  // Kiểm tra sự tồn tại của nút submit trước khi chèn
  const submitButton = document.getElementById('submit-button');
  if (submitButton) {
    quizContainer.insertBefore(indexContainer, submitButton);
  } else {
    quizContainer.appendChild(indexContainer);
  }
}

// Hiển thị câu hỏi
function displayQuestion(index) {
  const question = quizData.questions[index];
  const questionContainer = document.getElementById('question-container');
  
  // Reset study mode state cho câu hỏi mới
  quizState.studyMode.answerRevealed = false;
  quizState.studyMode.currentAnswer = null;
  
  // Reset câu trả lời cho câu hỏi mới trong study mode
  if (quizState.mode === 'study') {
    quizState.answers[index] = null;
  }
  
  // Cập nhật thông tin câu hỏi hiện tại
  const currentQuestionElement = document.getElementById('current-question');
  if (currentQuestionElement) {
    currentQuestionElement.textContent = index + 1;
  }
  
  // Xóa nội dung cũ
  if (questionContainer) {
    questionContainer.innerHTML = '';
    
    // Tạo phần tử câu hỏi
    const questionElement = document.createElement('div');
    questionElement.className = 'question';
    
    // Tiêu đề câu hỏi
    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = `Câu hỏi ${index + 1}:`;
    questionElement.appendChild(questionNumber);
    
    // Nội dung câu hỏi
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.innerHTML = question.prompt.question;
    questionElement.appendChild(questionText);
    
    // Danh sách câu trả lời
    const answersList = document.createElement('ul');
    answersList.className = 'answers';
    
    // Kiểm tra loại câu hỏi
    const isMultiSelect = question.assessment_type === 'multi-select';
    
    // Tạo các phần tử câu trả lời
    question.prompt.answers.forEach((answer, answerIndex) => {
      const answerItem = document.createElement('li');
      answerItem.className = 'answer-item';
      
      // Nếu đã chọn câu trả lời này trước đó
      if (quizState.answers[index] !== null) {
        const userAnswers = quizState.answers[index];
        if (isMultiSelect) {
          if (userAnswers.includes(answerIndex)) {
            answerItem.classList.add('selected');
          }
        } else {
          if (userAnswers === answerIndex) {
            answerItem.classList.add('selected');
          }
        }
      }
      
      // Tạo label và input cho câu trả lời
      const label = document.createElement('label');
      
      const input = document.createElement('input');
      input.type = isMultiSelect ? 'checkbox' : 'radio';
      input.name = `question-${index}`;
      input.value = answerIndex;
      
      if (quizState.answers[index] !== null) {
        if (isMultiSelect) {
          input.checked = quizState.answers[index].includes(answerIndex);
        } else {
          input.checked = quizState.answers[index] === answerIndex;
        }
      }
      
      // Thêm sự kiện click cho câu trả lời
      answerItem.addEventListener('click', () => {
        const answerItems = answersList.querySelectorAll('li.answer-item');
        
        if (isMultiSelect) {
          // Chọn/bỏ chọn câu trả lời
          answerItem.classList.toggle('selected');
          input.checked = !input.checked;
          
          // Cập nhật mảng câu trả lời
          const selectedAnswers = [];
          answerItems.forEach((item, idx) => {
            if (item.classList.contains('selected')) {
              selectedAnswers.push(idx);
            }
          });
          quizState.answers[index] = selectedAnswers.length > 0 ? selectedAnswers : null;
        } else {
          // Bỏ chọn tất cả các câu trả lời khác
          answerItems.forEach(item => {
            item.classList.remove('selected');
            item.querySelector('input').checked = false;
          });
          
          // Chọn câu trả lời hiện tại
          answerItem.classList.add('selected');
          input.checked = true;
          quizState.answers[index] = answerIndex;
        }
        
        // Cập nhật thanh tiến trình
        updateProgress();
      });
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(' '));
      
      const answerText = document.createElement('span');
      answerText.innerHTML = answer;
      label.appendChild(answerText);
      
      answerItem.appendChild(label);
      answersList.appendChild(answerItem);
    });
    
    questionElement.appendChild(answersList);
    questionContainer.appendChild(questionElement);
  }
  
  // Cập nhật study controls cho câu hỏi mới
  if (quizState.mode === 'study') {
    const checkButton = document.getElementById('check-answer-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (checkButton) checkButton.style.display = 'block';
    if (nextButton) nextButton.style.display = 'none';
  }
  
  // Cập nhật tiến trình
  updateProgress();
  
  // Cập nhật khung chỉ mục câu hỏi
  updateQuestionIndex(index);
  
  // Cập nhật câu hỏi hiện tại
  quizState.currentQuestion = index;
}

// Cập nhật thanh tiến trình
function updateProgress() {
  const completedQuestionsElement = document.getElementById('completed-questions');
  if (completedQuestionsElement) {
    if (quizState.mode === 'study') {
      // Trong study mode, hiển thị số câu đã trả lời
      const answeredQuestions = quizState.answers.filter(answer => answer !== null).length;
      completedQuestionsElement.textContent = answeredQuestions;
    } else {
      // Trong exam mode, hiển thị số câu đã trả lời
      const answeredQuestions = quizState.answers.filter(answer => answer !== null).length;
      completedQuestionsElement.textContent = answeredQuestions;
    }
  }
  
  // Cập nhật khung chỉ mục câu hỏi
  updateQuestionIndex();
}

// Cập nhật khung chỉ mục câu hỏi
function updateQuestionIndex(currentIndex = quizState.currentQuestion) {
  const indexContainer = document.getElementById('question-index');
  if (!indexContainer) return;
  
  // Xóa class active khỏi tất cả các item
  const indexItems = indexContainer.querySelectorAll('.index-item');
  indexItems.forEach(item => {
    item.classList.remove('active');
    
    // Đánh dấu câu hỏi đã trả lời
    const index = parseInt(item.dataset.index);
    if (quizState.answers[index] !== null) {
      item.classList.add('answered');
    } else {
      item.classList.remove('answered');
    }
  });
  
  // Thêm class active cho item hiện tại
  const currentItem = indexContainer.querySelector(`.index-item[data-index="${currentIndex}"]`);
  if (currentItem) {
    currentItem.classList.add('active');
  }
}

// Xử lý nút điều hướng
function setupNavigation() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (quizState.currentQuestion > 0) {
        displayQuestion(quizState.currentQuestion - 1);
      }
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (quizState.currentQuestion < quizData.questions.length - 1) {
        displayQuestion(quizState.currentQuestion + 1);
      }
    });
  }
}

// Xử lý study controls
function setupStudyControls() {
  const checkAnswerButton = document.getElementById('check-answer-button');
  const nextQuestionButton = document.getElementById('next-question-button');
  
  if (checkAnswerButton) {
    checkAnswerButton.addEventListener('click', () => {
      checkCurrentAnswer();
    });
  }
  
  if (nextQuestionButton) {
    nextQuestionButton.addEventListener('click', () => {
      goToNextQuestion();
    });
  }
}

// Kiểm tra đáp án hiện tại trong study mode
function checkCurrentAnswer() {
  const currentIndex = quizState.currentQuestion;
  const question = quizData.questions[currentIndex];
  const userAnswer = quizState.answers[currentIndex];
  
  if (userAnswer === null || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
    alert('Vui lòng chọn một đáp án trước khi kiểm tra!');
    return;
  }
  
  // Hiển thị đáp án đúng/sai
  revealAnswer(currentIndex, question, userAnswer);
  
  // Ẩn nút "Kiểm tra đáp án", hiện nút "Câu tiếp theo"
  const checkButton = document.getElementById('check-answer-button');
  const nextButton = document.getElementById('next-question-button');
  
  if (checkButton) checkButton.style.display = 'none';
  if (nextButton) nextButton.style.display = 'block';
  
  // Cập nhật trạng thái
  quizState.studyMode.answerRevealed = true;
}

// Hiển thị đáp án đúng/sai
function revealAnswer(questionIndex, question, userAnswer) {
  const answersList = document.querySelectorAll('.answer-item');
  const isMultiSelect = question.assessment_type === 'multi-select';
  const correctIndices = question.correct_response.map(response => {
    return 'abcdefghijklmnopqrstuvwxyz'.indexOf(response);
  });
  
  answersList.forEach((answerItem, answerIndex) => {
    // Xóa các class cũ
    answerItem.classList.remove('correct', 'incorrect', 'selected');
    
    // Đánh dấu đáp án đúng
    if (correctIndices.includes(answerIndex)) {
      answerItem.classList.add('correct');
    }
    
    // Đánh dấu đáp án người dùng chọn (nếu sai)
    if (isMultiSelect) {
      if (userAnswer.includes(answerIndex) && !correctIndices.includes(answerIndex)) {
        answerItem.classList.add('incorrect');
      }
    } else {
      if (answerIndex === userAnswer && !correctIndices.includes(answerIndex)) {
        answerItem.classList.add('incorrect');
      }
    }
  });
  
  // Hiển thị giải thích
  showExplanation(question);
}

// Hiển thị giải thích
function showExplanation(question) {
  const questionContainer = document.getElementById('question-container');
  
  // Xóa giải thích cũ nếu có
  const oldExplanation = questionContainer.querySelector('.explanation');
  if (oldExplanation) {
    oldExplanation.remove();
  }
  
  // Tạo phần giải thích mới
  const explanation = document.createElement('div');
  explanation.className = 'explanation';
  explanation.innerHTML = `<h3>Giải thích:</h3>${question.prompt.explanation}`;
  
  questionContainer.appendChild(explanation);
}


// Chuyển đến câu hỏi tiếp theo
function goToNextQuestion() {
  const nextIndex = quizState.currentQuestion + 1;
  
  if (nextIndex < quizData.questions.length) {
    displayQuestion(nextIndex);
  } else {
    if (quizState.mode === 'study') {
      alert(`Chúc mừng! Bạn đã hoàn thành tất cả ${quizData.questions.length} câu hỏi trong bộ đề này!`);
      
      // Ẩn study controls
      const checkButton = document.getElementById('check-answer-button');
      const nextButton = document.getElementById('next-question-button');
      if (checkButton) checkButton.style.display = 'none';
      if (nextButton) nextButton.style.display = 'none';
    } else {
      alert('Bạn đã hoàn thành tất cả câu hỏi!');
    }
  }
}

// Xử lý nút nộp bài
function setupSubmitButton() {
  const submitButton = document.getElementById('submit-button');
  
  if (submitButton) {
    submitButton.addEventListener('click', () => {
      // Hiện hộp thoại xác nhận
      const unansweredCount = quizState.answers.filter(answer => answer === null).length;
      
      let confirmMessage = 'Bạn có chắc chắn muốn nộp bài?';
      if (unansweredCount > 0) {
        confirmMessage = `Bạn còn ${unansweredCount} câu hỏi chưa trả lời. Bạn có chắc chắn muốn nộp bài?`;
      }
      
      if (confirm(confirmMessage)) {
        submitQuiz();
      }
    });
  }
}

// Nộp bài kiểm tra
function submitQuiz() {
  // Dừng bộ đếm thời gian
  clearInterval(quizState.timer.interval);
  
  // Kiểm tra câu trả lời và tính điểm
  let correctAnswers = 0;
  
  quizData.questions.forEach((question, index) => {
    const userAnswer = quizState.answers[index];
    
    // Bỏ qua câu hỏi chưa trả lời
    if (userAnswer === null) return;
    
    if (question.assessment_type === 'multi-select') {
      // Câu hỏi nhiều đáp án
      const correctIndices = question.correct_response.map(response => {
        return 'abcdefghijklmnopqrstuvwxyz'.indexOf(response);
      });
      
      // So sánh mảng
      if (arraysEqual(userAnswer.sort(), correctIndices.sort())) {
        correctAnswers++;
      }
    } else {
      // Câu hỏi một đáp án
      const correctIndex = 'abcdefghijklmnopqrstuvwxyz'.indexOf(question.correct_response[0]);
      if (userAnswer === correctIndex) {
        correctAnswers++;
      }
    }
  });
  
  // Tính điểm
  const score = Math.round((correctAnswers / quizData.questions.length) * 100);
  
  // Hiển thị kết quả
  displayResults(correctAnswers, score);
  
  quizState.quizCompleted = true;
}

// Hiển thị kết quả
function displayResults(correctAnswers, score) {
  const quizContainer = document.getElementById('quiz-container');
  const resultContainer = document.createElement('div');
  resultContainer.className = 'result-container';
  
  // Thông tin điểm số
  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'score-display';
  scoreDisplay.innerHTML = `Điểm số của bạn: <strong>${score}%</strong> (${correctAnswers}/${quizData.questions.length} câu đúng)`;
  resultContainer.appendChild(scoreDisplay);
  
  // Thông tin bộ đề đã làm
  const testInfoDisplay = document.createElement('div');
  testInfoDisplay.className = 'test-info-display';
  testInfoDisplay.innerHTML = `Bộ đề: <strong>${quizState.selectedQuestionFile.replace('_questions.json', '')}</strong>`;
  resultContainer.appendChild(testInfoDisplay);
  
  // Trạng thái đạt/không đạt
  const passBadge = document.createElement('div');
  if (score >= quizData.pass_percent) {
    passBadge.className = 'pass-badge';
    passBadge.textContent = 'ĐẠT';
  } else {
    passBadge.className = 'fail-badge';
    passBadge.textContent = 'KHÔNG ĐẠT';
  }
  resultContainer.appendChild(passBadge);
  
  // Thêm khung hiển thị tổng quan câu hỏi
  const questionsOverviewContainer = document.createElement('div');
  questionsOverviewContainer.className = 'questions-overview-container';
  
  // Tiêu đề khung
  const overviewTitle = document.createElement('div');
  overviewTitle.className = 'index-title';
  overviewTitle.textContent = 'Câu hỏi:';
  questionsOverviewContainer.appendChild(overviewTitle);
  
  // Tạo lưới số câu hỏi
  const overviewGrid = document.createElement('div');
  overviewGrid.className = 'overview-grid';
  
  // Tạo các số từ 1 đến số câu hỏi
  for (let i = 0; i < quizData.questions.length; i++) {
    const question = quizData.questions[i];
    const userAnswer = quizState.answers[i];
    const overviewItem = document.createElement('div');
    overviewItem.className = 'overview-item';
    overviewItem.textContent = i + 1;
    overviewItem.dataset.index = i;
    
    // Kiểm tra trạng thái của câu trả lời
    if (userAnswer === null) {
      // Chưa trả lời
      overviewItem.classList.add('unanswered');
    } else {
      const isMultiSelect = question.assessment_type === 'multi-select';
      const correctIndices = question.correct_response.map(response => {
        return 'abcdefghijklmnopqrstuvwxyz'.indexOf(response);
      });
      
      // Kiểm tra đúng/sai
      let isCorrect = false;
      
      if (isMultiSelect) {
        // So sánh mảng đối với câu hỏi nhiều đáp án
        isCorrect = arraysEqual(userAnswer.sort(), correctIndices.sort());
      } else {
        // So sánh đáp án đối với câu hỏi một đáp án
        isCorrect = userAnswer === correctIndices[0];
      }
      
      if (isCorrect) {
        overviewItem.classList.add('correct');
      } else {
        overviewItem.classList.add('incorrect');
      }
    }
    
    overviewGrid.appendChild(overviewItem);
  }
  
  questionsOverviewContainer.appendChild(overviewGrid);
  resultContainer.appendChild(questionsOverviewContainer);
  
  // Thêm nút để xem chi tiết các câu trả lời
  const reviewButton = document.createElement('button');
  reviewButton.className = 'btn btn-primary';
  reviewButton.textContent = 'Xem chi tiết bài làm';
  reviewButton.addEventListener('click', () => {
    displayDetailedResults();
  });
  resultContainer.appendChild(reviewButton);
  
  // Thêm nút để làm lại bài kiểm tra
  const retryButton = document.createElement('button');
  retryButton.className = 'btn btn-secondary';
  retryButton.style.marginLeft = '10px';
  retryButton.textContent = 'Làm lại bài kiểm tra';
  retryButton.addEventListener('click', () => {
    location.reload();
  });
  resultContainer.appendChild(retryButton);
  
  // Xóa nội dung cũ và hiển thị kết quả
  quizContainer.innerHTML = '';
  quizContainer.appendChild(resultContainer);
}

// Hiển thị chi tiết kết quả
function displayDetailedResults() {
  const quizContainer = document.getElementById('quiz-container');
  
  // Xóa nội dung cũ
  quizContainer.innerHTML = '';
  
  // Tạo container cho layout chi tiết kết quả
  const detailedResultsLayout = document.createElement('div');
  detailedResultsLayout.className = 'detailed-results-layout';
  
  // Tạo container cho kết quả chi tiết
  const detailedResultsContainer = document.createElement('div');
  detailedResultsContainer.className = 'detailed-results';
  
  // Tạo header cho kết quả chi tiết
  const header = document.createElement('header');
  header.innerHTML = '<h1>Kết quả chi tiết</h1>';
  detailedResultsContainer.appendChild(header);
  
  // Tạo khung hiển thị tổng quan câu hỏi
  const questionsOverviewContainer = document.createElement('div');
  questionsOverviewContainer.className = 'questions-overview-container sidebar-overview';
  
  // Tiêu đề khung
  const overviewTitle = document.createElement('div');
  overviewTitle.className = 'index-title';
  overviewTitle.textContent = 'Câu hỏi:';
  questionsOverviewContainer.appendChild(overviewTitle);
  
  // Tạo lưới số câu hỏi
  const overviewGrid = document.createElement('div');
  overviewGrid.className = 'overview-grid';
  
  // Tạo các số từ 1 đến số câu hỏi
  for (let i = 0; i < quizData.questions.length; i++) {
    const question = quizData.questions[i];
    const userAnswer = quizState.answers[i];
    const overviewItem = document.createElement('div');
    overviewItem.className = 'overview-item';
    overviewItem.textContent = i + 1;
    overviewItem.dataset.index = i;
    
    // Kiểm tra trạng thái của câu trả lời
    if (userAnswer === null) {
      // Chưa trả lời
      overviewItem.classList.add('unanswered');
    } else {
      const isMultiSelect = question.assessment_type === 'multi-select';
      const correctIndices = question.correct_response.map(response => {
        return 'abcdefghijklmnopqrstuvwxyz'.indexOf(response);
      });
      
      // Kiểm tra đúng/sai
      let isCorrect = false;
      
      if (isMultiSelect) {
        // So sánh mảng đối với câu hỏi nhiều đáp án
        isCorrect = arraysEqual(userAnswer.sort(), correctIndices.sort());
      } else {
        // So sánh đáp án đối với câu hỏi một đáp án
        isCorrect = userAnswer === correctIndices[0];
      }
      
      if (isCorrect) {
        overviewItem.classList.add('correct');
      } else {
        overviewItem.classList.add('incorrect');
      }
    }
    
    // Thêm sự kiện click để cuộn đến câu hỏi đó
    overviewItem.addEventListener('click', () => {
      const questionElement = document.getElementById(`question-${i}`);
      if (questionElement) {
        // Cuộn đến câu hỏi được chọn
        questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Thêm hiệu ứng nhấp nháy
        questionElement.classList.add('highlight');
        setTimeout(() => {
          questionElement.classList.remove('highlight');
        }, 1500);
      }
    });
    
    overviewGrid.appendChild(overviewItem);
  }
  
  questionsOverviewContainer.appendChild(overviewGrid);
  
  // Thêm nút quay lại tổng kết
  const navigationContainer = document.createElement('div');
  navigationContainer.className = 'overview-navigation';
  
  const backButton = document.createElement('button');
  backButton.className = 'btn btn-primary';
  backButton.textContent = 'Quay lại';
  backButton.addEventListener('click', () => {
    location.reload();
  });
  
  navigationContainer.appendChild(backButton);
  questionsOverviewContainer.appendChild(navigationContainer);
  
  // Tạo container cho danh sách câu hỏi
  const questionsListContainer = document.createElement('div');
  questionsListContainer.className = 'questions-list';
  
  quizData.questions.forEach((question, index) => {
    const userAnswer = quizState.answers[index];
    const questionContainer = document.createElement('div');
    questionContainer.className = 'question-container';
    questionContainer.id = `question-${index}`; // Thêm ID để có thể cuộn đến
    
    // Tiêu đề câu hỏi
    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = `Câu hỏi ${index + 1}:`;
    questionContainer.appendChild(questionNumber);
    
    // Nội dung câu hỏi
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.innerHTML = question.prompt.question;
    questionContainer.appendChild(questionText);
    
    // Danh sách câu trả lời
    const answersList = document.createElement('ul');
    answersList.className = 'answers';
    
    const isMultiSelect = question.assessment_type === 'multi-select';
    const correctIndices = question.correct_response.map(response => {
      return 'abcdefghijklmnopqrstuvwxyz'.indexOf(response);
    });
    
    // Thêm thông báo loại câu hỏi
    const questionType = document.createElement('div');
    questionType.className = 'question-type';
    questionType.textContent = isMultiSelect ? 'Chọn nhiều đáp án đúng' : 'Chọn một đáp án đúng';
    answersList.appendChild(questionType);
    
    // Tạo các phần tử câu trả lời
    question.prompt.answers.forEach((answer, answerIndex) => {
      const answerItem = document.createElement('li');
      answerItem.className = 'answer-item';
      
      // Đánh dấu câu trả lời đúng/sai, xử lý trường hợp userAnswer null
      if (userAnswer === null) {
        // Đánh dấu đáp án đúng nếu không trả lời
        if (correctIndices.includes(answerIndex)) {
          answerItem.classList.add('correct');
        }
      } else if (isMultiSelect) {
        if (userAnswer.includes(answerIndex) && correctIndices.includes(answerIndex)) {
          answerItem.classList.add('correct');
        } else if (userAnswer.includes(answerIndex) && !correctIndices.includes(answerIndex)) {
          answerItem.classList.add('incorrect');
        } else if (!userAnswer.includes(answerIndex) && correctIndices.includes(answerIndex)) {
          answerItem.classList.add('correct');
        }
      } else {
        if (answerIndex === userAnswer && correctIndices.includes(answerIndex)) {
          answerItem.classList.add('correct');
        } else if (answerIndex === userAnswer && !correctIndices.includes(answerIndex)) {
          answerItem.classList.add('incorrect');
        } else if (answerIndex !== userAnswer && correctIndices.includes(answerIndex)) {
          answerItem.classList.add('correct');
        }
      }
      
      const answerText = document.createElement('div');
      answerText.innerHTML = answer;
      answerItem.appendChild(answerText);
      
      answersList.appendChild(answerItem);
    });
    
    questionContainer.appendChild(answersList);
    
    // Thêm thông báo nếu câu hỏi không được trả lời
    if (userAnswer === null) {
      const unanswered = document.createElement('div');
      unanswered.className = 'unanswered-notice';
      unanswered.textContent = 'Bạn chưa trả lời câu hỏi này';
      questionContainer.appendChild(unanswered);
    }
    
    // Phần giải thích
    const explanation = document.createElement('div');
    explanation.className = 'explanation';
    explanation.innerHTML = `<h3>Giải thích:</h3>${question.prompt.explanation}`;
    questionContainer.appendChild(explanation);
    
    questionsListContainer.appendChild(questionContainer);
  });
  
  detailedResultsContainer.appendChild(questionsListContainer);
  
  // Thêm cả hai phần vào layout
  detailedResultsLayout.appendChild(detailedResultsContainer);
  detailedResultsLayout.appendChild(questionsOverviewContainer);
  
  // Thêm vào container chính
  quizContainer.appendChild(detailedResultsLayout);
}

// Khởi tạo bộ đếm thời gian
function startTimer() {
  quizState.timer.minutes = 0;
  quizState.timer.seconds = 0;
  
  quizState.timer.interval = setInterval(() => {
    quizState.timer.seconds++;
    if (quizState.timer.seconds === 60) {
      quizState.timer.minutes++;
      quizState.timer.seconds = 0;
    }
    
    const minutesDisplay = quizState.timer.minutes.toString().padStart(2, '0');
    const secondsDisplay = quizState.timer.seconds.toString().padStart(2, '0');
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      timerElement.textContent = `${minutesDisplay}:${secondsDisplay}`;
    }
  }, 1000);
}

// Hàm so sánh hai mảng
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Khởi tạo khi tải trang
document.addEventListener('DOMContentLoaded', async () => {
  // Thiết lập sự kiện cho màn hình chọn bộ đề
  setupQuizSelection();
}); 