// Função para inicializar um fantasma
export function initializeGhost(x, y, spriteKey, layer, scene) {
    const ghost = scene.physics.add.sprite(x, y, spriteKey);
    scene.physics.add.collider(ghost, layer);
    ghost.originalTexture = spriteKey;
    ghost.direction = "right";
    ghost.previousDirection = "right";
    ghost.nextIntersection = null;
    ghost.enteredMaze = false;
    return ghost;
  }
  
  // Lida com a mudança de direção do fantasma
  export function handleGhostDirection(ghost, scene) {
    // Se o fantasma estiver na "casa", força uma direção para fora
    if (scene.isInghostHouse(ghost.x, ghost.y)) {
      changeGhostDirection(ghost, 0, -scene.ghostSpeed);
      if (ghost.direction === "down") ghost.direction = "up";
    }
  
    // Se o fantasma não estiver se movendo, incrementa um contador e reajusta seu caminho se necessário
    const isMoving = ghost.body.velocity.x !== 0 || ghost.body.velocity.y !== 0;
    if (!isMoving) {
      ghost.stuckTimer = (ghost.stuckTimer || 0) + 1;
      if (ghost.stuckTimer > 30) {
        ghost.stuckTimer = 0;
        let newTarget = scene.currentMode === "scared"
          ? scene.getScaredTarget(ghost)
          : scene.currentMode === "chase"
          ? scene.getChaseTarget(ghost)
          : scene.getScatterTarget(ghost);
        // Atualiza o caminho do fantasma com o novo alvo
        scene.updateGhostPath(ghost, newTarget);
      }
    } else {
      ghost.stuckTimer = 0;
    }
  
    // Se o fantasma estiver parado, ajusta sua posição para alinhar ao grid
    if (ghost.body.velocity.x === 0 && ghost.body.velocity.y === 0) {
      adjustGhostPosition(ghost, scene);
    }
  
    // Verifica se o fantasma chegou à interseção e precisa mudar de direção
    let isAtIntersection = scene.isGhostAtIntersection(ghost.nextIntersection, ghost.x, ghost.y, ghost.direction);
    if (isAtIntersection) {
      // Se houver um caminho pré-calculado, atualiza a próxima interseção
      if (ghost.path && ghost.path.length > 0) {
        ghost.nextIntersection = ghost.path.shift();
      }
      // Determina a nova direção baseada na próxima interseção
      let newDirection = scene.getGhostNextDirection(ghost, ghost.nextIntersection);
      ghost.previousDirection = ghost.direction;
      ghost.direction = newDirection;
    }
  }
  
  // Atualiza o movimento do fantasma de acordo com sua direção atual
  export function handleGhostMovement(ghost, scene) {
    let nextIntersectionx = ghost.nextIntersection ? ghost.nextIntersection.x : null;
    let nextIntersectiony = ghost.nextIntersection ? ghost.nextIntersection.y : null;
    switch (ghost.direction) {
      case "left":
        handleGhostMovementInDirection(ghost, "left", "right", ghost.y, nextIntersectiony, ghost.x, -scene.ghostSpeed, 0, ghost.body.velocity.y);
        break;
      case "right":
        handleGhostMovementInDirection(ghost, "right", "left", ghost.y, nextIntersectiony, ghost.x, scene.ghostSpeed, 0, ghost.body.velocity.y);
        break;
      case "up":
        handleGhostMovementInDirection(ghost, "up", "down", ghost.x, nextIntersectionx, ghost.y, 0, -scene.ghostSpeed, ghost.body.velocity.x);
        break;
      case "down":
        handleGhostMovementInDirection(ghost, "down", "up", ghost.x, nextIntersectionx, ghost.y, 0, scene.ghostSpeed, ghost.body.velocity.x);
        break;
    }
  }
  
  // Função auxiliar que gerencia o movimento do fantasma em uma direção específica
  function handleGhostMovementInDirection(ghost, currentDirection, oppositeDirection, ghostPosition, intersectionPosition, movingCoordinate, velocityX, velocityY, currentVelocity) {
    const perpendicularDirection = (currentDirection === "left" || currentDirection === "right")
      ? ["up", "down"]
      : ["left", "right"];
    let condition = false;
    if (ghost.nextIntersection) {
      condition =
        (ghost.previousDirection === perpendicularDirection[0] && ghostPosition <= intersectionPosition) ||
        (ghost.previousDirection === perpendicularDirection[1] && ghostPosition >= intersectionPosition) ||
        ghost.previousDirection === oppositeDirection;
    }
    if (condition) {
      let newPosition = intersectionPosition;
      if (ghost.previousDirection !== oppositeDirection && newPosition !== ghostPosition) {
        if (currentDirection === "left" || currentDirection === "right") {
          ghost.body.reset(movingCoordinate, newPosition);
        } else {
          ghost.body.reset(newPosition, movingCoordinate);
        }
      }
      changeGhostDirection(ghost, velocityX, velocityY);
    } else if (currentVelocity === 0) {
      changeGhostDirection(ghost, velocityX, velocityY);
    }
  }
  
  // Altera a velocidade do fantasma conforme a direção desejada
  function changeGhostDirection(ghost, velocityX, velocityY) {
    ghost.setVelocityX(velocityX);
    ghost.setVelocityY(velocityY);
  }
  
  // Ajusta a posição do fantasma para que ele se alinhe ao grid
  function adjustGhostPosition(ghost, scene) {
    if (ghost.x % scene.blockSize !== 0) {
      const nearestMultiple = Math.round(ghost.x / scene.blockSize) * scene.blockSize;
      ghost.body.reset(nearestMultiple, ghost.y);
    }
    if (ghost.y % scene.blockSize !== 0) {
      const nearestMultiple = Math.round(ghost.y / scene.blockSize) * scene.blockSize;
      ghost.body.reset(ghost.x, nearestMultiple);
    }
  }
  