/* =========================================
   グローバル変数・定数
   ========================================= */
let currentMode = '';
let currentScore = 0;
let currentTime = 40.00; // スタート時間 (HP)
const MAX_TIME = 60.00;  // 上限時間 (最大HP)
const TIME_BONUS = 1.0;  // 正解時の回復 (+2秒に修正)
const TIME_PENALTY = 6.0;// 不正解時のダメージ (-5秒に修正)

let timerInterval = null;
let isGameActive = false;
let comboCount = 0;
let currentStageLevel = 1; // 現在のステージレベル管理用
let currentProblem = {};

// コンボ表示用のDOM要素キャッシュ
let comboBgElement = null;

// 登録ユーザーリスト
const USERS = ["パパ", "ママ", "ゆき", "あお", "ゲスト"];

// モード設定
const MODES = {
    'addsub1':      { name: '1年 かんたん計算' },
    'addsub1_hole': { name: '1年 かんたん穴あき' },
    'addsub2':      { name: '1年 ふつう計算' },
    'addsub2_hole': { name: '1年 ふつう穴あき' },
    'mul':          { name: '4年 かけ算' },
    'mul_hole':     { name: '4年 かけ算穴あき' },
    'div':          { name: '4年 わり算' },
    'div_hole':     { name: '4年 わり算穴あき' }
};

// サウンドマッピング (sound.jsのキーと対応)
const SOUND_MAP = {
    tap: 'tap',
    correct: 'correct',
    wrong: 'wrong',
    heal: 'heal',
    damage: 'hitPlayer',
    
    // 攻撃音 3段階
    attackNormal: 'attackNormal',   // 0-14コンボ
    attackHard: 'attackHard',       // 15-29コンボ
    attackCritical: 'attackCritical', // 30コンボ~ (2連撃)

    comboVoice: 'voiceSkill',       // 10コンボ毎
    rankIn: 'voiceWin',
    bgm: 'bgmTraining',
    finish: 'enemyDefeated'
};

/* =========================================
   DOM要素の取得
   ========================================= */
const modeSelectScreen = document.getElementById('modeSelectScreen');
const rankingViewScreen = document.getElementById('rankingViewScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

// ゲーム画面用
const timeGaugeBar = document.getElementById('timeGaugeBar');
const timeText = document.getElementById('timeText');
const currentScoreDisplay = document.getElementById('currentScore');
const questionText = document.getElementById('questionText');
const answerChoices = document.getElementById('answerChoices');
const quitBtn = document.getElementById('quitBtn');
const enemyCharacter = document.getElementById('enemyCharacter');

// リザルト画面用
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const rankInInputArea = document.getElementById('rankInInputArea');
const userSelectButtons = document.querySelectorAll('.user-btn');
const rankingListBody = document.getElementById('rankingListBody');
const rankingListName = document.getElementById('rankingListName');
const retryBtn = document.getElementById('retryBtn');
const backToTitleBtn = document.getElementById('backToTitleBtn');

// ランキング閲覧画面用
const showRankingBtn = document.getElementById('showRankingBtn');
const backFromRankingBtn = document.getElementById('backFromRankingBtn');
const rankTabBtns = document.querySelectorAll('.rank-tab-btn');
const fullRankingBody = document.getElementById('fullRankingBody');
const rankingViewTitle = document.getElementById('rankingViewTitle');

/* =========================================
   初期化・イベント設定
   ========================================= */
window.onload = function() {
    showScreen(modeSelectScreen);
    
    if(typeof loadBgmSetting === 'function') {
        loadBgmSetting(document.getElementById('bgmToggleBtn'));
    }
    
    updateBadges();
    
    // コンボ表示用の要素を動的に生成
    if (!document.getElementById('comboBgDisplay')) {
        comboBgElement = document.createElement('div');
        comboBgElement.id = 'comboBgDisplay';
        comboBgElement.className = 'combo-display-bg';
        gameScreen.insertBefore(comboBgElement, enemyCharacter); 
    }

    // ステージカットイン用の要素を生成
    if (!document.getElementById('stageAnnouncement')) {
        const stageEl = document.createElement('div');
        stageEl.id = 'stageAnnouncement';
        gameScreen.appendChild(stageEl);
    }
};

// モード選択
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.closest('.mode-btn');
        playSound(SOUND_MAP.tap);
        startGame(target.dataset.type);
    });
});

