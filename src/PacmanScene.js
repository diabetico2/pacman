import { aStarAlgorithm, getNextIntersection } from './pathfinding.js';
import { initializeGhost, handleGhostDirection, handleGhostMovement } from './ghost.js';

export default class PacmanScene extends Phaser.Scene {
  constructor() {
    super();
    this.score = 0;
    this.level = 1;
    // Variáveis iniciais
    this.direction = "null";
    this.previousDirection = "left";
    this.blockSize = 16;
    this.board = [];
    this.speed = 170;
    this.ghostSpeed = this.speed * 0.7;
    this.intersections = []; // Pontos de interseção do labirinto
    this.nextIntersection = null;
    this.oldNextIntersection = null;

    // Alvos de dispersão para os fantasmas
    this.PINKY_SCATTER_TARGET = { x: 432, y: 80 };
    this.BLINKY_SCATTER_TARGET = { x: 32, y: 80 };
    this.INKY_SCATTER_TARGET = { x: 432, y: 528 };
    this.CLYDE_SCATTER_TARGET = { x: 32, y: 528 };

    // Durações dos modos dos fantasmas (em milissegundos)
    this.scatterModeDuration = 7000;
    this.chaseModeDuration = 20000;
    this.scaredModeDuration = 9000;
    this.entryDelay = 7000;
    this.respawnDelay = 5000;
    this.modeTimer = null;
    this.currentMode = "scatter";

    // Controle de vidas e estado do Pacman
    this.lives = 3;
    this.isPacmanAlive = true;
    this.hasRespawned = false;
  }

  // Método para verificar se um ponto está na "ghost house"
  isInghostHouse(x, y) {
    return (x <= 262 && x >= 208 && y <= 290 && y > 240);
  }

  // Verifica se o fantasma chegou à interseção desejada (com tolerância)
  isGhostAtIntersection(intersection, currentX, currentY, direction) {
    if (!intersection) return false;
    const tolerance = 2; // ajuste se necessário
    return Math.abs(currentX - intersection.x) <= tolerance &&
           Math.abs(currentY - intersection.y) <= tolerance;
  }

  // ************************ Funções de comportamento dos fantasmas ************************

  // Retorna o alvo para o modo "chase" (caça)
  getChaseTarget(ghost) {
    if (ghost.texture.key === "redGhost") {
      return { x: this.pacman.x, y: this.pacman.y };
    }
    if (ghost.texture.key === "pinkGhost") {
      const offset = this.blockSize * 4;
      switch (this.direction) {
        case "right":
          return { x: this.pacman.x + offset, y: this.pacman.y };
        case "left":
          return { x: this.pacman.x - offset, y: this.pacman.y };
        case "up":
          return { x: this.pacman.x, y: this.pacman.y - offset };
        case "down":
          return { x: this.pacman.x, y: this.pacman.y + offset };
        default:
          return { x: this.pacman.x, y: this.pacman.y };
      }
    }
    if (ghost.texture.key === "orangeGhost") {
      const distance = Math.hypot(ghost.x - this.pacman.x, ghost.y - this.pacman.y);
      return distance > this.blockSize * 8
        ? { x: this.pacman.x, y: this.pacman.y }
        : this.CLYDE_SCATTER_TARGET;
    }
    if (ghost.texture.key === "blueGhost") {
      const blinky = this.redGhost;
      let pacmanAhead = { x: this.pacman.x, y: this.pacman.y };
      const aheadOffset = this.blockSize * 2;
      switch (this.direction) {
        case "right":
          pacmanAhead = { x: this.pacman.x + aheadOffset, y: this.pacman.y };
          break;
        case "left":
          pacmanAhead = { x: this.pacman.x - aheadOffset, y: this.pacman.y };
          break;
        case "up":
          pacmanAhead = { x: this.pacman.x, y: this.pacman.y - aheadOffset };
          break;
        case "down":
          pacmanAhead = { x: this.pacman.x, y: this.pacman.y + aheadOffset };
          break;
      }
      const vectorX = pacmanAhead.x - blinky.x;
      const vectorY = pacmanAhead.y - blinky.y;
      return { x: blinky.x + 2 * vectorX, y: blinky.y + 2 * vectorY };
    }
  }

