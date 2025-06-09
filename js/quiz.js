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
  selectedQuestionFile: 'full_questions.json' // File câu hỏi mặc định
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
    const response = await fetch(quizState.selectedQuestionFile);
    const data = await response.json();
    
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

// Thiết lập sự kiện cho màn hình chọn bộ đề
function setupQuizSelection() {
  const startButton = document.getElementById('start-quiz-button');
  const radioButtons = document.querySelectorAll('input[name="test-selection"]');
  
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
  
  // Xử lý sự kiện khi nhấn nút "Bắt đầu"
  startButton.addEventListener('click', async () => {
    // Lấy giá trị bộ đề được chọn
    const selectedOption = document.querySelector('input[name="test-selection"]:checked');
    if (selectedOption) {
      quizState.selectedQuestionFile = selectedOption.value;
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
      
      // Khởi tạo quiz với dữ liệu đã load
      initializeQuiz();
    } else {
      // Nếu không load được, hiện lại màn hình chọn bộ đề
      document.getElementById('quiz-selection').style.display = 'block';
    }
  });
}

// Khởi tạo bài kiểm tra
function initializeQuiz() {
  // Khởi tạo các câu trả lời trống
  quizState.answers = Array(quizData.questions.length).fill(null);
  
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
  
  // Khởi tạo timer
  startTimer();
  
  // Xử lý nút điều hướng
  setupNavigation();
  
  // Xử lý nút nộp bài
  setupSubmitButton();
  
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
  
  // Cập nhật tiến trình
  updateProgress();
  
  // Cập nhật khung chỉ mục câu hỏi
  updateQuestionIndex(index);
  
  // Cập nhật câu hỏi hiện tại
  quizState.currentQuestion = index;
}

// Cập nhật thanh tiến trình
function updateProgress() {
  const answeredQuestions = quizState.answers.filter(answer => answer !== null).length;
  const completedQuestionsElement = document.getElementById('completed-questions');
  if (completedQuestionsElement) {
    completedQuestionsElement.textContent = answeredQuestions;
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
  
  // Tạo container cho kết quả chi tiết
  const detailedResultsContainer = document.createElement('div');
  detailedResultsContainer.className = 'detailed-results';
  
  // Tạo header cho kết quả chi tiết
  const header = document.createElement('header');
  header.innerHTML = '<h1>Kết quả chi tiết</h1>';
  detailedResultsContainer.appendChild(header);
  
  // Tạo container cho danh sách câu hỏi
  const questionsListContainer = document.createElement('div');
  questionsListContainer.className = 'questions-list';
  
  quizData.questions.forEach((question, index) => {
    const userAnswer = quizState.answers[index];
    const questionContainer = document.createElement('div');
    questionContainer.className = 'question-container';
    
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
  
  // Nút quay lại
  const navigationContainer = document.createElement('div');
  navigationContainer.className = 'detailed-navigation';
  
  const backButton = document.createElement('button');
  backButton.className = 'btn btn-primary';
  backButton.textContent = 'Quay lại tổng kết';
  backButton.addEventListener('click', () => {
    location.reload();
  });
  
  navigationContainer.appendChild(backButton);
  detailedResultsContainer.appendChild(navigationContainer);
  
  // Thêm vào container chính
  quizContainer.appendChild(detailedResultsContainer);
  
  // Đặt max-width cho container để tránh vỡ layout
  detailedResultsContainer.style.maxWidth = '100%';
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