// ランキング閲覧
showRankingBtn.addEventListener('click', () => {
    playSound(SOUND_MAP.tap);
    showScreen(rankingViewScreen);
    updateRankingView('addsub1');
});
backFromRankingBtn.addEventListener('click', () => {
    playSound(SOUND_MAP.tap);
    showScreen(modeSelectScreen);
});

// タブ切り替え
rankTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        playSound(SOUND_MAP.tap);
        rankTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        updateRankingView(e.target.dataset.target);
    });
});

// ゲーム内
quitBtn.addEventListener('click', () => {
    stopGame();
    playSound(SOUND_MAP.tap);
    showScreen(modeSelectScreen);
});

// リザルト
userSelectButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const name = e.target.dataset.name;
        registerScore(name);
    });
});
retryBtn.addEventListener('click', () => {
    playSound(SOUND_MAP.tap);
    startGame(currentMode);
});
backToTitleBtn.addEventListener('click', () => {
    playSound(SOUND_MAP.tap);
    showScreen(modeSelectScreen);
    updateBadges();
});

/* =========================================
   画面制御
   ========================================= */
function showScreen(screen) {
    [modeSelectScreen, rankingViewScreen, gameScreen, resultScreen].forEach(s => s.style.display = 'none');
    screen.style.display = 'flex';
}

/* =========================================
   ゲームループ
   ========================================= */
function startGame(mode) {
    currentMode = mode;
    currentScore = 0;
    currentTime = 40.00;
    comboCount = 0;
    currentStageLevel = 1; // ステージリセット
    isGameActive = true;
    
    enemyCharacter.textContent = "😼";
    updateTimerDisplay();
    updateBackgroundState(0);
    updateComboDisplay(0);

    showScreen(gameScreen);
    playBgm(SOUND_MAP.bgm);

    nextQuestion();

    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(gameLoop, 100);
}

function stopGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    stopBgm();
}

function gameLoop() {
    currentTime -= 0.1;
    if (currentTime <= 0) {
        currentTime = 0;
        gameOver();
    }
    updateTimerDisplay();
}

// HPバー更新
function updateTimerDisplay() {
    timeText.textContent = currentTime.toFixed(2);
    
    const percentage = Math.min(100, (currentTime / MAX_TIME) * 100);
    timeGaugeBar.style.width = `${percentage}%`;

    timeGaugeBar.className = '';
    
    if (currentTime > 20) {
        timeGaugeBar.classList.add('gauge-safe');
    } else if (currentTime > 10) {
        timeGaugeBar.classList.add('gauge-warning');
    } else {
        timeGaugeBar.classList.add('gauge-danger');
    }
}

function gameOver() {
    stopGame();
    playSound(SOUND_MAP.finish);

    finalScoreDisplay.textContent = `${currentScore} ひき`;
    showScreen(resultScreen);
    
    rankInInputArea.style.display = 'block';
    renderRankingTable(rankingListBody, currentMode);
    
    if(currentScore === 0) {
         rankInInputArea.style.display = 'none';
    } else {
        playSound(SOUND_MAP.rankIn);
    }
}

/* =========================================
   問題生成 & 判定
   ========================================= */
function generateProblem(mode) {
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    let n1, n2, q, a, type;

    const makeHole = (n1, op, n2, ans) => {
        return Math.random() < 0.5 
            ? { q: `□ ${op} ${n2} = ${ans}`, a: n1 } 
            : { q: `${n1} ${op} □ = ${ans}`, a: n2 };
    };

    switch(mode) {
        case 'addsub1':
        case 'addsub1_hole':
            if (Math.random() < 0.6) {
                n1 = rand(1, 9); n2 = rand(1, 9);
                q = `${n1} + ${n2}`; a = n1 + n2; type = '+';
            } else {
                n1 = rand(2, 10); n2 = rand(1, n1 - 1);
                q = `${n1} - ${n2}`; a = n1 - n2; type = '-';
            }
            if (mode.includes('hole')) return makeHole(n1, type, n2, a);
            return { q, a };

        case 'addsub2':
        case 'addsub2_hole':
            if (Math.random() < 0.6) {
                n1 = rand(10, 89); n2 = rand(10, 99 - n1);
                q = `${n1} + ${n2}`; a = n1 + n2; type = '+';
            } else {
                n1 = rand(20, 99); n2 = rand(10, n1 - 10);
                q = `${n1} - ${n2}`; a = n1 - n2; type = '-';
            }
            if (mode.includes('hole')) return makeHole(n1, type, n2, a);
            return { q, a };

        case 'mul':
        case 'mul_hole':
            n1 = rand(2, 9); n2 = rand(2, 9);
            q = `${n1} × ${n2}`; a = n1 * n2;
            if (mode.includes('hole')) return makeHole(n1, '×', n2, a);
            return { q, a };

        case 'div':
        case 'div_hole':
            n2 = rand(2, 9);
            a = rand(2, 9);
            n1 = n2 * a;
            q = `${n1} ÷ ${n2}`;
            if (mode.includes('hole')) {
                return Math.random() < 0.5 
                    ? { q: `□ ÷ ${n2} = ${a}`, a: n1 }
                    : { q: `${n1} ÷ □ = ${a}`, a: n2 };
            }
            return { q, a: a };
            
        default:
            return { q: '1+1', a: 2 };
    }
}