  // Retorna o alvo para o modo "scatter" (dispersão)
  getScatterTarget(ghost) {
    if (ghost.texture.key === "redGhost") return this.BLINKY_SCATTER_TARGET;
    if (ghost.texture.key === "pinkGhost") return this.PINKY_SCATTER_TARGET;
    if (ghost.texture.key === "orangeGhost") return this.CLYDE_SCATTER_TARGET;
    if (ghost.texture.key === "blueGhost") return this.INKY_SCATTER_TARGET;
  }

  // Retorna um alvo aleatório para o modo "scared"
  getScaredTarget(ghost) {
    const randomIndex = Math.floor(Math.random() * this.intersections.length);
    const randomIntersection = this.intersections[randomIndex];
    return { x: randomIntersection.x, y: randomIntersection.y };
  }

  // Recalcula o caminho do fantasma usando o algoritmo A*
  updateGhostPath(ghost, target) {
    let chaseStartPoint = { x: ghost.x, y: ghost.y };
    if (this.isInghostHouse(ghost.x, ghost.y)) {
      chaseStartPoint = { x: 232, y: 240 };
    }
    ghost.path = aStarAlgorithm(
      chaseStartPoint,
      target,
      this.intersections,
      this.isInghostHouse.bind(this),
      getNextIntersection
    );
    if (ghost.path.length > 0) {
      ghost.nextIntersection = ghost.path.shift();
    }
  }

  // Determina a próxima direção para o fantasma com base na próxima interseção
  getGhostNextDirection(ghost, intersection) {
    if (Math.abs(intersection.x - ghost.x) < this.blockSize && ghost.y <= intersection.y)
      return "down";
    if (Math.abs(intersection.x - ghost.x) < this.blockSize && ghost.y >= intersection.y)
      return "up";
    if (Math.abs(intersection.y - ghost.y) < this.blockSize && ghost.x <= intersection.x)
      return "right";
    if (Math.abs(intersection.y - ghost.y) < this.blockSize && ghost.x >= intersection.x)
      return "left";
    return "up";
  }

  // Um esboço para alternar entre modos (scatter/chase/scared)
  setModeTimer(duration) {
    if (this.modeTimer) clearTimeout(this.modeTimer);
    this.modeTimer = setTimeout(() => {
      this.switchMode();
    }, duration);
  }
  switchMode() {
    // Implemente a alternância de modo conforme sua lógica (opcional)
  }

