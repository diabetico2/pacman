/**
 * Implementação do algoritmo A* para encontrar o caminho entre dois pontos (interseções).
 * 
 * @param {Object} start - Ponto inicial, com propriedades { x, y }.
 * @param {Object} target - Ponto de destino, com propriedades { x, y }.
 * @param {Array} intersections - Lista de interseções disponíveis no labirinto.
 * @param {Function} isInGhostHouse - Função que recebe (x, y) e retorna true se o ponto estiver na "casa" dos fantasmas.
 * @param {Function} getNextIntersection - Função para obter a próxima interseção a partir de um ponto e uma direção.
 * @returns {Array} - O caminho encontrado como um array de pontos, ou [] se nenhum caminho for encontrado.
 */
export function aStarAlgorithm(start, target, intersections, isInGhostHouse, getNextIntersection) {
    // Função auxiliar para encontrar a interseção mais próxima a um ponto, ignorando aquelas na ghost house
    function findNearestIntersection(point, intersections) {
      let nearest = null;
      let minDist = Infinity;
      for (const intersection of intersections) {
        if (isInGhostHouse(intersection.x, intersection.y)) {
          continue;
        }
        const dist = Math.abs(intersection.x - point.x) + Math.abs(intersection.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = intersection;
        }
      }
      return nearest;
    }
  
    const startIntersection = findNearestIntersection(start, intersections);
    const targetIntersection = findNearestIntersection(target, intersections);
  
    if (!startIntersection || !targetIntersection) {
      return [];
    }
  
    const openList = [];
    const closedList = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
  
    // Função heurística: distância Manhattan
    function heuristic(node, target) {
      return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
    }
  
    openList.push({
      node: startIntersection,
      g: 0,
      f: heuristic(startIntersection, targetIntersection)
    });
    gScore.set(JSON.stringify(startIntersection), 0);
  
    // Loop principal do algoritmo A*
    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const currentObj = openList.shift();
      const current = currentObj.node;
  
      if (current.x === targetIntersection.x && current.y === targetIntersection.y) {
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
  
      // Percorre os caminhos abertos da interseção atual
      if (current.openPaths && current.openPaths.length > 0) {
        for (const direction of current.openPaths) {
          const neighbor = getNextIntersection(current.x, current.y, direction, intersections);
          if (
            neighbor &&
            !isInGhostHouse(neighbor.x, neighbor.y) &&
            !closedList.has(JSON.stringify(neighbor))
          ) {
            const tentativeG = gScore.get(JSON.stringify(current)) + 1;
            if (!gScore.has(JSON.stringify(neighbor)) || tentativeG < gScore.get(JSON.stringify(neighbor))) {
              gScore.set(JSON.stringify(neighbor), tentativeG);
              const fScore = tentativeG + heuristic(neighbor, targetIntersection);
              openList.push({ node: neighbor, g: tentativeG, f: fScore });
              cameFrom.set(JSON.stringify(neighbor), current);
            }
          }
        }
      }
    }
  
    return [];
  }
  
  /**
   * Retorna a próxima interseção a partir de um ponto dado uma direção.
   * 
   * @param {number} currentX - Coordenada X do ponto atual.
   * @param {number} currentY - Coordenada Y do ponto atual.
   * @param {string} direction - Direção desejada ("up", "down", "left" ou "right").
   * @param {Array} intersections - Lista de interseções disponíveis.
   * @returns {Object|null} - A interseção encontrada ou null se não houver nenhuma.
   */
  export function getNextIntersection(currentX, currentY, direction, intersections) {
    const isUp = direction === "up";
    const isDown = direction === "down";
    const isLeft = direction === "left";
    const isRight = direction === "right";
  
    // Filtra as interseções que estão na direção desejada a partir do ponto atual
    const filtered = intersections.filter(intersection => {
      if (isUp) return intersection.x === currentX && intersection.y < currentY;
      if (isDown) return intersection.x === currentX && intersection.y > currentY;
      if (isLeft) return intersection.y === currentY && intersection.x < currentX;
      if (isRight) return intersection.y === currentY && intersection.x > currentX;
    });
  
    // Ordena conforme a direção para obter a mais próxima
    filtered.sort((a, b) => {
      if (isUp || isDown) {
        return isUp ? b.y - a.y : a.y - b.y;
      } else {
        return isLeft ? b.x - a.x : a.x - b.x;
      }
    });
  
    return filtered.length > 0 ? filtered[0] : null;
  }
  