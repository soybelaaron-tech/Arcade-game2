// Simple space arcade shooter

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const restartBtn = document.getElementById("restartBtn");

// Game state
let player;
let bullets = [];
let enemies = [];
let particles = [];
let keys = {};
let score = 0;
let lives = 3;
let gameOver = false;
let lastEnemySpawn = 0;
let enemySpawnInterval = 1200; // ms

// Utility
function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Player
class Player {
  constructor() {
    this.width = 40;
    this.height = 40;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 30;
    this.speed = 4;
    this.cooldown = 0;
  }

  update(delta) {
    if (keys["ArrowLeft"]) this.x -= this.speed;
    if (keys["ArrowRight"]) this.x += this.speed;
    if (keys["ArrowUp"]) this.y -= this.speed;
    if (keys["ArrowDown"]) this.y += this.speed;

    // Clamp to canvas
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

    // Shooting
    if (keys[" "] && this.cooldown <= 0 && !gameOver) {
      this.shoot();
      this.cooldown = 250; // ms
    }

    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }
  }

  shoot() {
    const bullet = new Bullet(
      this.x + this.width / 2,
      this.y,
      0,
      -7,
      "player"
    );
    bullets.push(bullet);
  }

  draw() {
    // Ship body
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    const gradient = ctx.createLinearGradient(-20, -20, 20, 20);
    gradient.addColorStop(0, "#7fd1ff");
    gradient.addColorStop(1, "#2b5cff");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(18, 18);
    ctx.lineTo(0, 10);
    ctx.lineTo(-18, 18);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#e6f1ff";
    ctx.beginPath();
    ctx.ellipse(0, -6, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Bullet
class Bullet {
  constructor(x, y, vx, vy, owner) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner; // "player" or "enemy"
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.owner === "player" ? "#7fffd4" : "#ff6b81";
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  isOffscreen() {
    return (
      this.y < -10 ||
      this.y > canvas.height + 10 ||
      this.x < -10 ||
      this.x > canvas.width + 10
    );
  }
}

// Enemy
class Enemy {
  constructor() {
    this.width = 36;
    this.height = 30;
    this.x = randRange(20, canvas.width - 56);
    this.y = -40;
    this.speed = randRange(1.2, 2.4);
    this.hp = 1;
    this.shootTimer = randRange(800, 1600);
  }

  update(delta) {
    this.y += this.speed;

    this.shootTimer -= delta;
    if (this.shootTimer <= 0 && !gameOver) {
      this.shoot();
      this.shootTimer = randRange(1200, 2200);
    }
  }

  shoot() {
    const bullet = new Bullet(
      this.x + this.width / 2,
      this.y + this.height,
      0,
      4,
      "enemy"
    );
    bullets.push(bullet);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    const gradient = ctx.createLinearGradient(-18, -15, 18, 15);
    gradient.addColorStop(0, "#ff9f9a");
    gradient.addColorStop(1, "#ff4b6e");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(18, -10);
    ctx.lineTo(12, 12);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();

    // Core
    ctx.fillStyle = "#ffe6f0";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  isOffscreen() {
    return this.y > canvas.height + 40;
  }
}

// Particles for explosions
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = randRange(-2, 2);
    this.vy = randRange(-2, 2);
    this.life = randRange(300, 700);
    this.size = randRange(1.5, 3.5);
    this.color = color;
  }

  update(delta) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= delta;
  }

  draw() {
    ctx.globalAlpha = Math.max(this.life / 700, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  isDead() {
    return this.life <= 0;
  }
}

// Input handling
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") e.preventDefault();
  keys[e.key] = true;

  if (gameOver && e.key === "Enter") {
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Collision helpers
function rectCircleColliding(circle, rect) {
  const distX = Math.abs(circle.x - (rect.x + rect.width / 2));
  const distY = Math.abs(circle.y - (rect.y + rect.height / 2));

  if (distX > rect.width / 2 + circle.radius) return false;
  if (distY > rect.height / 2 + circle.radius) return false;

  if (distX <= rect.width / 2) return true;
  if (distY <= rect.height / 2) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

// Game loop
let lastTime = 0;

function gameLoop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(delta) {
  if (gameOver) return;

  // Spawn enemies
  lastEnemySpawn += delta;
  if (lastEnemySpawn > enemySpawnInterval) {
    enemies.push(new Enemy());
    lastEnemySpawn = 0;
    enemySpawnInterval = randRange(900, 1500);
  }

  player.update(delta);

  bullets.forEach((b) => b.update());
  enemies.forEach((e) => e.update(delta));
  particles.forEach((p) => p.update(delta));

  // Remove offscreen bullets/enemies/particles
  bullets = bullets.filter((b) => !b.isOffscreen());
  enemies = enemies.filter((e) => !e.isOffscreen());
  particles = particles.filter((p) => !p.isDead());

  handleCollisions();
}

function handleCollisions() {
  // Player bullets vs enemies
  bullets.forEach((bullet, bIndex) => {
    if (bullet.owner !== "player") return;

    enemies.forEach((enemy, eIndex) => {
      if (
        rectCircleColliding(bullet, {
          x: enemy.x,
          y: enemy.y,
          width: enemy.width,
          height: enemy.height,
        })
      ) {
        // Hit
        bullets.splice(bIndex, 1);
        enemy.hp -= 1;
        spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (enemy.hp <= 0) {
          enemies.splice(eIndex, 1);
          score += 100;
          scoreEl.textContent = score;
        }
      }
    });
  });

  // Enemy bullets vs player
  bullets.forEach((bullet, bIndex) => {
    if (bullet.owner !== "enemy") return;

    if (
      rectCircleColliding(bullet, {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
      })
    ) {
      bullets.splice(bIndex, 1);
      damagePlayer();
    }
  });

  // Enemies colliding with player
  enemies.forEach((enemy, eIndex) => {
    const colliding =
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y;

    if (colliding) {
      enemies.splice(eIndex, 1);
      spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      damagePlayer();
    }
  });
}

function damagePlayer() {
  if (gameOver) return;

  spawnExplosion(player.x + player.width / 2, player.y + player.height / 2);
  lives -= 1;
  livesEl.textContent = lives;

  if (lives <= 0) {
    endGame();
  }
}

function spawnExplosion(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push(new Particle(x, y, "#ffdf7f"));
  }
}

// Drawing
function drawBackground() {
  // Starfield
  ctx.fillStyle = "#050814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Simple stars
  for (let i = 0; i < 60; i++) {
    const x = (i * 73) % canvas.width;
    const y = (i * 131) % canvas.height;
    const size = (i % 3) + 1;
    ctx.fillStyle = i % 2 === 0 ? "#7fd1ff" : "#ffffff";
    ctx.globalAlpha = 0.2 + (i % 5) * 0.15;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();

  particles.forEach((p) => p.draw());
  player.draw();
  enemies.forEach((e) => e.draw());
  bullets.forEach((b) => b.draw());

  if (gameOver) {
    drawGameOver();
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e6f1ff";
  ctx.textAlign = "center";

  ctx.font = "40px 'Segoe UI', system-ui";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = "20px 'Segoe UI', system-ui";
  ctx.fillText(
    `Final Score: ${score}`,
    canvas.width / 2,
    canvas.height / 2 + 16
  );
  ctx.fillText(
    "Press Enter or click Restart to play again",
    canvas.width / 2,
    canvas.height / 2 + 46
  );
}

// Game control
function endGame() {
  gameOver = true;
}

function resetGame() {
  score = 0;
  lives = 3;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  bullets = [];
  enemies = [];
  particles = [];
  gameOver = false;
  player = new Player();
}

restartBtn.addEventListener("click", resetGame);

// Init
function init() {
  player = new Player();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

init();