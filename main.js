// Classe principal que estende a cena do Phaser para o jogo Pacman
class Pacman extends Phaser.Scene {
  constructor() {
    super();
    this.score = 0;
    this.level = 1;
    // Variáveis e configurações iniciais do jogo
    this.Pacman = null;
    this.direction = "null";
    this.previousDirection = "left";
    this.blockSize = 16;
    this.board = [];
    this.speed = 170;
    this.ghostSpeed = this.speed * 0.7;
    this.intersections = []; // Armazena pontos de interseção do labirinto
    this.nextIntersection = null;
    this.oldNextIntersection = null;

    // Alvos de dispersão (scatter targets) para cada fantasma
    this.PINKY_SCATTER_TARGET = { x: 432, y: 80 };
    this.BLINKY_SCATTER_TARGET = { x: 32, y: 80 };
    this.INKY_SCATTER_TARGET = { x: 432, y: 528 };
    this.CLYDE_SCATTER_TARGET = { x: 32, y: 528 };

    // Durações dos modos de comportamento dos fantasmas (em milissegundos)
    this.scatterModeDuration = 7000;
    this.chaseModeDuration = 20000;
    this.scaredModeDuration = 9000;
    this.entryDelay = 7000;
    this.respawnDelay = 5000;
    this.modeTimer = null;
    this.currentMode = "scatter";
    this.initModeTimers(); // Inicia o temporizador do modo

    // Controle de vidas e estado do Pacman
    this.lives = 3;
    this.isPacmanAlive = true;
    this.hasRespawned = false;
  }

  // Inicializa o temporizador do modo de jogo
  initModeTimers() {
    this.setModeTimer(this.scatterModeDuration);
  }