function nextQuestion() {
    if(!isGameActive) return;
    currentProblem = generateProblem(currentMode);
    questionText.textContent = currentProblem.q;
    answerChoices.innerHTML = '';

    let choices = new Set([currentProblem.a]);
    while (choices.size < 4) {
        let dummy = currentProblem.a + (Math.floor(Math.random() * 10) - 5);
        if (dummy >= 0 && dummy !== currentProblem.a) choices.add(dummy);
    }
    
    // 【重要】クリックイベント(e)を引数として渡すように変更
    Array.from(choices).sort(() => Math.random() - 0.5).forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = ans;
        
        // ここで event (e) を受け取る
        btn.onclick = (e) => checkAnswer(ans, currentProblem.a, e);
        
        answerChoices.appendChild(btn);
    });
}

// 判定ロジック（event引数を追加）
function checkAnswer(selected, correct, event) {
    if(!isGameActive) return;

    // クリック位置の取得（タッチ対応）
    let clientX, clientY;
    if (event) {
        clientX = event.clientX;
        clientY = event.clientY;
        // スマホのタップ等で座標が取れない場合のフォールバック（画面中央）
        if (!clientX) {
            const rect = event.target.getBoundingClientRect();
            clientX = rect.left + rect.width / 2;
            clientY = rect.top;
        }
    }

    if (selected === correct) {
        // --- 正解 ---
        currentScore++;
        comboCount++;
        
        // 1. 背景更新 & ステージ変化チェック
        updateBackgroundState(comboCount);
        
        // 2. コンボ表示更新
        updateComboDisplay(comboCount);

        // 3. HP回復 & 時間追加演出
        currentTime = Math.min(MAX_TIME, currentTime + TIME_BONUS);
        timeGaugeBar.classList.add('bar-heal');
        setTimeout(() => timeGaugeBar.classList.remove('bar-heal'), 300);
        
        // ★クリックした場所に「+2秒」を表示
        showFloatingText(`+${TIME_BONUS}秒!`, clientX, clientY, 'float-plus');

        // 4. 音とダメージ演出
        playAttackEffect(comboCount);

        // スコア表示
        currentScoreDisplay.textContent = currentScore;
        
        nextQuestion();

    } else {
        // --- 不正解 ---
        comboCount = 0;
        currentStageLevel = 1; // ステージも戻す場合
        
        updateBackgroundState(0);
        updateComboDisplay(0);

        currentTime = Math.max(0, currentTime - TIME_PENALTY);
        
        // ★クリックした場所に「-5秒...」を表示
        showFloatingText(`-${TIME_PENALTY}秒...`, clientX, clientY, 'float-minus');

        playSound(SOUND_MAP.wrong);
        playSound(SOUND_MAP.damage);
        
        gameScreen.classList.add('flash-red');
        setTimeout(() => gameScreen.classList.remove('flash-red'), 200);

        enemyCharacter.textContent = "🙀";
        setTimeout(() => enemyCharacter.textContent = "😼", 500);

        updateTimerDisplay();
        if (currentTime <= 0) gameOver();
    }
}

// --- NEW: 浮き出るテキスト演出 ---
function showFloatingText(text, x, y, typeClass) {
    const el = document.createElement('div');
    el.className = `floating-text ${typeClass}`;
    el.textContent = text;
    
    // 位置調整（指で隠れないように少し上に）
    el.style.left = `${x}px`;
    el.style.top = `${y - 50}px`; 
    
    document.body.appendChild(el);
    
    // アニメーション完了後に削除
    setTimeout(() => {
        el.remove();
    }, 1000);
}

