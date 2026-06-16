const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ضبط أبعاد لوحة الرسم داخلياً (ثابتة للحسابات البرمجية والـ CSS يتكفل بالظاهر)
canvas.width = 800;
canvas.height = 600;

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

// كائن تتبع حالة ضغط الأسهم للـ PC
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

// تحميل مصفوفة صور القيم التربوية الستة
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

// --- استدعاء الأصوات المحلية ---
const soundSuccess = new Audio('sounds/success.mp3'); 
const soundHit = new Audio('sounds/hit.mp3');         
const soundWin = new Audio('sounds/win.mp3');         
const soundLose = new Audio('sounds/lose.mp3');       

// إعدادات الولد (اللاعب)
const boy = {
    x: 300,
    y: 390, 
    width: 300,  
    height: 200, 
    speed: 15
};

// إعدادات الشجرة في الخلفية
const tree = {
    x: 270, 
    y: 100,
    width: 260,
    height: 350
};

// --- 🎮 دالة مركزية لحساب موقع الـ X وحماية الحواف (للجوال والكمبيوتر) 🎮 ---
function handlePlayerMovement(clientX) {
    const rect = canvas.getBoundingClientRect();
    // حساب النسبة بين الحجم الداخلي للـ Canvas والحجم الظاهري المعروض على الشاشة
    const scaleX = canvas.width / rect.width;
    const mouseX = (clientX - rect.left) * scaleX;
    
    boy.x = mouseX - boy.width / 2;
    
    // حدود الحواف المرنة الأصلية
    if (boy.x < -boy.width / 3) {
        boy.x = -boy.width / 3;
    }
    if (boy.x > canvas.width - (boy.width * 2 / 3)) {
        boy.x = canvas.width - (boy.width * 2 / 3);
    }
}

// 🖱️ تتبع حركة الماوس للـ PC
canvas.addEventListener('mousemove', (e) => {
    handlePlayerMovement(e.clientX);
});

// 📱 --- [إضافة جديدة] تتبع اللمس والسحب للشاشات الذكية والجوال --- 📱
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        handlePlayerMovement(e.touches[0].clientX);
    }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        handlePlayerMovement(e.touches[0].clientX);
        // منع الشاشة من الاهتزاز أو السحب لأسفل أثناء اللعب على المتصفح في الجوال
        e.preventDefault(); 
    }
}, { passive: false });


// مستمعي أحداث لوحة المفاتيح (الأسهم للـ PC)
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys[e.key] = false;
});

// تشغيل اللعبة
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

    requestAnimationFrame(gameLoop);
}

function updateLivesDisplay() {
    livesDisplay.innerText = "🍃".repeat(lives) + "🍂".repeat(5 - lives);
}

// الكلاس الخاص بالأشياء الساقطة
class FallingObject {
    constructor() {
        this.type = Math.random() > 0.2 ? 'drop' : 'rock';
        this.x = Math.random() * (canvas.width - 160) + 80;
        this.y = -50;
        this.speed = Math.random() * 0.5 + 0.5 + (score * 0.05);
        this.radius = 35; 
        
        this.height = 75; // حجم مريح ومقروء HD بناءً على اختيارك السابق لارتفاع الصور
        
        if (this.type === 'drop') {
            const randomIndex = Math.floor(Math.random() * goodImagesPool.length);
            this.img = goodImagesPool[randomIndex];
            
            if (this.img.complete && this.img.naturalWidth > 0) {
                const aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
                this.width = this.height * aspectRatio;
            } else {
                this.width = 140; 
            }
        } else {
            if (mineImg.complete && mineImg.naturalWidth > 0) {
                const aspectRatio = mineImg.naturalWidth / mineImg.naturalHeight;
                this.width = this.height * aspectRatio; 
            } else {
                this.width = 140; 
            }
        }
    }

    update() {
        this.y += this.speed;
        
        if (this.type === 'drop' && this.width === 140 && this.img.complete && this.img.naturalWidth > 0) {
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
    if (scaleModifier > 1.4) scaleModifier = 1.4; 

    if (currentTreeState === "win") scaleModifier = 1.4;

    let currentWidth = tree.width * scaleModifier;
    let currentHeight = tree.height * scaleModifier;

    let centerX = (tree.x + tree.width / 2) - (currentWidth / 2);
    let currentY = canvas.height - currentHeight - 50; 

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
            { dx: currentWidth * 0.75, dy: currentHeight * 0.40 },
            { dx: currentWidth * 0.42, dy: currentHeight * 0.41 }
        ];

        fruits.forEach(fruit => {
            let fruitX = centerX + fruit.dx;
            let fruitY = currentY + fruit.dy;
            let radius = 12;

            ctx.beginPath();
            ctx.arc(fruitX, fruitY, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff1744'; 
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.arc(fruitX - 4, fruitY - 4, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
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
    if (spawnTimer > 70) {
        fallingObjects.push(new FallingObject());
        spawnTimer = 0;
    }

    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        let obj = fallingObjects[i];
        obj.update();
        obj.draw();

        const bucketTopY = boy.y + 15; 
        const bucketLeftX = boy.x + 80;   
        const bucketRightX = boy.x + boy.width - 80; 

        if (obj.y + obj.radius >= bucketTopY && obj.y - obj.radius <= bucketTopY + 30 &&
            obj.x >= bucketLeftX && obj.x <= bucketRightX) {
            
            if (obj.type === 'drop') {
                score += 1;
                scoreDisplay.innerText = score;
                currentTreeState = "happy";
                soundSuccess.currentTime = 0;
                soundSuccess.play().catch(e => console.log(e));
            } else {
                lives -= 1;
                updateLivesDisplay();
                currentTreeState = "sad";   
                soundHit.currentTime = 0;
                soundHit.play().catch(e => console.log(e));

                if (lives <= 0) endGame(false);
            }
            fallingObjects.splice(i, 1);
            continue;
        }

        if (obj.y > canvas.height + 40) {
            fallingObjects.splice(i, 1);
        }
    }

    // حركة الأسهم (للـ PC)
    if (keys.ArrowRight) boy.x += boy.speed; 
    if (keys.ArrowLeft) boy.x -= boy.speed; 

    // تطبيق الحماية العامة للحواف
    if (boy.x < -boy.width / 3) boy.x = -boy.width / 3;
    if (boy.x > canvas.width - (boy.width * 2 / 3)) boy.x = canvas.width - (boy.width * 2 / 3);

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
        soundWin.play().catch(e => console.log(e));
        gameOverTitle.innerText = "🎉 مبروك يا بطل! 🎉";
        gameOverMessage.innerText = `لقد جمعت ${score} قطرة من الكلمات الطيبة بوعائك وسقيت بها شجرة القلوب حتى أزهرت تماماً! ❤️`;
    } else {
        currentTreeState = "sad"; 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTreeImage(); 
        gameOverScreen.classList.remove('hidden');
        soundLose.play().catch(e => console.log(e));
        gameOverTitle.innerText = "🍂 حاول مرة أخرى 🍂";
        gameOverMessage.innerText = `أصابت الشجرة بعض صخور الكلمات القاسية فذبلت. أعد اللعب لتملأ الدلو بقطرات اللطف مجدداً!`;
    }
}