  // Define um temporizador para mudar o modo após um período
  setModeTimer(duration) {
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
    }
    this.modeTimer = setTimeout(() => {
      this.switchMode();
    }, duration);
  }

  // Alterna entre os modos de comportamento dos fantasmas (scatter, chase e scared)
  switchMode() {
    if (this.currentMode === "scared") {
      // Se sair do modo "scared", volta para o modo anterior ou "scatter"
      this.currentMode = this.previouseMode || "scatter";
      this.setModeTimer(this[this.currentMode + "ModeDuration"]);
      this.ghostSpeed = this.speed * 0.7;
      this.ghosts.forEach((ghost) => {
        clearInterval(ghost.blinkInterval);
        ghost.setTexture(ghost.originalTexture);
        // Atualiza o caminho do fantasma conforme o modo atual
        let target =
          this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, target);
        ghost.hasBeenEaten = true;
      });
    } else {
      // Alterna entre os modos "scatter" e "chase"
      if (this.currentMode === "scatter") {
        this.currentMode = "chase";
        this.setModeTimer(this.chaseModeDuration);
      } else {
        this.currentMode = "scatter";
        this.setModeTimer(this.scatterModeDuration);
      }
      this.ghosts.forEach((ghost) => {
        let target =
          this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, target);
      });
      this.previouseMode = this.currentMode;
    }
  }

  // Retorna o alvo de caça (chase target) para cada fantasma, baseado em suas regras individuais
  getChaseTarget(ghost) {
    if (ghost.texture.key === "redGhost") {
      // Blinky persegue diretamente o Pacman
      return { x: this.pacman.x, y: this.pacman.y };
    }
    if (ghost.texture.key === "pinkGhost") {
      // Pinky tenta prever o movimento do Pacman com um offset
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
      // Clyde persegue o Pacman se estiver longe, senão vai para o alvo de dispersão dele
      const distance = Math.hypot(
        ghost.x - this.pacman.x,
        ghost.y - this.pacman.y
      );
      return distance > this.blockSize * 8
        ? { x: this.pacman.x, y: this.pacman.y }
        : this.CLYDE_SCATTER_TARGET;
    }
    if (ghost.texture.key === "blueGhost") {
      // Inky utiliza a posição de Blinky e a posição prevista do Pacman para calcular seu alvo
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

  // Retorna um alvo aleatório para o modo "scared" (quando os fantasmas fogem)
  getScaredTarget(ghost) {
    let randomIndex = Math.floor(Math.random() * this.intersections.length);
    let randomIntersection = this.intersections[randomIndex];
    return { x: randomIntersection.x, y: randomIntersection.y };
  }

  // Retorna o alvo de dispersão (scatter target) para cada fantasma
  getScatterTarget(ghost) {
    if (ghost.texture.key === "redGhost") return this.BLINKY_SCATTER_TARGET;
    if (ghost.texture.key === "pinkGhost") return this.PINKY_SCATTER_TARGET;
    if (ghost.texture.key === "orangeGhost") return this.CLYDE_SCATTER_TARGET;
    if (ghost.texture.key === "blueGhost") return this.INKY_SCATTER_TARGET;
  }

  // Atualiza o caminho do fantasma utilizando o algoritmo A* para chegar ao alvo desejado
  updateGhostPath(ghost, chaseTarget) {
    let chaseStartPoint = { x: ghost.x, y: ghost.y };

    // Se o fantasma está na "casa" (ghost house), inicia o caminho a partir de um ponto fixo
    if (this.isInghostHouse(ghost.x, ghost.y)) {
      chaseStartPoint = { x: 232, y: 240 };
    }

    ghost.path = this.aStarAlgorithm(chaseStartPoint, chaseTarget);
    if (ghost.path.length > 0) ghost.nextIntersection = ghost.path.shift();
  }

  // Método preload() para carregar assets do jogo
  preload() {
    // Carrega imagens, spritesheets e arquivos de mapa
    this.load.image("pacman tileset", "pac man tiles/tileset.png");
    this.load.tilemapTiledJSON("map", "pacman-map.json");
    this.load.spritesheet("pacman", "pacman characters/pacman/pacman0.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman1", "pacman characters/pacman/pacman1.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman2", "pacman characters/pacman/pacman2.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman3", "pacman characters/pacman/pacman3.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman4", "pacman characters/pacman/pacman4.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Sprites para a animação de morte do Pacman
    this.load.spritesheet(
      "pacmanDeath1",
      "pac man & life counter & death/pac man death/spr_pacdeath_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "pacmanDeath2",
      "pac man & life counter & death/pac man death/spr_pacdeath_1.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "pacmanDeath3",
      "pac man & life counter & death/pac man death/spr_pacdeath_2.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );

    // Itens do jogo: pontos (dots) e power pills
    this.load.image("dot", "pacman items/dot.png");
    this.load.image("powerPill", "pacman items/spr_power_pill_0.png");

    // Sprites dos fantasmas e modos "scared"
    this.load.spritesheet(
      "pinkGhost",
      "ghost/pink ghost/spr_ghost_pink_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "orangeGhost",
      "ghost/orange ghost/spr_ghost_orange_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "blueGhost",
      "ghost/blue ghost/spr_ghost_blue_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet("redGhost", "ghost/red ghost/spr_ghost_red_0.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(
      "scaredGhost",
      "ghost/ghost afraid/spr_afraid_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "scaredGhostWhite",
      "ghost/ghost afraid/spr_afraid_1.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.image("endGameImage", "pac man text/spr_message_2.png");
    this.load.image(
      "lifeCounter1",
      "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png"
    );
    this.load.image(
      "lifeCounter2",
      "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png"
    );
  }

  // Método create() é executado uma vez e cria os objetos e configurações do jogo
  create() {
    // Cria o mapa usando o tilemap previamente carregado
    this.map = this.make.tilemap({ key: "map" });
    const tileset = this.map.addTilesetImage("pacman tileset");
    const layer = this.map.createLayer("Tile Layer 1", [tileset]);
    this.layer = this.map.createLayer("Tile Layer 1", [tileset]); 
    layer.setCollisionByExclusion(-1, true);

    // Cria o sprite do Pacman e configura sua animação
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

    // Animação de morte do Pacman
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

    // Colisão entre o Pacman e o layer do mapa
    this.physics.add.collider(this.pacman, layer);

    // Cria grupos para os pontos (dots) e power pills
    this.dots = this.physics.add.group();
    this.powerPills = this.physics.add.group();

    // Popula o tabuleiro com pontos e identifica tiles vazios
    this.populateBoardAndTrackEmptyTiles(layer);
    // Detecta colisões entre o Pacman e os pontos/power pills
    this.physics.add.overlap(this.pacman, this.dots, this.eatDot, null, this);
    this.physics.add.overlap(
      this.pacman,
      this.powerPills,
      this.eatPowerPill,
      null,
      this
    );

    // Captura as teclas de direção para controlar o Pacman
    this.cursors = this.input.keyboard.createCursorKeys();

    // Detecta interseções importantes do labirinto para navegação dos fantasmas
    this.detectIntersections();

    // Inicializa os fantasmas e define seus caminhos iniciais
    this.initializeGhosts(layer);
    let startPoint = { x: 232, y: 240 };
    this.pinkGhost.path = this.aStarAlgorithm(
      startPoint,
      this.PINKY_SCATTER_TARGET
    );
    this.pinkGhost.nextIntersection = this.pinkGhost.path.shift();

    this.blueGhost.path = this.aStarAlgorithm(
      startPoint,
      this.INKY_SCATTER_TARGET
    );
    this.blueGhost.nextIntersection = this.blueGhost.path.shift();

    this.orangeGhost.path = this.aStarAlgorithm(
      startPoint,
      this.CLYDE_SCATTER_TARGET
    );
    this.orangeGhost.nextIntersection = this.orangeGhost.path.shift();

    this.redGhost.path = this.aStarAlgorithm(
      startPoint,
      this.BLINKY_SCATTER_TARGET
    );
    this.redGhost.nextIntersection = this.redGhost.path.shift();

    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];
    // Define colisões entre o Pacman e cada fantasma
    this.ghosts.forEach((ghost) => {
      this.physics.add.overlap(
        this.pacman,
        ghost,
        this.handlePacmanGhostCollision,
        null,
        this
      );
    });

    // Exibe os contadores de vida
    this.lifeCounter1 = this.add.image(32, 32, "lifeCounter1");
    this.lifeCounter2 = this.add.image(56, 32, "lifeCounter2");
    

    this.scoreText = this.add.text(16, 60, 'Score: ' + this.score, {
      fontSize: '16px',
      fill: '#fff'
    });
    this.levelText = this.add.text(350, 16, 'Level: ' + this.level, {
      fontSize: '16px',
      fill: '#fff'
    });
  }

  // Inicializa os fantasmas chamando a função para cada um e define o início da entrada na maze
  initializeGhosts(layer) {
    this.pinkGhost = this.initializeGhost(232, 290, "pinkGhost", layer);
    this.orangeGhost = this.initializeGhost(210, 290, "orangeGhost", layer);
    this.redGhost = this.initializeGhost(232, 290, "redGhost", layer);
    this.blueGhost = this.initializeGhost(255, 290, "blueGhost", layer);
    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];
    this.startGhostEntries();
  }

  // Define o tempo de entrada de cada fantasma no labirinto
  startGhostEntries() {
    this.ghosts.forEach((ghost, index) => {
      if (ghost.entryTimer) {
        clearTimeout(ghost.entryTimer);
      }
      ghost.entryTimer = setTimeout(() => {
        this.enterMaze(ghost);
      }, this.entryDelay * index);
    });
  }

  // Move o fantasma para dentro do labirinto a partir da "ghost house"
  enterMaze(ghost) {
    ghost.setPosition(232, 240);
    ghost.enteredMaze = true;
    if (this.currentMode !== "scared") ghost.hasBeenEaten = true;
  }

  // Função auxiliar para inicializar cada fantasma
  initializeGhost(x, y, spriteKey, layer) {
    const ghost = this.physics.add.sprite(x, y, spriteKey);
    this.physics.add.collider(ghost, layer);
    ghost.originalTexture = spriteKey;
    ghost.direction = "right";
    ghost.previousDirection = "right";
    ghost.nextIntersection = null;
    ghost.enteredMaze = false;
    return ghost;
  }

  // Verifica se a posição está dentro da "casa" dos fantasmas
  isInghostHouse(x, y) {
    if (x <= 262 && x >= 208 && y <= 290 && y > 240) return true;
    else return false;
  }

  // Implementação do algoritmo A* para encontrar o caminho entre dois pontos (interseções)
  aStarAlgorithm(start, target) {
    const isInGhostHouse = this.isInghostHouse.bind(this);

    // Função auxiliar para encontrar a interseção mais próxima
    function findNearestIntersection(point, intersections) {
      let nearest = null;
      let minDist = Infinity;
      for (const intersection of intersections) {
        if (isInGhostHouse(intersection.x, intersection.y)) {
          continue;
        }
        const dist =
          Math.abs(intersection.x - point.x) +
          Math.abs(intersection.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = intersection;
        }
      }
      return nearest;
    }

    const startIntersection = findNearestIntersection.call(
      this,
      start,
      this.intersections
    );
    target = findNearestIntersection.call(this, target, this.intersections);

    if (!startIntersection || !target) {
      return [];
    }

    const openList = [];
    const closedList = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    openList.push({
      node: startIntersection,
      g: 0,
      f: heuristic(startIntersection, target),
    });
    gScore.set(JSON.stringify(startIntersection), 0);

    // Função heurística (distância Manhattan)
    function heuristic(node, target) {
      return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
    }

    // Loop principal do algoritmo A*
    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift().node;

      if (current.x === target.x && current.y === target.y) {
        // Reconstrói o caminho encontrado
        const path = [];
        let currentNode = current;
        while (cameFrom.has(JSON.stringify(currentNode))) {
          path.push(currentNode);
          currentNode = cameFrom.get(JSON.stringify(currentNode));
        }
        path.push(startIntersection);
        return path.reverse();
      }

      closedList.add(JSON.stringify(current));

      const currentIntersection = this.intersections.find(
        (i) => i.x === current.x && i.y === current.y
      );

      if (currentIntersection) {
        for (const direction of currentIntersection.openPaths) {
          const neighbor = this.getNextIntersection(
            current.x,
            current.y,
            direction
          );

          if (
            neighbor &&
            !isInGhostHouse(neighbor.x, neighbor.y) &&
            !closedList.has(JSON.stringify(neighbor))
          ) {
            const tentativeGScore = gScore.get(JSON.stringify(current)) + 1;

            if (
              !gScore.has(JSON.stringify(neighbor)) ||
              tentativeGScore < gScore.get(JSON.stringify(neighbor))
            ) {
              gScore.set(JSON.stringify(neighbor), tentativeGScore);
              const fScore = tentativeGScore + heuristic(neighbor, target);
              openList.push({ node: neighbor, g: tentativeGScore, f: fScore });
              cameFrom.set(JSON.stringify(neighbor), current);
            }
          }
        }
      }
    }

    return [];
  }

  // Retorna a próxima interseção em determinada direção a partir de um ponto atual
  getNextIntersection(currentX, currentY, previousDirection) {
    let filteredIntersections;
    const isUp = previousDirection === "up";
    const isDown = previousDirection === "down";
    const isLeft = previousDirection === "left";
    const isRight = previousDirection === "right";
    filteredIntersections = this.intersections
      .filter((intersection) => {
        return (
          (isUp && intersection.x === currentX && intersection.y < currentY) ||
          (isDown &&
            intersection.x === currentX &&
            intersection.y > currentY) ||
          (isLeft &&
            intersection.y === currentY &&
            intersection.x < currentX) ||
          (isRight && intersection.y === currentY && intersection.x > currentX)
        );
      })
      .sort((a, b) => {
        if (isUp || isDown) {
          return isUp ? b.y - a.y : a.y - b.y;
        } else {
          return isLeft ? b.x - a.x : a.x - b.x;
        }
      });
    return filteredIntersections ? filteredIntersections[0] : null;
  }

  // Popula o tabuleiro com pontos (dots) e power pills, identificando os tiles vazios
  populateBoardAndTrackEmptyTiles(layer) {
    layer.forEachTile((tile) => {
      if (!this.board[tile.y]) {
        this.board[tile.y] = [];
      }
      this.board[tile.y][tile.x] = tile.index;
      // Exclui áreas específicas para não criar pontos indesejados
      if (
        tile.y < 4 ||
        (tile.y > 11 && tile.y < 23 && tile.x > 6 && tile.x < 21) ||
        (tile.y === 17 && tile.x !== 6 && tile.x !== 21)
      )
        return;
      let rightTile = this.map.getTileAt(
        tile.x + 1,
        tile.y,
        true,
        "Tile Layer 1"
      );
      let bottomTile = this.map.getTileAt(
        tile.x,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );
      let rightBottomTile = this.map.getTileAt(
        tile.x + 1,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );
      if (
        tile.index === -1 &&
        rightTile &&
        rightTile.index === -1 &&
        bottomTile &&
        bottomTile.index === -1 &&
        rightBottomTile &&
        rightBottomTile.index === -1
      ) {
        const x = tile.x * tile.width;
        const y = tile.y * tile.height;
        this.dots.create(x + tile.width, y + tile.height, "dot");
      }
    });

    // Cria as power pills nas posições definidas
    this.powerPills.create(32, 144, "powerPill");
    this.powerPills.create(432, 144, "powerPill");
    this.powerPills.create(32, 480, "powerPill");
    this.powerPills.create(432, 480, "powerPill");
  }

  // Função chamada ao coletar um ponto (dot)
  eatDot(pacman, dot) {
    dot.disableBody(true, true);
    // Aumenta 10 pontos por dot consumido
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    // Verifica se não há mais dots ativos no grupo
    if (this.dots.countActive(true) === 0) {
      this.levelUp();
    }
  }


  // Função chamada ao coletar uma power pill, que ativa o modo "scared"
  eatPowerPill(pacman, powerPill) {
    powerPill.disableBody(true, true);
    // Aumenta 50 pontos por power pill consumida
    this.score += 50;
    this.scoreText.setText('Score: ' + this.score);
    
    this.currentMode = "scared";
    this.setGhostsToScaredMode();
    this.setModeTimer(this.scaredModeDuration);
    this.ghostSpeed = this.speed * 0.5;
    this.ghosts.forEach((ghost) => {
      ghost.hasBeenEaten = false;
    });
  }
  levelUp() {
    this.level += 1;
    this.levelText.setText('Level: ' + this.level);
  
    // Aumenta a dificuldade
    this.ghostSpeed = this.speed * 0.7 + (this.level - 1) * 10;
  
    // Remove todos os dots/pills atuais do grupo
    this.dots.clear(true, true);
    this.powerPills.clear(true, true);
  
    // Repopula o tabuleiro
    this.populateBoardAndTrackEmptyTiles(this.layer);
  
    // Reinicia os fantasmas para as posições iniciais
    this.resetGhosts();
  }
  


  // Ajusta os fantasmas para o modo "scared" (assustado), mudando seus caminhos e animação de piscar
  setGhostsToScaredMode() {
    this.ghosts.forEach((ghost) => {
      let scaredTarget = this.getScaredTarget();
      this.updateGhostPath(ghost, scaredTarget);
      if (ghost.blinkInterval) clearInterval(ghost.blinkInterval);
      const blinkTime = this.scaredModeDuration - 2000;
      ghost.blinkInterval = setTimeout(() => {
        if (ghost.hasBeenEaten) return;
        let blinkOn = true;
        ghost.blinkInterval = setInterval(() => {
          blinkOn = !blinkOn;
          ghost.setTexture(blinkOn ? "scaredGhost" : "scaredGhostWhite");
        }, 200);
      }, blinkTime);
      ghost.setTexture("scaredGhost");
    });
  }

  // Detecta interseções do labirinto onde os fantasmas podem mudar de direção
  detectIntersections() {
    const directions = [
      { x: -this.blockSize, y: 0, name: "left" },
      { x: this.blockSize, y: 0, name: "right" },
      { x: 0, y: -this.blockSize, name: "up" },
      { x: 0, y: this.blockSize, name: "down" },
    ];
    const blockSize = this.blockSize;
    for (let y = 0; y < this.map.heightInPixels; y += blockSize) {
      for (let x = 0; x < this.map.widthInPixels; x += blockSize) {
        if (x % blockSize !== 0 || y % blockSize !== 0) continue;
        if (!this.isPointClear(x, y)) continue;
        let openPaths = [];
        directions.forEach((dir) => {
          if (this.isPathOpenAroundPoint(x + dir.x, y + dir.y)) {
            openPaths.push(dir.name);
          }
        });
        // Verifica se o ponto possui mais de dois caminhos abertos (interseção real) ou é uma curva
        if (openPaths.length > 2 && y > 64 && y < 530) {
          this.intersections.push({ x: x, y: y, openPaths: openPaths });
        } else if (openPaths.length === 2 && y > 64 && y < 530) {
          const [dir1, dir2] = openPaths;
          if (
            ((dir1 === "left" || dir1 === "right") &&
              (dir2 === "up" || dir2 === "down")) ||
            ((dir1 === "up" || dir1 === "down") &&
              (dir2 === "left" || dir2 === "right"))
          ) {
            this.intersections.push({ x: x, y: y, openPaths: openPaths });
          }
        }
      }
    }
  }

  // Verifica se ao redor de um ponto há caminhos abertos (sem paredes)
  isPathOpenAroundPoint(pixelX, pixelY) {
    const corners = [
      { x: pixelX - 1, y: pixelY - 1 },
      { x: pixelX + 1, y: pixelY - 1 },
      { x: pixelX - 1, y: pixelY + 1 },
      { x: pixelX + 1, y: pixelY + 1 },
    ];
    return corners.every((corner) => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);
      if (!this.board[tileY] || this.board[tileY][tileX] !== -1) {
        return false;
      }
      return true;
    });
  }

  // Verifica se um ponto está "limpo", ou seja, se não há parede em suas proximidades
  isPointClear(x, y) {
    const corners = [
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
    return corners.every((corner) => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);
      return !this.board[tileY] || this.board[tileY][tileX] === -1;
    });
  }

  // Lida com a colisão entre o Pacman e um fantasma
