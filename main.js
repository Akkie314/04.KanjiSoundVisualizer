document.addEventListener("DOMContentLoaded", async () => {
    // 設定
    const alphaMin = 0.5;
    const alphaMax = 1;

    const fontSizeMin = 8;
    const fontSizeMax = isMobile() ? 32 : 64;

    const kanjiPool = generateKanjiPool(1000);

    let spacing; // 漢字の間隔倍率

    function isMobile() {
        // 画面サイズが480px以下ならモバイルとみなす
        return window.innerWidth <= 480;
    }

    // キャンバスのセットアップ
    const canvas = document.getElementById("visualizer");
    const ctx = canvas.getContext("2d");

    // キャンバスのサイズをウィンドウに合わせる
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // デバイスによってspacingを設定
        if (isMobile()) {
            spacing = 4.0; // スマホでは狭く
        } else {
            spacing = 2.0; // PCではデフォルト
        }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // コンテキストとアナライザを作成
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();

    // アナライザの設定
    analyser.fftSize = 128;

    // ソースを生成
    const audioElement = document.querySelector("audio");

    // オーディオが再生可能になったらアナライザを設定
    audioElement.addEventListener('canplay', () => {
        const source = audioCtx.createMediaElementSource(audioElement);
        
        // 接続
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    });
    
    // オーディオ再生時にAudioContextをresume
    audioElement.addEventListener('play', async () => {
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
    });
    
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    draw();

    // 描画用関数
    function draw() {
        // 音声停止中なら、何もしない
        if (audioElement.paused) {
            setTimeout(() => {
                draw();
            }, 50);

            return;
        }

        // 現在の波形を取得
        analyser.getByteTimeDomainData(dataArray);

        // 画面リセット
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, canvas.width, canvas.height);


        // 漢字を描画
        const sliceWidth = (canvas.width * spacing) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;

            drawKanji(x, v)

            x += sliceWidth;
        }


        requestAnimationFrame(draw);
    }

    // 漢字を描画する関数
    function drawKanji(x, v) {
        const flippedV = 2.0 - v;   // 上下反転したv

        // startV -> 1.0 の間を0.05刻みでループする（v = 1.0を境に対象なので）
        const startV = Math.min(v, flippedV);
        for (let newV = startV; newV < 1.0 + 0.01; newV += 0.05) {
            const y = (canvas.height / 4) * (newV + 1);
            const flippedY = canvas.height - y;
            let alpha = 1.0;
            let fontSize = 16;

            // 最初と最後だけ固定
            if (newV === startV) {
                alpha = 1.0;
                fontSize = 16;
            } else {
                // 途中はvに応じて変化
                alpha = getAlpha(newV);
                fontSize = getFontSize(newV);
            }

            // alphaとフォントサイズを設定
            ctx.fillStyle = `rgba(238, 238, 238, ${alpha})`;
            ctx.font = `${fontSize}px Arial`;

            // 漢字を描画
            ctx.fillText(getRandomKanjiFromPool(), x, y);
            ctx.fillText(getRandomKanjiFromPool(), x, flippedY);
        }
    }

    // アルファを取得
    function getAlpha(v) {
        return alphaMin + (alphaMax - alphaMin) * Math.abs(v - 1.0);
    }

    // 文字のサイズを取得
    function getFontSize(v) {
        return fontSizeMin + (fontSizeMax - fontSizeMin) * Math.abs(v - 1.0);
    }

    // ランダムな漢字を大量に用意する関数
    function generateKanjiPool(count) {
        const kanjiPool = [];
        for (let i = 0; i < count; i++) {
            kanjiPool.push(getRandomKanji());
        }
        return kanjiPool;
    }

    // プールからランダムに漢字を取得する関数
    function getRandomKanjiFromPool() {
        const index = Math.floor(Math.random() * kanjiPool.length);
        return kanjiPool[index];
    }

    // ランダムな漢字を1つ返す関数
    function getRandomKanji() {
        // CJK統合漢字 (4E00–9FFF) からランダムに選ぶ
        const start = 0x4E00;
        const end = 0x9FFF;
        const codePoint = Math.floor(Math.random() * (end - start + 1)) + start;
        return String.fromCharCode(codePoint);
    }
})