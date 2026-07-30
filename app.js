/**
 * ==========================================================================
 * [럭키 드로우 - 무작위 숫자 뽑기 애플리케이션 핵심 로직]
 * ==========================================================================
 */

// DOM 요소 참조 생성
const minNumInput = document.getElementById('minNum');
const maxNumInput = document.getElementById('maxNum');
const countNumInput = document.getElementById('countNum');
const excludeNumsInput = document.getElementById('excludeNums'); // 신규 추가: 제외 숫자 입력창
const allowDuplicatesCheckbox = document.getElementById('allowDuplicates');
const soundToggleCheckbox = document.getElementById('soundToggle');
const sortOrderSelect = document.getElementById('sortOrder');
const drawBtn = document.getElementById('drawBtn');
const copyBtn = document.getElementById('copyBtn');
const resultDisplay = document.getElementById('resultDisplay');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// 최근 추첨 결과를 저장하는 상태 변수
let currentResults = [];
let historyData = [];

// ==========================================================================
// [Web Audio API 기반 효과음 생성기]
// 외부 오디오 파일 없이 웹 브라우저 자체 오디오 합성기로 사운드 구현
// ==========================================================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

/**
 * 효과음을 재생하는 함수
 * @param {number} freq - 주파수(Hz)
 * @param {string} type - 파형 종류 ('sine', 'square', 'triangle', 'sawtooth')
 * @param {number} duration - 재생 시간(초)
 */
function playSound(freq, type = 'sine', duration = 0.1) {
    if (!soundToggleCheckbox.checked) return; // 효과음 끄기 설정 시 무시
    
    try {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.error('오디오 재생 실패:', e);
    }
}

/**
 * 최종 당첨 효과음 재생
 */
function playWinSound() {
    if (!soundToggleCheckbox.checked) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // 도, 미, 솔, 높은 도 (C major chord)
    notes.forEach((freq, index) => {
        setTimeout(() => {
            playSound(freq, 'triangle', 0.25);
        }, index * 120);
    });
}

// ==========================================================================
// [무작위 숫자 생성 및 검증 로직]
// ==========================================================================

/**
 * 문자열에서 제외할 숫자 배열을 추출하는 함수
 * 예: "3, 7, 12 15" -> [3, 7, 12, 15]
 */
function parseExcludedNumbers(inputStr) {
    if (!inputStr || !inputStr.trim()) return [];

    // 쉼표, 공백, 줄바꿈 등을 기준으로 분할
    const rawTokens = inputStr.split(/[\s,]+/);
    const excludedList = [];

    for (const token of rawTokens) {
        if (token.trim() !== '') {
            const num = parseInt(token.trim(), 10);
            if (!isNaN(num) && !excludedList.includes(num)) {
                excludedList.push(num);
            }
        }
    }

    return excludedList;
}

/**
 * 입력값 유효성 검사 함수
 */
function validateInputs(min, max, count, allowDuplicates, availablePoolSize) {
    if (isNaN(min) || isNaN(max) || isNaN(count)) {
        alert('올바른 숫자를 입력해 주세요.');
        return false;
    }

    if (min > max) {
        alert('최소 숫자는 최대 숫자보다 작거나 같아야 합니다.');
        return false;
    }

    if (count <= 0) {
        alert('뽑을 개수는 최소 1개 이상이어야 합니다.');
        return false;
    }

    if (availablePoolSize <= 0) {
        alert('제외할 숫자를 뺀 후 추첨 가능한 숫자가 없습니다. 숫자 범위나 제외할 숫자를 조정해 주세요.');
        return false;
    }

    if (!allowDuplicates && count > availablePoolSize) {
        alert(`중복을 허용하지 않을 경우, 뽑을 개수(${count}개)는 제외 숫자를 뺀 남은 가능 숫자 수(${availablePoolSize}개)를 초과할 수 없습니다.`);
        return false;
    }

    return true;
}

/**
 * 무작위 숫자 뽑기 메인 실행 함수
 */