// --- NEW: ステージ変化カットイン ---
function showStageCutIn(level) {
    const el = document.getElementById('stageAnnouncement');
    if(!el) return;

    // 表示内容
    el.innerHTML = `<div class="stage-sub-text">LEVEL UP!</div>STAGE ${level}`;
    
    // アニメーションリセット技
    el.classList.remove('announce-active');
    void el.offsetWidth; // リフロー
    el.classList.add('announce-active');
    
    playSound(SOUND_MAP.rankIn); // レベルアップ音（ファンファーレ代用）
}

// --- 背景更新処理（修正版） ---
function updateBackgroundState(combo) {
    gameScreen.classList.remove('bg-level-2', 'bg-level-3', 'bg-level-4', 'bg-level-5');
    
    let newLevel = 1;

    if (combo >= 40) {
        gameScreen.classList.add('bg-level-5');
        newLevel = 5;
    } else if (combo >= 30) {
        gameScreen.classList.add('bg-level-4');
        newLevel = 4;
    } else if (combo >= 20) {
        gameScreen.classList.add('bg-level-3');
        newLevel = 3;
    } else if (combo >= 10) {
        gameScreen.classList.add('bg-level-2');
        newLevel = 2;
    }

    // レベルが上がった瞬間だけカットインを表示
    if (newLevel > currentStageLevel) {
        showStageCutIn(newLevel);
    }
    currentStageLevel = newLevel;
}

// --- コンボ表示（修正版：アニメーション連携） ---
function updateComboDisplay(combo) {
    if (!comboBgElement) return;
    
    if (combo > 1) {
        comboBgElement.textContent = `${combo} Combo!`;
        comboBgElement.classList.add('show');
        
        // CSSの animation を再発火させる
        comboBgElement.classList.remove('combo-pop');
        void comboBgElement.offsetWidth; // リフロー
        comboBgElement.classList.add('combo-pop');
    } else {
        comboBgElement.classList.remove('show', 'combo-pop');
    }
}

// 攻撃音と敵リアクション
function playAttackEffect(combo) {
    let damageClass = 'enemy-damage';
    let soundKey = 'attackNormal';

    if (combo >= 30) {
        soundKey = 'attackCritical';
        damageClass = 'enemy-damage-heavy';
    } else if (combo >= 15) {
        soundKey = 'attackHard';
    }

    playSound(SOUND_MAP[soundKey]);
    
    if (combo > 0 && combo % 10 === 0) {
        setTimeout(() => playSound(SOUND_MAP.comboVoice), 200);
    }

    enemyCharacter.classList.remove('enemy-damage', 'enemy-damage-heavy');
    void enemyCharacter.offsetWidth;
    enemyCharacter.classList.add(damageClass);
}


/* =========================================
   ランキングシステム
   ========================================= */
const RANKING_KEY_PREFIX = 'neko_surv_v3_';

function getRankingData(mode) {
    const json = localStorage.getItem(RANKING_KEY_PREFIX + mode);
    return json ? JSON.parse(json) : [];
}

function registerScore(userName) {
    const list = getRankingData(currentMode);
    const existingUserIndex = list.findIndex(item => item.name === userName);

    if (existingUserIndex !== -1) {
        if (currentScore > list[existingUserIndex].score) {
            list[existingUserIndex].score = currentScore;
            playSound(SOUND_MAP.rankIn);
        }
    } else {
        list.push({ name: userName, score: currentScore });
        playSound(SOUND_MAP.rankIn);
    }

    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(RANKING_KEY_PREFIX + currentMode, JSON.stringify(list));

    rankInInputArea.style.display = 'none';
    renderRankingTable(rankingListBody, currentMode);
    updateBadges();
}

function renderRankingTable(tbodyElement, mode) {
    const list = getRankingData(mode);
    tbodyElement.innerHTML = '';
    rankingListName.textContent = `【${MODES[mode].name}】の上位`;
    rankingViewTitle.textContent = MODES[mode].name;

    if (list.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="3">まだ記録がないよ</td></tr>`;
        return;
    }

    list.forEach((item, index) => {
        if (index >= 5) return;
        const tr = document.createElement('tr');
        const rankIcon = index === 0 ? '👑' : (index + 1);
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        
        tr.innerHTML = `
            <td class="${rankClass}">${rankIcon}</td>
            <td>${item.name}</td>
            <td>${item.score}</td>
        `;
        tbodyElement.appendChild(tr);
    });
}

function updateRankingView(mode) {
    renderRankingTable(fullRankingBody, mode);
}

function updateBadges() {
    Object.keys(MODES).forEach(mode => {
        const list = getRankingData(mode);
        const badge = document.getElementById(`badge-${mode}`);
        if (list.length > 0) {
            badge.textContent = `👑 ${list[0].score}`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    });
}