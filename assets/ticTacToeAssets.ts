import * as THREE from "three";

/**
 * Default dimensions for the 3x3 Tic-Tac-Toe board.
 * Each cell is 1.0 x 1.0 units, total board is 3.0 x 3.0 units.
 */
export const CELL_SIZE = 1.0;
export const BOARD_SIZE = 3.0;

/**
 * Creates a flat 3x3 Tic-Tac-Toe board mesh/group, centered at its own local origin.
 * Includes grid lines, subtle base plane, and raycastable cell target regions.
 * Zero game logic.
 *
 * @returns {THREE.Object3D} Fresh board Object3D centered at (0, 0, 0)
 */
export function createBoard(): THREE.Object3D {
  const board = new THREE.Group();
  board.name = "TicTacToeBoard";

  // Grid lines: 2 horizontal and 2 vertical lines
  // Spanning from -1.5 to +1.5, separating cells at -0.5 and +0.5
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x333333,
    roughness: 0.4,
    metalness: 0.2,
  });

  const lineThickness = 0.04;
  const lineLength = BOARD_SIZE;

  // 2 Vertical grid lines (along Y, positioned at X = -0.5 and X = +0.5)
  const vLineGeometry = new THREE.BoxGeometry(lineThickness, lineLength, lineThickness);
  const vLine1 = new THREE.Mesh(vLineGeometry, lineMaterial);
  vLine1.position.set(-CELL_SIZE * 0.5, 0, 0);
  board.add(vLine1);

  const vLine2 = new THREE.Mesh(vLineGeometry, lineMaterial);
  vLine2.position.set(CELL_SIZE * 0.5, 0, 0);
  board.add(vLine2);

  // 2 Horizontal grid lines (along X, positioned at Y = -0.5 and Y = +0.5)
  const hLineGeometry = new THREE.BoxGeometry(lineLength, lineThickness, lineThickness);
  const hLine1 = new THREE.Mesh(hLineGeometry, lineMaterial);
  hLine1.position.set(0, CELL_SIZE * 0.5, 0);
  board.add(hLine1);

  const hLine2 = new THREE.Mesh(hLineGeometry, lineMaterial);
  hLine2.position.set(0, -CELL_SIZE * 0.5, 0);
  board.add(hLine2);

  // Subtle background backing plate so it's a cohesive 3D board
  const backPlateGeometry = new THREE.BoxGeometry(BOARD_SIZE, BOARD_SIZE, 0.02);
  const backPlateMaterial = new THREE.MeshStandardMaterial({
    color: 0x11131a,
    emissive: 0x050608,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const backPlate = new THREE.Mesh(backPlateGeometry, backPlateMaterial);
  backPlate.position.set(0, 0, -0.015);
  board.add(backPlate);

  // 9 Cell raycast targets for tap/click detection in Issue 2
  for (let i = 0; i < 9; i++) {
    const cellPos = getCellPosition(i);
    const cellGeom = new THREE.PlaneGeometry(CELL_SIZE - 0.05, CELL_SIZE - 0.05);
    const cellMat = new THREE.MeshBasicMaterial({
      visible: false, // Invisible target for raycasting
    });
    const cellMesh = new THREE.Mesh(cellGeom, cellMat);
    cellMesh.name = `cell_${i}`;
    cellMesh.userData = { cellIndex: i };
    cellMesh.position.set(cellPos.x, cellPos.y, 0.001);
    board.add(cellMesh);
  }

  return board;
}

/**
 * Creates a fresh, independent 3D X piece mesh.
 * Visually distinct from O at a glance (vibrant cyan/electric blue).
 *
 * @returns {THREE.Object3D} Fresh X piece Object3D
 */
export function createXPiece(): THREE.Object3D {
  const xGroup = new THREE.Group();
  xGroup.name = "XPiece";

  const armLength = 0.65;
  const armThickness = 0.1;
  const armDepth = 0.08;

  const xMaterial = new THREE.MeshStandardMaterial({
    color: 0x00d2ff,
    emissive: 0x003d4d,
    roughness: 0.25,
    metalness: 0.3,
  });

  const barGeometry = new THREE.BoxGeometry(armThickness, armLength, armDepth);

  // Diagonal bar 1 (+45 degrees)
  const bar1 = new THREE.Mesh(barGeometry, xMaterial);
  bar1.rotation.z = Math.PI / 4;
  xGroup.add(bar1);

  // Diagonal bar 2 (-45 degrees)
  const bar2 = new THREE.Mesh(barGeometry, xMaterial);
  bar2.rotation.z = -Math.PI / 4;
  xGroup.add(bar2);

  return xGroup;
}

/**
 * Creates a fresh, independent 3D O piece mesh.
 * Visually distinct from X at a glance (vibrant hot coral/magenta-red).
 *
 * @returns {THREE.Object3D} Fresh O piece Object3D
 */
export function createOPiece(): THREE.Object3D {
  const oGroup = new THREE.Group();
  oGroup.name = "OPiece";

  const radius = 0.26;
  const tube = 0.055;

  const oMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3d57,
    emissive: 0x4d000f,
    roughness: 0.25,
    metalness: 0.3,
  });

  const torusGeometry = new THREE.TorusGeometry(radius, tube, 20, 36);
  const oMesh = new THREE.Mesh(torusGeometry, oMaterial);
  oGroup.add(oMesh);

  return oGroup;
}

/**
 * Calculates the position for a given cellIndex (0 to 8).
 * Layout:
 *   0 | 1 | 2
 *   ---------
 *   3 | 4 | 5
 *   ---------
 *   6 | 7 | 8
 *
 * If `board` is provided, returns the WORLD position given the board's placed transform.
 * If `board` is omitted, returns the LOCAL position relative to the board's origin.
 *
 * @param {number} cellIndex Index of the cell (0 to 8)
 * @param {THREE.Object3D} [board] Optional board object to compute world transform
 * @returns {THREE.Vector3} Position vector
 */
export function getCellPosition(cellIndex: number, board?: THREE.Object3D): THREE.Vector3 {
  const clampedIndex = Math.max(0, Math.min(8, Math.floor(cellIndex)));
  const col = clampedIndex % 3; // 0: left, 1: center, 2: right
  const row = Math.floor(clampedIndex / 3); // 0: top, 1: middle, 2: bottom

  const x = (col - 1) * CELL_SIZE;
  const y = (1 - row) * CELL_SIZE;
  const z = 0.04; // Slight elevation so pieces rest cleanly on the board surface

  const pos = new THREE.Vector3(x, y, z);

  if (board) {
    board.updateMatrixWorld(true);
    pos.applyMatrix4(board.matrixWorld);
  }

  return pos;
}

/**
 * Returns the world position of a cell given the board's placed transform.
 * Critical export for Issue 2 raycasting and piece placement.
 *
 * @param {number} cellIndex Index of the cell (0 to 8)
 * @param {THREE.Object3D} board The board instance
 * @returns {THREE.Vector3} World position vector
 */
export function getCellWorldPosition(cellIndex: number, board: THREE.Object3D): THREE.Vector3 {
  return getCellPosition(cellIndex, board);
}