// Lida com a colisão entre o Pacman e um fantasma
handlePacmanGhostCollision(pacman, ghost) {
  // Se o fantasma estiver em modo "scared" e ainda não foi comido
  if (this.currentMode === "scared" && !ghost.hasBeenEaten) {
    // Dá 200 pontos por comer um fantasma assustado
    this.score += 200;
    this.scoreText.setText('Score: ' + this.score);

    // Desativa o fantasma e o faz reaparecer depois
    ghost.setActive(false);
    ghost.setVisible(false);
    this.time.delayedCall(1000, () => {
      this.respawnGhost(ghost);
    });
  }
  else if (ghost.hasBeenEaten) {
    // Caso contrário, Pacman morre
    this.pacmanDies();
  }
}


  // Animação e lógica de morte do Pacman
  pacmanDies() {
    if (!this.isPacmanAlive) return;

    this.pacman.setVelocityY(0);
    this.pacman.setVelocityX(0);
    this.isPacmanAlive = false;
    this.pacman.anims.stop();

    this.pacman.play("pacmanDeath");
    this.time.delayedCall(2000, () => {
      this.resetAfterDeath();
    });
  }

  // Reinicia a cena após a morte do Pacman, atualizando vidas e reiniciando fantasmas
  resetAfterDeath() {
    this.lives -= 1;
    if (this.lives === 1) this.lifeCounter1.destroy();
    if (this.lives === 2) this.lifeCounter2.destroy();
    if (this.lives > 0) {
      this.pacman.setPosition(230, 432);
      this.resetGhosts();
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
      this.currentMode = "scatter";
    } else {
      // Se não houver mais vidas, encerra o jogo
      this.pacman.destroy();
      this.redGhost.destroy();
      this.pinkGhost.destroy();
      this.blueGhost.destroy();
      this.orangeGhost.destroy();
      this.physics.pause();
      this.add
        .image(
          this.cameras.main.centerX,
          this.cameras.main.centerY + 56,
          "endGameImage"
        )
        .setOrigin(0.5);
    }
    this.isPacmanAlive = true;
    this.hasRespawned = true;
  }

  // Reinicia os fantasmas para suas posições iniciais e reconfigura seus estados
  resetGhosts() {
    this.redGhost.setPosition(232, 290);
    this.pinkGhost.setPosition(220, 290);
    this.blueGhost.setPosition(255, 290);
    this.orangeGhost.setPosition(210, 290);

    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];

    this.ghosts.forEach((ghost) => {
      ghost.setTexture(ghost.originalTexture);
      ghost.hasBeenEaten = true;
      ghost.enteredMaze = false;
      clearInterval(ghost.blinkInterval);
      let target = this.getScatterTarget(ghost);
      this.updateGhostPath(ghost, target);
      ghost.direction = "left";
    });
    this.startGhostEntries();
    this.setModeTimer(this.scatterModeDuration);
    this.currentMode = "scatter";
    this.previouseMode = this.currentMode;
  }

  // Reposiciona e reativa um fantasma que foi "comido" no modo scared
  respawnGhost(ghost) {
    ghost.setPosition(232, 290);
    ghost.setActive(true);
    ghost.setVisible(true);
    ghost.setTexture(ghost.originalTexture);
    ghost.hasBeenEaten = true;
    this.enterMaze(ghost);
    let target =
      this.currentMode === "chase"
        ? this.getChaseTarget(ghost)
        : this.getScatterTarget(ghost);
    this.updateGhostPath(ghost, target);
  }

  // Método update() chamado a cada frame para atualizar o estado do jogo
  update() {
    if (!this.isPacmanAlive || this.lives === 0) return;
    this.handleDirectionInput(); // Captura as entradas de direção do usuário
    this.handlePacmanMovement(); // Atualiza o movimento do Pacman
    this.teleportPacmanAcrossWorldBounds(); // Permite que o Pacman atravesse as bordas do mundo
    // Atualiza o movimento e direção de cada fantasma que já entrou no labirinto
    if (this.pinkGhost.enteredMaze) {
      this.handleGhostDirection(this.pinkGhost);
      this.handleGhostMovement(this.pinkGhost);
    }
    if (this.orangeGhost.enteredMaze) {
      this.handleGhostDirection(this.orangeGhost);
      this.handleGhostMovement(this.orangeGhost);
    }
    if (this.blueGhost.enteredMaze) {
      this.handleGhostDirection(this.blueGhost);
      this.handleGhostMovement(this.blueGhost);
    }
    if (this.redGhost.enteredMaze) {
      this.handleGhostDirection(this.redGhost);
      this.handleGhostMovement(this.redGhost);
    }
  }

  // Captura a entrada do usuário e define a próxima direção do Pacman
  handleDirectionInput() {
    const arrowKeys = ["left", "right", "up", "down"];
    for (const key of arrowKeys) {
      if (
        (this.cursors[key].isDown && this.direction !== key) ||
        this.hasRespawned
      ) {
        if (this.hasRespawned) this.hasRespawned = !this.hasRespawned;

        this.previousDirection = this.direction;
        this.direction = key;
        // Define a próxima interseção com base na nova direção
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

  // Retorna a próxima interseção para o Pacman baseado na direção desejada
  getNextIntersectionInNextDirection(
    currentX,
    currentY,
    currentDirection,
    nextDirection
  ) {
    let filteredIntersections;
    const isUp = currentDirection === "up";
    const isDown = currentDirection === "down";
    const isLeft = currentDirection === "left";
    const isRight = currentDirection === "right";
    filteredIntersections = this.intersections
      .filter((intersection) => {
        return (
          ((isUp &&
            intersection.x === currentX &&
            intersection.y <= currentY) ||
            (isDown &&
              intersection.x === currentX &&
              intersection.y >= currentY) ||
            (isLeft &&
              intersection.y === currentY &&
              intersection.x <= currentX) ||
            (isRight &&
              intersection.y === currentY &&
              intersection.x >= currentX)) &&
          this.isIntersectionInDirection(intersection, nextDirection)
        );
      })
      .sort((a, b) => {
        if (isUp || isDown) {
          return isUp ? b.y - a.y : a.y - b.y;
        } else {
          return isLeft ? b.x - a.x : a.x - b.x;
        }
      });
    return filteredIntersections ? filteredIntersections[0] : null;
  }

  // Verifica se uma interseção possui um caminho aberto na direção desejada
  isIntersectionInDirection(intersection, direction) {
    switch (direction) {
      case "up":
        return intersection.openPaths.includes("up");
      case "down":
        return intersection.openPaths.includes("down");
      case "left":
        return intersection.openPaths.includes("left");
      case "right":
        return intersection.openPaths.includes("right");
      default:
        return false;
    }
  }

  // Atualiza o movimento do Pacman conforme a direção atual e a próxima interseção
  handlePacmanMovement() {
    let nextIntersectionx = null;
    let nextIntersectiony = null;
    if (this.nextIntersection) {
      nextIntersectionx = this.nextIntersection.x;
      nextIntersectiony = this.nextIntersection.y;
    }
    // Controla o movimento baseado na direção (left, right, up ou down)
    switch (this.direction) {
      case "left":
        this.handleMovementInDirection(
          "left",
          "right",
          this.pacman.y,
          nextIntersectiony,
          this.pacman.x,
          true,
          false,
          0,
          -this.speed,
          0,
          this.pacman.body.velocity.y
        );
        break;
      case "right":
        this.handleMovementInDirection(
          "right",
          "left",
          this.pacman.y,
          nextIntersectiony,
          this.pacman.x,
          true,
          false,
          180,
          this.speed,
          0,
          this.pacman.body.velocity.y
        );
        break;
      case "up":
        this.handleMovementInDirection(
          "up",
          "down",
          this.pacman.x,
          nextIntersectionx,
          this.pacman.y,
          false,
          true,
          -90,
          0,
          -this.speed,
          this.pacman.body.velocity.x
        );
        break;
      case "down":
        this.handleMovementInDirection(
          "down",
          "up",
          this.pacman.x,
          nextIntersectionx,
          this.pacman.y,
          false,
          true,
          90,
          0,
          this.speed,
          this.pacman.body.velocity.x
        );
        break;
    }
  }

  // Lida com o movimento do Pacman em uma direção específica, ajustando posição e velocidade
  handleMovementInDirection(
    currentDirection,
    oppositeDirection,
    pacmanPosition,
    intersectionPosition,
    movingCoordinate,
    flipX,
    flipY,
    angle,
    velocityX,
    velocityY,
    currentVelocity
  ) {
    let perpendicularDirection =
      currentDirection === "left" || currentDirection === "right"
        ? ["up", "down"]
        : ["left", "right"];
    let condition = false;
    if (this.nextIntersection)
      condition =
        (this.previousDirection == perpendicularDirection[0] &&
          pacmanPosition <= intersectionPosition) ||
        (this.previousDirection == perpendicularDirection[1] &&
          pacmanPosition >= intersectionPosition) ||
        this.previousDirection === oppositeDirection;
    if (condition) {
      let newPosition = intersectionPosition;
      if (
        this.previousDirection != oppositeDirection &&
        newPosition !== pacmanPosition
      ) {
        if (currentDirection === "left" || currentDirection === "right")
          this.pacman.body.reset(movingCoordinate, newPosition);
        else this.pacman.body.reset(newPosition, movingCoordinate);
      }
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    } else if (currentVelocity === 0) {
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    }
  }

  // Ajusta a posição do Pacman para que ele se alinhe corretamente com os tiles
  adjustPacmanPosition(velocityX, velocityY) {
    if (this.pacman.x % this.blockSize !== 0 && velocityY > 0) {
      let nearestMultiple =
        Math.round(this.pacman.x / this.blockSize) * this.blockSize;
      this.pacman.body.reset(nearestMultiple, this.pacman.y);
    }
    if (this.pacman.y % this.blockSize !== 0 && velocityX > 0) {
      let nearestMultiple =
        Math.round(this.pacman.y / this.blockSize) * this.blockSize;
      this.pacman.body.reset(this.pacman.x, nearestMultiple);
    }
  }

  // Muda a direção do Pacman alterando seus atributos visuais e velocidade
  changeDirection(flipX, flipY, angle, velocityX, velocityY) {
    this.pacman.setFlipX(flipX);
    this.pacman.setFlipY(flipY);
    this.pacman.setAngle(angle);
    this.pacman.setVelocityY(velocityY);
    this.pacman.setVelocityX(velocityX);
  }

  // Permite que o Pacman atravesse as bordas do mundo, reaparecendo no lado oposto
  teleportPacmanAcrossWorldBounds() {
    const worldBounds = this.physics.world.bounds;
    if (this.pacman.x <= worldBounds.x) {
      this.pacman.body.reset(worldBounds.right - this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(
        this.pacman.x,
        this.pacman.y,
        "left",
        this.direction
      );
      this.pacman.setVelocityX(-1 * this.speed);
    }
    if (this.pacman.x >= worldBounds.right) {
      this.pacman.body.reset(worldBounds.x + this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(
        this.pacman.x,
        this.pacman.y,
        "right",
        this.direction
      );
      this.pacman.setVelocityX(this.speed);
    }
  }

//Codigo antigo da ia dos fantasmas, depois pegar e testar qual a mais inteligente

  handleGhostDirection(ghost) {
    if (this.isInghostHouse(ghost.x, ghost.y)) {
      this.changeGhostDirection(ghost, 0, -this.ghostSpeed);
      if (ghost.direction === "down") ghost.direction = "up";
    }

    const isMoving = ghost.body.velocity.x !== 0 || ghost.body.velocity.y !== 0;
    if (!isMoving) {
      ghost.stuckTimer = (ghost.stuckTimer || 0) + 1;
      if (ghost.stuckTimer > 30) {
        ghost.stuckTimer = 0;
        let newTarget =
          this.currentMode === "scared"
            ? this.getScaredTarget()
            : this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, newTarget);
      }
    } else ghost.stuckTimer = 0;

    if (ghost.body.velocity.x == 0 && ghost.body.velocity.y == 0) {
      this.adjustGhostPosition(ghost);
    }

    // Verifica se o fantasma chegou na interseção e deve mudar de direção
    let isAtIntersection = this.isGhostAtIntersection(
      ghost.nextIntersection,
      ghost.x,
      ghost.y,
      ghost.direction
    );

    if (isAtIntersection) {
      // Impede que o fantasma fique parado no alvo de dispersão, dependendo do modo
      if (
        this.PINKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.PINKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "pinkGhost"
      )
        return;
      if (
        this.BLINKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.BLINKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "redGhost"
      )
        return;
      if (
        this.INKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.INKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "blueGhost"
      )
        return;
      if (
        this.CLYDE_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.CLYDE_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "orangeGhost"
      )
        return;

      // Se estiver em modo "chase", recalcula o caminho com o alvo atualizado
      if (this.currentMode === "chase") {
        let chaseTarget = this.getChaseTarget(ghost);
        this.updateGhostPath(ghost, chaseTarget);
      }

      if (ghost.path.length > 0) {
        ghost.nextIntersection = ghost.path.shift();
      }
      if (ghost.path.length == 0 && this.currentMode === "scared") {
        let scaredTarget = this.getScaredTarget();
        this.updateGhostPath(ghost, scaredTarget);
      }

      // Define a nova direção com base na próxima interseção
      let newDirection = this.getGhostNextDirection(
        ghost,
        ghost.nextIntersection
      );
      ghost.previousDirection = ghost.direction;
      ghost.direction = newDirection;
    }
  }








  

  // Ajusta a posição do fantasma para que ele se alinhe com o grid
  adjustGhostPosition(ghost) {
    if (ghost.x % this.blockSize !== 0) {
      let nearestMultiple =
        Math.round(ghost.x / this.blockSize) * this.blockSize;
      ghost.body.reset(nearestMultiple, ghost.y);
    }
    if (ghost.y % this.blockSize !== 0) {
      let nearestMultiple =
        Math.round(ghost.y / this.blockSize) * this.blockSize;
      ghost.body.reset(ghost.x, nearestMultiple);
    }
  }

  // Verifica se o fantasma chegou na interseção desejada
  isGhostAtIntersection(intersection, currentX, currentY, direction) {
    const isUp = direction === "up";
    const isDown = direction === "down";
    const isLeft = direction === "left";
    const isRight = direction === "right";

    let condition =
      (isUp && intersection.x === currentX && intersection.y >= currentY) ||
      (isDown && intersection.x === currentX && intersection.y <= currentY) ||
      (isLeft && intersection.y === currentY && intersection.x >= currentX) ||
      (isRight && intersection.y === currentY && intersection.x <= currentX);
    return condition;
  }

  // Determina a próxima direção do fantasma com base na interseção e sua posição
  getGhostNextDirection(ghost, intersection) {
    if (
      Math.abs(intersection.x - ghost.x) < this.blockSize &&
      ghost.y <= intersection.y
    )
      return "down";
    if (
      Math.abs(intersection.x - ghost.x) < this.blockSize &&
      ghost.y >= intersection.y
    )
      return "up";
    if (
      Math.abs(intersection.y - ghost.y) < this.blockSize &&
      ghost.x <= intersection.x
    )
      return "right";
    if (
      Math.abs(intersection.y - ghost.y) < this.blockSize &&
      ghost.x >= intersection.x
    )
      return "left";
    return "up";
  }

  // Atualiza o movimento do fantasma de acordo com sua direção e próximo ponto de interseção
  handleGhostMovement(ghost) {
    let nextIntersectionx = null;
    let nextIntersectiony = null;
    if (ghost.nextIntersection) {
      nextIntersectionx = ghost.nextIntersection.x;
      nextIntersectiony = ghost.nextIntersection.y;
    }
    // Controla o movimento baseado na direção do fantasma
    switch (ghost.direction) {
      case "left":
        this.handleGhostMovementInDirection(
          ghost,
          "left",
          "right",
          ghost.y,
          nextIntersectiony,
          ghost.x,
          -this.ghostSpeed,
          0,
          ghost.body.velocity.y
        );
        break;
      case "right":
        this.handleGhostMovementInDirection(
          ghost,
          "right",
          "left",
          ghost.y,
          nextIntersectiony,
          ghost.x,
          this.ghostSpeed,
          0,
          ghost.body.velocity.y
        );
        break;
      case "up":
        this.handleGhostMovementInDirection(
          ghost,
          "up",
          "down",
          ghost.x,
          nextIntersectionx,
          ghost.y,
          0,
          -this.ghostSpeed,
          ghost.body.velocity.x
        );
        break;
      case "down":
        this.handleGhostMovementInDirection(
          ghost,
          "down",
          "up",
          ghost.x,
          nextIntersectionx,
          ghost.y,
          0,
          this.ghostSpeed,
          ghost.body.velocity.x
        );
        break;
    }
  }

  // Lida com o movimento do fantasma em uma direção específica, similar ao movimento do Pacman
  handleGhostMovementInDirection(
    ghost,
    currentDirection,
    oppositeDirection,
    ghostPosition,
    intersectionPosition,
    movingCoordinate,
    velocityX,
    velocityY,
    currentVelocity
  ) {
    let perpendicularDirection =
      currentDirection === "left" || currentDirection === "right"
        ? ["up", "down"]
        : ["left", "right"];
    let condition = false;
    if (ghost.nextIntersection)
      condition =
        (ghost.previousDirection == perpendicularDirection[0] &&
          ghostPosition <= intersectionPosition) ||
        (ghost.previousDirection == perpendicularDirection[1] &&
          ghostPosition >= intersectionPosition) ||
        ghost.previousDirection === oppositeDirection;
    if (condition) {
      let newPosition = intersectionPosition;
      if (
        ghost.previousDirection != oppositeDirection &&
        newPosition !== ghostPosition
      ) {
        if (currentDirection === "left" || currentDirection === "right")
          ghost.body.reset(movingCoordinate, newPosition);
        else ghost.body.reset(newPosition, movingCoordinate);
      }
      this.changeGhostDirection(ghost, velocityX, velocityY);
    } else if (currentVelocity === 0) {
      this.changeGhostDirection(ghost, velocityX, velocityY);
    }
  }

  // Muda a direção do fantasma, atualizando sua velocidade
  changeGhostDirection(ghost, velocityX, velocityY) {
    ghost.setVelocityY(velocityY);
    ghost.setVelocityX(velocityX);
  }

  // Funções auxiliares para obter direções opostas e perpendiculares (não utilizadas em todas as partes)
  getOppositeDirection(direction) {
    switch (direction) {
      case "up":
        return "down";
      case "down":
        return "up";
      case "left":
        return "right";
      case "right":
        return "left";
      default:
        return "";
    }
  }
  getPerpendicularDirection(direction) {
    switch (direction) {
      case "up":
        return "right";
      case "down":
        return "left";
      case "left":
        return "up";
      case "right":
        return "down";
      default:
        return "";
    }
  }
  isMovingInxDirection(direction) {
    let result = direction === "left" || direction === "right" ? true : false;
    return result;
  }
}

// Configuração do jogo com tamanho, física e cena definida
const config = {
  type: Phaser.AUTO,
  width: 464,
  height: 560,
  parent: "container",
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: Pacman,
};
// Inicializa o jogo com as configurações definidas
const game = new Phaser.Game(config);
