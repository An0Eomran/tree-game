const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// دالة لتحديث أبعاد لوحة الرسم داخلياً لتطابق الشاشة تماماً مع الحفاظ على النسب الجديدة
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // إعادة تمركز أبعاد الولد أسفل الشاشة الجديدة ديناميكياً
    boy.y = canvas.height - boy.height; 
    
    // إعادة تموضع الشجرة الكبيرة في المنتصف الخلفي السفلي
    tree.x = canvas.width / 2 - tree.width / 2;
    tree.y = canvas.height - tree.height - 20;
}

// عناصر الواجهة
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');

// متغيرات حالة اللعبة
let score = 0;
let lives = 5;
let gameActive = false;
let fallingObjects = [];
let spawnTimer = 0;
let currentTreeState = "happy"; 

const keys = {
    ArrowLeft: false,
    ArrowRight: false
};

// --- استدعاء الصور المحلية الافتراضية ---
const boyImage = new Image();
boyImage.src = 'img/player.png'; 

const happyTreeImg = new Image();
happyTreeImg.src = 'img/tree_happy.png'; 

const sadTreeImg = new Image();
sadTreeImg.src = 'img/tree_sad.png'; 

const mineImg = new Image();
mineImg.src = 'img/mine.png'; 

const goodImagesNames = [
    'kindness.png',
    'respect.png',
    'teamwork.png',
    'excellence.png',
    'friendliness.png',
    'trustworthiness.png'
];

const goodImagesPool = goodImagesNames.map(name => {
    const img = new Image();
    img.src = `img/${name}`;
    return img;
});

// --- استدعاء الأصوات ---
const soundSuccess = new Audio('sounds/success.mp3'); 
const soundHit = new Audio('sounds/hit.mp3');         
const soundWin = new Audio('sounds/win.mp3');         
const soundLose = new Audio('sounds/lose.mp3');       

// إعدادات الولد (اللاعب) - تم تكبيره وتثبيته على الأرض بشكل متناسق
const boy = {
    x: window.innerWidth / 2 - 150,
    y: window.innerHeight - 260, // تم إنزاله ليلتصق بأسفل الشاشة تماماً
    width: 380,                  // تكبير العرض ليناسب الشاشة الكاملة
    height: 260,                 // تكبير الارتفاع لتبدو تفاصيله واضحة
    speed: 18                    // زيادة طفيفة في السرعة لتناسب حجمه الجديد
};

// إعدادات الشجرة التكيفية في الخلفية - تم تكبيرها لتصبح شجرة حقيقية فخمة
const tree = {
    x: window.innerWidth / 2 - 200, 
    y: window.innerHeight - 520,
    width: 400,                  // تكبير عرض الشجرة
    height: 500                  // تكبير ارتفاع الشجرة لتظهر في منتصف السماء بروعة
};

// تشغيل وظيفة ضبط المقاسات فوراً ولتتحدث عند تدوير الجوال أو تغيير حجم نافذة اللاب توب
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function handlePlayerMovement(clientX) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    
    boy.x = mouseX - boy.width / 2;
    
    // منع الخروج عن حواف شاشة العرض الكاملة تماماً
    if (boy.x < -boy.width / 4) boy.x = -boy.width / 4;
    if (boy.x > canvas.width - (boy.width * 3 / 4)) boy.x = canvas.width - (boy.width * 3 / 4);
}

// أحداث الماوس واللمس
canvas.addEventListener('mousemove', (e) => { handlePlayerMovement(e.clientX); });
canvas.addEventListener('touchstart', (e) => { if (e.touches.length > 0) handlePlayerMovement(e.touches[0].clientX); }, { passive: true });
canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        handlePlayerMovement(e.touches[0].clientX);
        e.preventDefault(); 
    }
}, { passive: false });

window.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys[e.key] = false; });

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    const scoreBoard = document.getElementById('score').parentElement.parentElement;
    if(scoreBoard) scoreBoard.style.display = 'flex';
    
    score = 0;
    lives = 5;
    fallingObjects = [];
    spawnTimer = 0;
    gameActive = true;
    currentTreeState = "happy";
    
    scoreDisplay.innerText = score;
    updateLivesDisplay();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    resizeCanvas(); // تأكيد المقاسات ثانيةً عند بدء اللعب
    requestAnimationFrame(gameLoop);
}

function updateLivesDisplay() {
    livesDisplay.innerText = "🍃".repeat(lives) + "🍂".repeat(5 - lives);
}

class FallingObject {
    constructor() {
        this.type = Math.random() > 0.2 ? 'drop' : 'rock';
        this.x = Math.random() * (canvas.width - 120) + 60;
        this.y = -60;
        // تعديل السرعة لتتناسب مع طول الشاشة الديناميكي
        this.speed = Math.random() * 1.5 + 1.5 + (score * 0.08);
        this.radius = 30; 
        
        // حجم الصور HD ممتاز للرؤية والشاشات الكاملة
        this.height = 110; 
        
        if (this.type === 'drop') {
            const randomIndex = Math.floor(Math.random() * goodImagesPool.length);
            this.img = goodImagesPool[randomIndex];
            
            if (this.img.complete && this.img.naturalWidth > 0) {
                const aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
                this.width = this.height * aspectRatio;
            } else {
                this.width = 110; 
            }
        } else {
            if (mineImg.complete && mineImg.naturalWidth > 0) {
                const aspectRatio = mineImg.naturalWidth / mineImg.naturalHeight;
                this.width = this.height * aspectRatio; 
            } else {
                this.width = 110; 
            }
        }
    }

