// Build default tile rows for a board, skipping positions that already exist in existingTiles
export function buildMissingTiles(board, existingTiles) {
  const boardName = board.charAt(0).toUpperCase() + board.slice(1)
  const newTiles = []

  for (let ring = 1; ring <= 5; ring++) {
    for (let path = 0; path < 3; path++) {
      const exists = existingTiles.find(t =>
        t.board === board && t.ring === ring && t.path === path && !t.is_center
      )
      if (!exists) {
        newTiles.push({
          board,
          ring,
          path,
          title: `${boardName} R${ring}P${path + 1}`,
          description: '',
          points: board === 'easy' ? 10 : board === 'medium' ? 25 : 50,
          is_center: false
        })
      }
    }
  }

  const centerExists = existingTiles.find(t => t.board === board && t.is_center)
  if (!centerExists) {
    newTiles.push({
      board,
      ring: 1,
      path: 0,
      title: `${boardName} Center`,
      description: 'Complete all tiles to unlock this!',
      points: board === 'easy' ? 100 : board === 'medium' ? 200 : 500,
      is_center: true
    })
  }

  return newTiles
}
