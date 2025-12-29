// --- 効果音とBGMの管理 ---
const BGM_KEY = 'nekobattle_bgmEnabled_v2';
let isBgmEnabled = true;
let currentBgm = null;

const sounds = {
    // システム・基本
    tap: new Audio('tap.mp3'),
    correct: new Audio('correct.mp3'),
    wrong: new Audio('wrong.mp3'),
    enemyDefeated: new Audio('enemy_defeated.mp3'),

    // サバイバルモード用
    heal: new Audio('heal.mp3'),           // 回復音
    hitPlayer: new Audio('hit_player.mp3'),// ダメージ音 (被弾)
    
    // コンボ・演出ボイス
    voiceSkill: new Audio('voice_skill.mp3'), // 10コンボ毎のボイス
    voiceWin: new Audio('voice_win.mp3'),     // ランクイン時のボイス
    
    // --- NEW: 3段階の攻撃音 (script.jsのキーに対応) ---
    attackNormal: new Audio('hit_normal.mp3'),      // Lv.1 (0-14コンボ)
    attackHard: new Audio('hit_perfect.mp3'),       // Lv.2 (15-29コンボ)
    attackCritical: new Audio('critical_hit.mp3'),  // Lv.3 (30コンボ~ フィーバー)

    // BGM
    bgmTraining: new Audio('bgm_training.mp3'),
    bgmNormal: new Audio('bgm_normal.mp3'),
    bgmBoss: new Audio('bgm_boss.mp3')
};

// ループと音量設定
sounds.bgmTraining.loop = true; sounds.bgmTraining.volume = 0.3;
sounds.bgmNormal.loop = true;   sounds.bgmNormal.volume = 0.3;
sounds.bgmBoss.loop = true;     sounds.bgmBoss.volume = 0.3;

// 汎用再生関数 (効果音用: 重ねて再生可能)
function playSound(name, pitch = 1.0, volume = 1.0) {
    if (!sounds[name]) return;
    const clone = sounds[name].cloneNode();
    clone.playbackRate = Math.min(Math.max(pitch, 0.5), 2.0);
    clone.volume = Math.min(Math.max(volume, 0.0), 1.0);
    clone.play().catch(e => {});
}

// BGM制御 (BGM用: 1つだけ再生)
function playBgm(n) { 
    if (!isBgmEnabled || !sounds[n]) return; 
    stopBgm(); 
    sounds[n].play().catch(e => {}); 
    currentBgm = sounds[n]; 
}

function stopBgm() { 
    if (currentBgm) { 
        currentBgm.pause(); 
        currentBgm.currentTime = 0; 
        currentBgm = null; 
    } 
}

function updateBgmButton(btnElement) { 
    if(!btnElement) return;
    btnElement.textContent = isBgmEnabled ? '🔊' : '🔇'; 
    btnElement.classList.toggle('muted', !isBgmEnabled); 
}

function loadBgmSetting(btnElement) { 
    const s = localStorage.getItem(BGM_KEY); 
    isBgmEnabled = (s !== null) ? JSON.parse(s) : true; 
    updateBgmButton(btnElement); 
    
    // ボタンクリック時の挙動設定
    btnElement.onclick = () => {
        isBgmEnabled = !isBgmEnabled;
        localStorage.setItem(BGM_KEY, JSON.stringify(isBgmEnabled));
        updateBgmButton(btnElement);
        
        if (!isBgmEnabled) {
            stopBgm();
        } else {
            // ゲーム中（isGameActiveがtrue）ならBGM再開
            // ※ script.jsのグローバル変数 isGameActive を参照
            if (typeof isGameActive !== 'undefined' && isGameActive) {
                playBgm('bgmTraining'); 
            }
        }
    };
}