    update() {
        this.y += this.speed;
        if (this.type === 'drop' && this.width === 110 && this.img.complete && this.img.naturalWidth > 0) {
            const aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
            this.width = this.height * aspectRatio;
        }
    }

    draw() {
        ctx.save();
        if (this.type === 'drop') {
            ctx.drawImage(this.img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            ctx.drawImage(mineImg, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
        ctx.restore();
    }
}

function drawTreeImage() {
    let scaleModifier = 1 + (score * 0.02); 
    if (scaleModifier > 1.3) scaleModifier = 1.3; 

    if (currentTreeState === "win") scaleModifier = 1.3;

    let currentWidth = tree.width * scaleModifier;
    let currentHeight = tree.height * scaleModifier;

    // تمركز الشجرة دائماً في منتصف الشاشة السفلي خلف اللاعب
    let centerX = (canvas.width / 2) - (currentWidth / 2);
    let currentY = canvas.height - currentHeight - 30; 

    ctx.save();
    
    if (currentTreeState === "happy" || currentTreeState === "win") {
        ctx.drawImage(happyTreeImg, centerX, currentY, currentWidth, currentHeight);
    } else if (currentTreeState === "sad") {
        ctx.drawImage(sadTreeImg, centerX, currentY, currentWidth, currentHeight);
    }

    if (currentTreeState === "win") {
        const fruits = [
            { dx: currentWidth * 0.35, dy: currentHeight * 0.25 },
            { dx: currentWidth * 0.65, dy: currentHeight * 0.25 },
            { dx: currentWidth * 0.25, dy: currentHeight * 0.4 },
            { dx: currentWidth * 0.53, dy: currentHeight * 0.33 },
            { dx: currentWidth * 0.75, dy: currentHeight * 0.40 }
        ];
        fruits.forEach(fruit => {
            let fruitX = centerX + fruit.dx;
            let fruitY = currentY + fruit.dy;
            ctx.beginPath();
            ctx.arc(fruitX, fruitY, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ff1744'; 
            ctx.fill();
            ctx.closePath();
        });
    }
    ctx.restore();
}

function drawBoy() {
    ctx.drawImage(boyImage, boy.x, boy.y, boy.width, boy.height);
}

function gameLoop() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawTreeImage();

    spawnTimer++;
    if (spawnTimer > 60) { // زيادة طفيفة في سرعة النزول لتناسب الشاشات الكبيرة
        fallingObjects.push(new FallingObject());
        spawnTimer = 0;
    }

    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        let obj = fallingObjects[i];
        obj.update();
        obj.draw();

        // حساب منطقة الاصطدام بالدلو بدقة مرنة
        const bucketTopY = boy.y + 10; 
        const bucketLeftX = boy.x + 50;   
        const bucketRightX = boy.x + boy.width - 50; 

        if (obj.y + obj.radius >= bucketTopY && obj.y - obj.radius <= bucketTopY + 25 &&
            obj.x >= bucketLeftX && obj.x <= bucketRightX) {
            
            if (obj.type === 'drop') {
                score += 1;
                scoreDisplay.innerText = score;
                currentTreeState = "happy";
                soundSuccess.currentTime = 0;
                soundSuccess.play().catch(e => {});
            } else {
                lives -= 1;
                updateLivesDisplay();
                currentTreeState = "sad";   
                soundHit.currentTime = 0;
                soundHit.play().catch(e => {});

                if (lives <= 0) endGame(false);
            }
            fallingObjects.splice(i, 1);
            continue;
        }

        if (obj.y > canvas.height + 50) {
            fallingObjects.splice(i, 1);
        }
    }

    if (keys.ArrowRight) boy.x += boy.speed; 
    if (keys.ArrowLeft) boy.x -= boy.speed; 

    if (boy.x < -boy.width / 4) boy.x = -boy.width / 4;
    if (boy.x > canvas.width - (boy.width * 3 / 4)) boy.x = canvas.width - (boy.width * 3 / 4);

    drawBoy();

    if (score >= 20) endGame(true);

    if (gameActive) requestAnimationFrame(gameLoop);
}

function endGame(isWin) {
    gameActive = false;
    fallingObjects = []; 

    const scoreBoard = document.getElementById('score').parentElement.parentElement; 
    if(scoreBoard) scoreBoard.style.display = 'none';

    if (isWin) {
        currentTreeState = "win"; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTreeImage(); 
        gameOverScreen.classList.remove('hidden');
        soundWin.play().catch(e => {});
        gameOverTitle.innerText = "🎉 مبروك يا بطل! 🎉";
        gameOverMessage.innerText = `لقد جمعت ${score} قيم تربوية بوعائك وسقيت بها شجرة القلوب حتى أزهرت تماماً! ❤️`;
    } else {
        currentTreeState = "sad"; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTreeImage(); 
        gameOverScreen.classList.remove('hidden');
        soundLose.play().catch(e => {});
        gameOverTitle.innerText = "🍂 حاول مرة أخرى 🍂";
        gameOverMessage.innerText = `أصابت الشجرة بعض ألغام السلوكيات الخاطئة فذبلت. أعد اللعب لتملأ الدلو بالقيم مجدداً!`;
    }
}