async function startDraw() {
    const min = parseInt(minNumInput.value, 10);
    const max = parseInt(maxNumInput.value, 10);
    const count = parseInt(countNumInput.value, 10);
    const allowDuplicates = allowDuplicatesCheckbox.checked;
    const sortOrder = sortOrderSelect.value;

    // 제외할 숫자 배열 파싱
    const excludedNumbers = parseExcludedNumbers(excludeNumsInput.value);

    // 추첨 가능한 전체 숫자 후보 풀(Pool) 생성 (제외 숫자는 미리 배제)
    const availablePool = [];
    for (let i = min; i <= max; i++) {
        if (!excludedNumbers.includes(i)) {
            availablePool.push(i);
        }
    }

    // 입력 검증 (남은 후보 수 전달)
    if (!validateInputs(min, max, count, allowDuplicates, availablePool.length)) return;

    // 버튼 비활성화 (추첨 진행 중 중복 클릭 방지)
    drawBtn.disabled = true;
    drawBtn.querySelector('.btn-text').textContent = '🎲 추첨 진행 중...';
    copyBtn.disabled = true;

    // 무작위 숫자 뽑기 수행
    const pickedNumbers = [];

    if (allowDuplicates) {
        // 중복 허용 방식: 남은 후보 풀(availablePool) 중에서 무작위로 선택
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * availablePool.length);
            pickedNumbers.push(availablePool[randomIndex]);
        }
    } else {
        // 중복 없음 방식: 후보 풀을 피셔-에이츠(Fisher-Yates) 알고리즘으로 셔플 후 필요한 개수만큼 추출
        const shuffledPool = [...availablePool];
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }

        for (let i = 0; i < count; i++) {
            pickedNumbers.push(shuffledPool[i]);
        }
    }

    // 결과 정렬 처리
    if (sortOrder === 'asc') {
        pickedNumbers.sort((a, b) => a - b);
    } else if (sortOrder === 'desc') {
        pickedNumbers.sort((a, b) => b - a);
    }

    currentResults = pickedNumbers;

    // 추첨 디스플레이 연출 효과 진행
    await animateResultDisplay(pickedNumbers);

    // 추첨 완료 후 처리
    drawBtn.disabled = false;
    drawBtn.querySelector('.btn-text').textContent = '🎲 숫자 뽑기 시작!';
    copyBtn.disabled = false;

    // 히스토리에 기록 추가
    addHistoryRecord(pickedNumbers);
    playWinSound();
}

/**
 * 결과 디스플레이 애니메이션 처리 (하나씩 통통 튀며 나타남)
 */
async function animateResultDisplay(numbers) {
    resultDisplay.innerHTML = ''; // 기존 결과 화면 초기화

    for (let i = 0; i < numbers.length; i++) {
        const num = numbers[i];

        // 숫자 볼 Element 생성
        const ball = document.createElement('div');
        ball.classList.add('number-ball');
        
        // 숫자 범위에 따라 다른 색상 테마 부여
        const themeIndex = Math.abs(num) % 5;
        ball.classList.add(`ball-theme-${themeIndex}`);
        
        ball.textContent = num;
        resultDisplay.appendChild(ball);

        // 통 하는 팝 사운드 재생
        playSound(400 + (i * 50), 'sine', 0.08);

        // 볼 등장 간격 조절 (딜레이)
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

// ==========================================================================
// [결과 복사 및 히스토리 관리 로직]
// ==========================================================================

/**
 * 결과를 클립보드에 복사
 */
function copyToClipboard() {
    if (currentResults.length === 0) return;

    const textToCopy = currentResults.join(', ');
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ 복사 완료!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('복사 실패: ' + err);
    });
}

/**
 * 히스토리에 레코드 추가
 */
function addHistoryRecord(numbers) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const record = {
        time: timeString,
        numbers: numbers.join(', ')
    };

    historyData.unshift(record); // 최근 항목이 맨 위로
    if (historyData.length > 10) historyData.pop(); // 최대 10개까지 보관

    renderHistory();
}

/**
 * 히스토리 UI 렌더링
 */
function renderHistory() {
    if (historyData.length === 0) {
        historyList.innerHTML = '<li class="empty-history">아직 추첨 기록이 없습니다.</li>';
        return;
    }

    historyList.innerHTML = '';
    historyData.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-time">${item.time}</span>
            <span class="history-numbers">${item.numbers}</span>
        `;
        historyList.appendChild(li);
    });
}

/**
 * 히스토리 삭제
 */
function clearHistory() {
    if (historyData.length === 0) return;
    if (confirm('모든 추첨 기록을 삭제하시겠습니까?')) {
        historyData = [];
        renderHistory();
    }
}

// ==========================================================================
// [이벤트 리스너 등록]
// ==========================================================================
drawBtn.addEventListener('click', startDraw);
copyBtn.addEventListener('click', copyToClipboard);
clearHistoryBtn.addEventListener('click', clearHistory);