  // *************************************************************************************
  // O restante do código permanece, conforme seu código original
  preload() {
    // Carrega imagens, spritesheets e mapa
    this.load.image("pacman tileset", "pac man tiles/tileset.png");
    this.load.tilemapTiledJSON("map", "pacman-map.json");
    this.load.spritesheet("pacman", "pacman characters/pacman/pacman0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacman1", "pacman characters/pacman/pacman1.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacman2", "pacman characters/pacman/pacman2.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacman3", "pacman characters/pacman/pacman3.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacman4", "pacman characters/pacman/pacman4.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacmanDeath1", "pac man & life counter & death/pac man death/spr_pacdeath_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacmanDeath2", "pac man & life counter & death/pac man death/spr_pacdeath_1.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pacmanDeath3", "pac man & life counter & death/pac man death/spr_pacdeath_2.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("dot", "pacman items/dot.png");
    this.load.image("powerPill", "pacman items/spr_power_pill_0.png");
    this.load.spritesheet("pinkGhost", "ghost/pink ghost/spr_ghost_pink_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("orangeGhost", "ghost/orange ghost/spr_ghost_orange_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("blueGhost", "ghost/blue ghost/spr_ghost_blue_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("redGhost", "ghost/red ghost/spr_ghost_red_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("scaredGhost", "ghost/ghost afraid/spr_afraid_0.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("scaredGhostWhite", "ghost/ghost afraid/spr_afraid_1.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("endGameImage", "pac man text/spr_message_2.png");
    this.load.image("lifeCounter1", "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png");
    this.load.image("lifeCounter2", "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png");
  }

  create() {
    // Cria o mapa e a camada
    this.map = this.make.tilemap({ key: "map" });
    const tileset = this.map.addTilesetImage("pacman tileset");
    const layer = this.map.createLayer("Tile Layer 1", [tileset]);
    this.layer = layer;
    layer.setCollisionByExclusion(-1, true);

    // Cria o sprite do Pacman e suas animações
    this.pacman = this.physics.add.sprite(230, 432, "pacman");
    this.anims.create({
      key: "pacmanAnim",
      frames: [
        { key: "pacman" },
        { key: "pacman1" },
        { key: "pacman2" },
        { key: "pacman3" },
        { key: "pacman4" },
      ],
      frameRate: 10,
      repeat: -1,
    });
    this.pacman.play("pacmanAnim");

    // Animação de morte
    this.anims.create({
      key: "pacmanDeath",
      frames: [
        { key: "pacmanDeath1" },
        { key: "pacmanDeath2" },
        { key: "pacmanDeath3" },
      ],
      frameRate: 10,
      repeat: 0,
    });

    // Configura colisões e grupos
    this.physics.add.collider(this.pacman, layer);
    this.dots = this.physics.add.group();
    this.powerPills = this.physics.add.group();
    this.populateBoardAndTrackEmptyTiles(layer);
    this.physics.add.overlap(this.pacman, this.dots, this.eatDot, null, this);
    this.physics.add.overlap(this.pacman, this.powerPills, this.eatPowerPill, null, this);
    this.cursors = this.input.keyboard.createCursorKeys();

    // Detecta interseções do labirinto
    this.detectIntersections();

    // Inicializa os fantasmas usando função importada
    this.initializeGhosts(layer);

    // Configura os contadores de vida e o placar
    this.lifeCounter1 = this.add.image(32, 32, "lifeCounter1");
    this.lifeCounter2 = this.add.image(56, 32, "lifeCounter2");
    this.scoreText = this.add.text(16, 60, 'Score: ' + this.score, { fontSize: '16px', fill: '#fff' });
    this.levelText = this.add.text(350, 16, 'Level: ' + this.level, { fontSize: '16px', fill: '#fff' });
  }

  initializeGhosts(layer) {
    this.pinkGhost = initializeGhost(232, 290, "pinkGhost", layer, this);
    this.orangeGhost = initializeGhost(210, 290, "orangeGhost", layer, this);
    this.redGhost = initializeGhost(232, 290, "redGhost", layer, this);
    this.blueGhost = initializeGhost(255, 290, "blueGhost", layer, this);
    this.ghosts = [this.pinkGhost, this.redGhost, this.orangeGhost, this.blueGhost];

    this.startGhostEntries();
  }

  startGhostEntries() {
    this.ghosts.forEach((ghost, index) => {
      if (ghost.entryTimer) clearTimeout(ghost.entryTimer);
      ghost.entryTimer = setTimeout(() => {
        this.enterMaze(ghost);
      }, this.entryDelay * index);
    });
  }

  enterMaze(ghost) {
    ghost.setPosition(232, 240);
    ghost.enteredMaze = true;
    if (this.currentMode !== "scared") ghost.hasBeenEaten = true;
  }

  populateBoardAndTrackEmptyTiles(layer) {
    layer.forEachTile(tile => {
      if (!this.board[tile.y]) {
        this.board[tile.y] = [];
      }
      this.board[tile.y][tile.x] = tile.index;
      if (
        tile.y < 4 ||
        (tile.y > 11 && tile.y < 23 && tile.x > 6 && tile.x < 21) ||
        (tile.y === 17 && tile.x !== 6 && tile.x !== 21)
      )
        return;
      let rightTile = this.map.getTileAt(tile.x + 1, tile.y, true, "Tile Layer 1");
      let bottomTile = this.map.getTileAt(tile.x, tile.y + 1, true, "Tile Layer 1");
      let rightBottomTile = this.map.getTileAt(tile.x + 1, tile.y + 1, true, "Tile Layer 1");
      if (
        tile.index === -1 &&
        rightTile && rightTile.index === -1 &&
        bottomTile && bottomTile.index === -1 &&
        rightBottomTile && rightBottomTile.index === -1
      ) {
        const x = tile.x * tile.width;
        const y = tile.y * tile.height;
        this.dots.create(x + tile.width, y + tile.height, "dot");
      }
    });

    this.powerPills.create(32, 144, "powerPill");
    this.powerPills.create(432, 144, "powerPill");
    this.powerPills.create(32, 480, "powerPill");
    this.powerPills.create(432, 480, "powerPill");
  }

  detectIntersections() {
    const directions = [
      { x: -this.blockSize, y: 0, name: "left" },
      { x: this.blockSize, y: 0, name: "right" },
      { x: 0, y: -this.blockSize, name: "up" },
      { x: 0, y: this.blockSize, name: "down" },
    ];
    for (let y = 0; y < this.map.heightInPixels; y += this.blockSize) {
      for (let x = 0; x < this.map.widthInPixels; x += this.blockSize) {
        if (x % this.blockSize !== 0 || y % this.blockSize !== 0) continue;
        if (!this.isPointClear(x, y)) continue;
        let openPaths = [];
        directions.forEach(dir => {
          if (this.isPathOpenAroundPoint(x + dir.x, y + dir.y)) {
            openPaths.push(dir.name);
          }
        });
        if (openPaths.length > 2 && y > 64 && y < 530) {
          this.intersections.push({ x: x, y: y, openPaths });
        } else if (openPaths.length === 2 && y > 64 && y < 530) {
          const [dir1, dir2] = openPaths;
          if (
            ((dir1 === "left" || dir1 === "right") && (dir2 === "up" || dir2 === "down")) ||
            ((dir1 === "up" || dir1 === "down") && (dir2 === "left" || dir2 === "right"))
          ) {
            this.intersections.push({ x: x, y: y, openPaths });
          }
        }
      }
    }
  }

  isPathOpenAroundPoint(pixelX, pixelY) {
    const corners = [
      { x: pixelX - 1, y: pixelY - 1 },
      { x: pixelX + 1, y: pixelY - 1 },
      { x: pixelX - 1, y: pixelY + 1 },
      { x: pixelX + 1, y: pixelY + 1 },
    ];
    return corners.every(corner => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);
      return (!this.board[tileY] || this.board[tileY][tileX] === -1);
    });
  }

  isPointClear(x, y) {
    const corners = [
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
    return corners.every(corner => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);
      return (!this.board[tileY] || this.board[tileY][tileX] === -1);
    });
  }

  eatDot(pacman, dot) {
    dot.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    if (this.dots.countActive(true) === 0) {
      this.levelUp();
    }
  }

  eatPowerPill(pacman, powerPill) {
    powerPill.disableBody(true, true);
    this.score += 50;
    this.scoreText.setText('Score: ' + this.score);
    this.currentMode = "scared";
    this.setModeTimer(this.scaredModeDuration);
    this.ghostSpeed = this.speed * 0.5;
    this.ghosts.forEach(ghost => ghost.hasBeenEaten = false);
  }

  levelUp() {
    this.level += 1;
    this.levelText.setText('Level: ' + this.level);
    this.ghostSpeed = this.speed * 0.7 + (this.level - 1) * 10;
    this.dots.clear(true, true);
    this.powerPills.clear(true, true);
    this.populateBoardAndTrackEmptyTiles(this.layer);
    this.resetGhosts();
  }

  resetGhosts() {
    this.redGhost.setPosition(232, 290);
    this.pinkGhost.setPosition(220, 290);
    this.blueGhost.setPosition(255, 290);
    this.orangeGhost.setPosition(210, 290);
    this.ghosts = [this.pinkGhost, this.redGhost, this.orangeGhost, this.blueGhost];
    this.ghosts.forEach(ghost => {
      ghost.setTexture(ghost.originalTexture);
      ghost.hasBeenEaten = true;
      ghost.enteredMaze = false;
      if (ghost.blinkInterval) clearInterval(ghost.blinkInterval);
      ghost.direction = "left";
    });
    this.startGhostEntries();
    this.setModeTimer(this.scatterModeDuration);
    this.currentMode = "scatter";
  }

  teleportPacmanAcrossWorldBounds() {
    const worldBounds = this.physics.world.bounds;
    if (this.pacman.x <= worldBounds.x) {
      this.pacman.body.reset(worldBounds.right - this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(this.pacman.x, this.pacman.y, "left", this.direction);
      this.pacman.setVelocityX(-this.speed);
    }
    if (this.pacman.x >= worldBounds.right) {
      this.pacman.body.reset(worldBounds.x + this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(this.pacman.x, this.pacman.y, "right", this.direction);
      this.pacman.setVelocityX(this.speed);
    }
  }

  handleDirectionInput() {
    const arrowKeys = ["left", "right", "up", "down"];
    for (const key of arrowKeys) {
      if ((this.cursors[key].isDown && this.direction !== key) || this.hasRespawned) {
        if (this.hasRespawned) this.hasRespawned = false;
        this.previousDirection = this.direction;
        this.direction = key;
        this.nextIntersection = this.getNextIntersectionInNextDirection(
          this.pacman.x,
          this.pacman.y,
          this.previousDirection,
          key
        );
        break;
      }
    }
  }

  getNextIntersectionInNextDirection(currentX, currentY, currentDirection, nextDirection) {
    let filteredIntersections;
    const isUp = currentDirection === "up";
    const isDown = currentDirection === "down";
    const isLeft = currentDirection === "left";
    const isRight = currentDirection === "right";
    filteredIntersections = this.intersections.filter(intersection => {
      return (
        ((isUp && intersection.x === currentX && intersection.y <= currentY) ||
         (isDown && intersection.x === currentX && intersection.y >= currentY) ||
         (isLeft && intersection.y === currentY && intersection.x <= currentX) ||
         (isRight && intersection.y === currentY && intersection.x >= currentX)) &&
        this.isIntersectionInDirection(intersection, nextDirection)
      );
    }).sort((a, b) => {
      if (isUp || isDown) {
        return isUp ? b.y - a.y : a.y - b.y;
      } else {
        return isLeft ? b.x - a.x : a.x - b.x;
      }
    });
    return filteredIntersections ? filteredIntersections[0] : null;
  }

  isIntersectionInDirection(intersection, direction) {
    return intersection.openPaths.includes(direction);
  }

  handlePacmanMovement() {
    let nextIntersectionx = null;
    let nextIntersectiony = null;
    if (this.nextIntersection) {
      nextIntersectionx = this.nextIntersection.x;
      nextIntersectiony = this.nextIntersection.y;
    }
    switch (this.direction) {
      case "left":
        this.handleMovementInDirection("left", "right", this.pacman.y, nextIntersectiony, this.pacman.x, true, false, 0, -this.speed, 0, this.pacman.body.velocity.y);
        break;
      case "right":
        this.handleMovementInDirection("right", "left", this.pacman.y, nextIntersectiony, this.pacman.x, true, false, 180, this.speed, 0, this.pacman.body.velocity.y);
        break;
      case "up":
        this.handleMovementInDirection("up", "down", this.pacman.x, nextIntersectionx, this.pacman.y, false, true, -90, 0, -this.speed, this.pacman.body.velocity.x);
        break;
      case "down":
        this.handleMovementInDirection("down", "up", this.pacman.x, nextIntersectionx, this.pacman.y, false, true, 90, 0, this.speed, this.pacman.body.velocity.x);
        break;
    }
  }

  handleMovementInDirection(currentDirection, oppositeDirection, pacmanPosition, intersectionPosition, movingCoordinate, flipX, flipY, angle, velocityX, velocityY, currentVelocity) {
    let perpendicularDirection = (currentDirection === "left" || currentDirection === "right") ? ["up", "down"] : ["left", "right"];
    let condition = false;
    if (this.nextIntersection)
      condition = (this.previousDirection === perpendicularDirection[0] && pacmanPosition <= intersectionPosition) ||
                  (this.previousDirection === perpendicularDirection[1] && pacmanPosition >= intersectionPosition) ||
                  this.previousDirection === oppositeDirection;
    if (condition) {
      let newPosition = intersectionPosition;
      if (this.previousDirection !== oppositeDirection && newPosition !== pacmanPosition) {
        if (currentDirection === "left" || currentDirection === "right")
          this.pacman.body.reset(movingCoordinate, newPosition);
        else
          this.pacman.body.reset(newPosition, movingCoordinate);
      }
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    } else if (currentVelocity === 0) {
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    }
  }

  adjustPacmanPosition(velocityX, velocityY) {
    if (this.pacman.x % this.blockSize !== 0 && velocityY > 0) {
      let nearestMultiple = Math.round(this.pacman.x / this.blockSize) * this.blockSize;
      this.pacman.body.reset(nearestMultiple, this.pacman.y);
    }
    if (this.pacman.y % this.blockSize !== 0 && velocityX > 0) {
      let nearestMultiple = Math.round(this.pacman.y / this.blockSize) * this.blockSize;
      this.pacman.body.reset(this.pacman.x, nearestMultiple);
    }
  }

  changeDirection(flipX, flipY, angle, velocityX, velocityY) {
    this.pacman.setFlipX(flipX);
    this.pacman.setFlipY(flipY);
    this.pacman.setAngle(angle);
    this.pacman.setVelocityX(velocityX);
    this.pacman.setVelocityY(velocityY);
  }

  update() {
    if (!this.isPacmanAlive || this.lives === 0) return;
    this.handleDirectionInput();
    this.handlePacmanMovement();
    this.teleportPacmanAcrossWorldBounds();
    this.ghosts.forEach(ghost => {
      if (ghost.enteredMaze) {
        handleGhostDirection(ghost, this);
        handleGhostMovement(ghost, this);
      }
    });
  }
}
