// glytchlingGenerator.js

export const WIDTH = 12;
export const HEIGHT = 12;

export const DOME_HEIGHT = 5;
const CORE_HEIGHT = 5;
const GAP_HEIGHT = 1;
const PART_NAMES = ['dome', 'core', 'node', 'bits', 'digits', 'treads'];

// The generator is deterministic: the same input seed and toggle state will always
// build the same Glytchling. That lets us reuse seeds across sessions and other apps.
function rng(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function random(seed, offset) {
  return rng(seed + offset);
}

function emptyGrid() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
}

function createPartMasks() {
  return Object.fromEntries(PART_NAMES.map((name) => [name, emptyGrid()]));
}

// Build one side of a larger section such as the dome or core. The caller decides
// how likely each row is to fill, then we mirror or independently generate the
// opposite side later depending on the current symmetry settings.
function buildSectionHalf(seed, rowCount, offset, getFillChance) {
  const rows = [];
  let filledCells = 0;

  for (let y = 0; y < rowCount; y++) {
    const half = [];

    for (let x = 0; x < WIDTH / 2; x++) {
      const filled = random(seed, offset + y * 10 + x) < getFillChance(y, x) ? 1 : 0;
      half.push(filled);
      filledCells += filled;
    }

    rows.push(half);
  }

  return { rows, filledCells };
}

// Apply two half-rows back onto the full Glytchling grid and the matching part mask.
function applySectionRows(grid, partMask, startY, leftRows, rightRows) {
  for (let y = 0; y < leftRows.length; y++) {
    const row = [...leftRows[y], ...rightRows[y]];

    for (let x = 0; x < row.length; x++) {
      setPixel(grid, partMask, x, startY + y, row[x]);
    }
  }
}

// All drawing helpers route through setPixel so the main grid and the per-part
// mask stay in sync. The masks power the sidebar previews and highlight behavior.
function setPixel(grid, mask, x, y, value = 1) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;

  grid[y][x] = value;

  if (mask) {
    mask[y][x] = value;
  }
}

function drawCells(grid, mask, cells) {
  for (const [x, y] of cells) {
    setPixel(grid, mask, x, y, 1);
  }
}

// Deduplicate procedurally generated cells so overlapping generation passes do not
// accidentally inflate density counts or draw the same pixel multiple times.
function uniqueCells(cells) {
  return [...new Map(cells.map(([x, y]) => [`${x},${y}`, [x, y]])).values()];
}

// Convert raw fill density into the more flavorful terms used in the UI.
function classifySize(count, total) {
  if (count <= 0) return 'none';

  const fillRatio = count / total;

  if (fillRatio <= 0.25) return 'slight';
  if (fillRatio <= 0.62) return 'balanced';
  return 'full';
}

function oppositeX(x) {
  return WIDTH - 1 - x;
}

// Dome generation uses a fuller upper silhouette than the core and always applies
// the "eye" landmarks so the face stays readable, even when the rest of the dome
// becomes asymmetrical or partially disabled.
function generateDome(grid, partMask, seed, symmetric = true, flipped = false) {
  const fillChanceForRow = (y) =>
    y === 0 ? 0.4 : y === 1 ? 0.5 : y === 2 ? 0.6 : y === 3 ? 0.7 : 0.5;
  const leftHalf = buildSectionHalf(seed, DOME_HEIGHT, 0, fillChanceForRow);
  // For symmetric domes, the right side is built by reversing the left half-row.
  const generatedRightHalf = symmetric
    ? {
        rows: leftHalf.rows.map((row) => row.slice().reverse()),
        filledCells: leftHalf.filledCells,
      }
    : buildSectionHalf(seed, DOME_HEIGHT, 100, fillChanceForRow);
  const rightHalf = flipped && !symmetric
    ? {
        rows: leftHalf.rows.map((row) => row.slice().reverse()),
        filledCells: leftHalf.filledCells,
      }
    : generatedRightHalf;
  const finalLeftHalf = flipped && !symmetric
    ? {
        rows: generatedRightHalf.rows.map((row) => row.slice().reverse()),
        filledCells: generatedRightHalf.filledCells,
      }
    : leftHalf;

  applySectionRows(grid, partMask, 0, finalLeftHalf.rows, rightHalf.rows);

  // eyes
  setPixel(grid, partMask, 3, 2, 1);
  setPixel(grid, partMask, 8, 2, 1);

  // clear eye holes around
  setPixel(grid, partMask, 4, 2, 0);
  setPixel(grid, partMask, 7, 2, 0);

  const filledCells = finalLeftHalf.filledCells + rightHalf.filledCells;

  if (filledCells < 24) return 'small';
  if (filledCells < 38) return 'balanced';
  return 'full';
}

// The core is built with a denser middle band so most Glytchlings feel weighted
// toward the center instead of reading like a tall rectangle.
function generateCore(grid, partMask, seed, symmetric = true, flipped = false) {
  const startY = DOME_HEIGHT + GAP_HEIGHT;
  const fillChanceForRow = (y) =>
    y === 0 ? 0.6 : y === 1 ? 0.7 : y === 2 ? 0.7 : y === 3 ? 0.6 : 0.5;
  const leftHalf = buildSectionHalf(seed, CORE_HEIGHT, 200, fillChanceForRow);
  // Core symmetry uses the same reversed-half approach as the dome so the center
  // stays mirrored unless the current settings explicitly allow asymmetry.
  const generatedRightHalf = symmetric
    ? {
        rows: leftHalf.rows.map((row) => row.slice().reverse()),
        filledCells: leftHalf.filledCells,
      }
    : buildSectionHalf(seed, CORE_HEIGHT, 300, fillChanceForRow);
  const rightHalf = flipped && !symmetric
    ? {
        rows: leftHalf.rows.map((row) => row.slice().reverse()),
        filledCells: leftHalf.filledCells,
      }
    : generatedRightHalf;
  const finalLeftHalf = flipped && !symmetric
    ? {
        rows: generatedRightHalf.rows.map((row) => row.slice().reverse()),
        filledCells: generatedRightHalf.filledCells,
      }
    : leftHalf;

  applySectionRows(grid, partMask, startY, finalLeftHalf.rows, rightHalf.rows);

  const filledCells = finalLeftHalf.filledCells + rightHalf.filledCells;

  if (filledCells < 28) return 'narrow';
  if (filledCells < 42) return 'balanced';
  return 'dense';
}

// Nodes and bits both generate inside small constrained zones near the top of
// the Glytchling. That keeps them surprising without letting them sprawl too far.
function generateNodeCells(seed, baseX, offset) {
  const cells = [];
  const density = random(seed, 400 + offset) * 0.78;

  for (let localY = 0; localY < 3; localY++) {
    for (let localX = 0; localX < 3; localX++) {
      let fillChance = density;

      if (localX === 2) fillChance += 0.08;
      if (localX === 1) fillChance += 0.03;
      if (localY === 0) fillChance += 0.04;
      if (localY === 2) fillChance -= 0.08;
      if (localX === 0 && localY === 2) fillChance -= 0.14;

      if (random(seed, 410 + offset + localY * 10 + localX) < fillChance) {
        cells.push([baseX + localX, localY]);
      }
    }
  }

  const uniqueNodeCells = uniqueCells(cells);
  const fullBlock =
    uniqueNodeCells.length >= 8 &&
    [0, 1, 2].every((localY) =>
      [0, 1, 2].every((localX) =>
        uniqueNodeCells.some(([x, y]) => x === baseX + localX && y === localY),
      ),
    );

  if (fullBlock) {
    return uniqueNodeCells.filter(
      ([x, y]) => !(x === baseX + 1 && y === 1),
    );
  }

  return uniqueNodeCells;
}

// When symmetry is off, "flip" swaps the left/right results without changing the
// seed so the user can move asymmetry to the opposite side on demand.
function addNode(grid, partMask, seed, symmetric = true, flipped = false) {
  const leftBaseX = 3;
  const rightBaseX = 6;
  const possibleCells = 9;
  const leftCells = generateNodeCells(seed, leftBaseX, 0);
  // Small attachment parts mirror by mapping each generated left-side cell across
  // the centerline, rather than rebuilding the whole section row-by-row.
  const generatedRightCells = symmetric
    ? leftCells.map(([x, y]) => [oppositeX(x), y])
    : generateNodeCells(seed, rightBaseX, 100);
  const rightCells = flipped && !symmetric
    ? leftCells.map(([x, y]) => [oppositeX(x), y])
    : generatedRightCells;
  const finalLeftCells = flipped && !symmetric
    ? generatedRightCells.map(([x, y]) => [oppositeX(x), y])
    : leftCells;
  const uniqueNodeCells = uniqueCells([...finalLeftCells, ...rightCells]);
  drawCells(grid, partMask, uniqueNodeCells);

  return symmetric
    ? classifySize(leftCells.length, possibleCells)
    : `${classifySize(finalLeftCells.length, possibleCells)} / ${classifySize(rightCells.length, possibleCells)}`;
}

function generateBitCells(seed, baseX, offset) {
  const cells = [];
  const density = random(seed, 460 + offset) * 0.74;

  for (let localY = 0; localY < 3; localY++) {
    for (let localX = 0; localX < 2; localX++) {
      let fillChance = density;

      if (localX === 0) fillChance += 0.06;
      if (localY === 0) fillChance += 0.03;
      if (localY === 2) fillChance -= 0.08;
      if (localX === 1 && localY === 2) fillChance -= 0.14;

      if (random(seed, 470 + offset + localY * 10 + localX) < fillChance) {
        cells.push([baseX + localX, localY]);
      }
    }
  }

  const uniqueBitCells = uniqueCells(cells);
  const fullBlock =
    uniqueBitCells.length === 6 &&
    [0, 1, 2].every((localY) =>
      [0, 1].every((localX) =>
        uniqueBitCells.some(([x, y]) => x === baseX + localX && y === localY),
      ),
    );

  if (fullBlock) {
    return uniqueBitCells.filter(
      ([x, y]) => !(x === baseX + 1 && y === 1),
    );
  }

  return uniqueBitCells;
}

function addBits(grid, partMask, seed, symmetric = true, flipped = false) {
  const leftBaseX = 0;
  const rightBaseX = 10;
  const possibleCells = 6;
  const leftCells = generateBitCells(seed, leftBaseX, 0);
  const generatedRightCells = symmetric
    ? leftCells.map(([x, y]) => [oppositeX(x), y])
    : generateBitCells(seed, rightBaseX, 100);
  const rightCells = flipped && !symmetric
    ? leftCells.map(([x, y]) => [oppositeX(x), y])
    : generatedRightCells;
  const finalLeftCells = flipped && !symmetric
    ? generatedRightCells.map(([x, y]) => [oppositeX(x), y])
    : leftCells;
  const uniqueBitCells = uniqueCells([...finalLeftCells, ...rightCells]);
  drawCells(grid, partMask, uniqueBitCells);

  return symmetric
    ? classifySize(leftCells.length, possibleCells)
    : `${classifySize(finalLeftCells.length, possibleCells)} / ${classifySize(rightCells.length, possibleCells)}`;
}

// Digits and treads follow the same bounded-zone idea as nodes/bits, but use
// larger side regions so they read more like appendages than tiny accessories.
function generateDigitZoneCells(seed, baseX, offset) {
  if (random(seed, 420 + offset) > 0.74) {
    return [];
  }

  const cells = [];
  const density = random(seed, 430 + offset) * 0.75;
  const baseY = 6;

  for (let localY = 0; localY < 3; localY++) {
    for (let localX = 0; localX < 4; localX++) {
      let fillChance = density;

      if (localX === 0) fillChance += 0.1;
      if (localX === 1) fillChance += 0.04;
      if (localY === 1) fillChance += 0.04;
      if (localX >= 2) fillChance -= 0.12;
      if (localX === 3) fillChance -= 0.08;
      if (localY === 0 && localX >= 2) fillChance -= 0.08;

      if (random(seed, 440 + offset + localY * 10 + localX) < fillChance) {
        cells.push([baseX + localX, baseY + localY]);
      }
    }
  }

  const uniqueDigitCells = uniqueCells(cells);
  const isSolidBlock =
    uniqueDigitCells.length >= 9 &&
    [0, 1, 2].every((localY) =>
      [0, 1, 2].every((localX) =>
        uniqueDigitCells.some(([x, y]) => x === baseX + localX && y === baseY + localY),
      ),
    );

  if (isSolidBlock) {
    return uniqueDigitCells.filter(
      ([x, y]) => !(x === baseX + 2 && y === baseY + 1),
    );
  }

  return uniqueDigitCells;
}

function generateDigitSide(seed, offset, mirrored = false) {
  let cells = generateDigitZoneCells(seed, 0, offset);

  if (mirrored) {
    cells = cells.map(([x, rowY]) => [oppositeX(x), rowY]);
  }

  return {
    cells,
    visibleCells: cells.length,
  };
}

function addDigits(grid, partMask, seed, symmetric = true, flipped = false) {
  const possibleCells = 12;
  const leftDigits = generateDigitSide(seed, 0, false);
  const generatedRightDigits = symmetric
    ? {
        cells: leftDigits.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: leftDigits.visibleCells,
      }
    : generateDigitSide(seed, 100, true);
  const rightDigits = flipped && !symmetric
    ? {
        cells: leftDigits.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: leftDigits.visibleCells,
      }
    : generatedRightDigits;
  const finalLeftDigits = flipped && !symmetric
    ? {
        cells: generatedRightDigits.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: generatedRightDigits.visibleCells,
      }
    : leftDigits;

  drawCells(grid, partMask, uniqueCells([...finalLeftDigits.cells, ...rightDigits.cells]));

  return symmetric
    ? classifySize(leftDigits.visibleCells, possibleCells)
    : `${classifySize(finalLeftDigits.visibleCells, possibleCells)} / ${classifySize(rightDigits.visibleCells, possibleCells)}`;
}

// Treads are split into two zones per side so a Glytchling can implicitly become
// bipedal or quadrupedal based on which zones fill in.
function generateTreadZoneCells(seed, baseX, offset) {
  if (random(seed, 500 + offset) > 0.78) {
    return [];
  }

  const cells = [];
  const density = random(seed, 510 + offset) * 0.78;
  const baseY = HEIGHT - 3;

  for (let localY = 0; localY < 3; localY++) {
    for (let localX = 0; localX < 2; localX++) {
      let fillChance = density;

      if (localY === 2) fillChance += 0.1;
      if (localY === 1) fillChance += 0.03;
      if (localX === 0) fillChance += 0.05;
      if (localY === 0) fillChance -= 0.12;

      if (random(seed, 520 + offset + localY * 10 + localX) < fillChance) {
        cells.push([baseX + localX, baseY + localY]);
      }
    }
  }

  const uniqueTreadCells = uniqueCells(cells);
  const fullColumn = [0, 1, 2].every((localY) =>
    uniqueTreadCells.some(([x, y]) => x === baseX && y === baseY + localY),
  );
  const fullBlock =
    uniqueTreadCells.length === 6 &&
    [0, 1, 2].every((localY) =>
      [0, 1].every((localX) =>
        uniqueTreadCells.some(([x, y]) => x === baseX + localX && y === baseY + localY),
      ),
    );

  if (fullBlock) {
    return uniqueTreadCells.filter(
      ([x, y]) => !(x === baseX + 1 && y === baseY),
    );
  }

  if (fullColumn && uniqueTreadCells.some(([x]) => x === baseX + 1)) {
    return uniqueTreadCells.filter(
      ([x, y]) => !(x === baseX + 1 && y === baseY),
    );
  }

  return uniqueTreadCells;
}

function generateTreadSide(seed, offset, mirrored = false) {
  const frontTread = generateTreadZoneCells(seed, 0, offset);
  const backTread = generateTreadZoneCells(seed, 3, offset + 40);
  let cells = uniqueCells([...frontTread, ...backTread]);

  if (mirrored) {
    cells = cells.map(([x, rowY]) => [oppositeX(x), rowY]);
  }

  return {
    cells,
    visibleCells: frontTread.length + backTread.length,
  };
}

function addTreads(grid, partMask, seed, symmetric = true, flipped = false) {
  const possibleCells = 12;
  const leftTreads = generateTreadSide(seed, 0, false);
  const generatedRightTreads = symmetric
    ? {
        cells: leftTreads.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: leftTreads.visibleCells,
      }
    : generateTreadSide(seed, 100, true);
  const rightTreads = flipped && !symmetric
    ? {
        cells: leftTreads.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: leftTreads.visibleCells,
      }
    : generatedRightTreads;
  const finalLeftTreads = flipped && !symmetric
    ? {
        cells: generatedRightTreads.cells.map(([x, rowY]) => [oppositeX(x), rowY]),
        visibleCells: generatedRightTreads.visibleCells,
      }
    : leftTreads;

  drawCells(grid, partMask, uniqueCells([...finalLeftTreads.cells, ...rightTreads.cells]));

  return symmetric
    ? classifySize(leftTreads.visibleCells, possibleCells)
    : `${classifySize(finalLeftTreads.visibleCells, possibleCells)} / ${classifySize(rightTreads.visibleCells, possibleCells)}`;
}

// Color stays separate from shape so we can re-roll palettes without changing the
// Glytchling anatomy. The app exposes that as the Recolor action.
function generatePalette(seed, colorCount = 3) {
  const baseHue = Math.floor(random(seed, 800) * 360);
  const families = [
    {
      secondaryOffsets: [16, 24, 32, 40, 48, 56],
      accentOffsets: [160, 170, 180, 190, 200, 210, 220, 230],
    },
    {
      secondaryOffsets: [22, 30, 38, 46, 54, 62],
      accentOffsets: [140, 155, 170, 185, 200, 215, 230, 245],
    },
    {
      secondaryOffsets: [8, 14, 20, 26, 32, 38],
      accentOffsets: [110, 125, 140, 155, 170, 185, 200, 215],
    },
  ];
  const saturationChoices = [52, 60, 68, 76];
  const lightnessChoices = [42, 50, 58, 66];
  const family = pickFrom(seed, 801, families);
  const secondaryHue =
    (baseHue + pickFrom(seed, 802, family.secondaryOffsets)) % 360;
  const accentHue = (baseHue + pickFrom(seed, 803, family.accentOffsets)) % 360;
  const primary = `hsl(${baseHue},${pickFrom(seed, 804, saturationChoices)}%,${pickFrom(seed, 805, lightnessChoices)}%)`;
  const secondary = `hsl(${secondaryHue},${pickFrom(seed, 806, saturationChoices)}%,${pickFrom(seed, 807, lightnessChoices)}%)`;
  const accent = `hsl(${accentHue},${pickFrom(seed, 808, saturationChoices)}%,${pickFrom(seed, 809, lightnessChoices)}%)`;

  if (colorCount === 2) {
    return [primary, secondary];
  }

  return [primary, secondary, accent];
}

function pickFrom(seed, offset, values) {
  const index = Math.floor(random(seed, offset) * values.length);
  return values[index];
}

// Names are also deterministic. They are generated from seeded syllable pools plus
// a few optional "glitch" mutations so a saved seed always gets the same label.
function generateName(seed) {
  const prefixes = [
    'gly', 'vex', 'nul', 'zir', 'hex', 'morl', 'cryp', 'tek', 'wyr', 'skel',
    'dra', 'vel', 'synth', 'brim', 'thal', 'nyx', 'quor', 'grim', 'volt', 'carr',
    'ash', 'kry', 'obel', 'murk', 'zen', 'plex', 'shiv', 'thorn', 'flux', 'cor',
  ];
  const cores = [
    'tch', 'lith', 'vox', 'morph', 'shard', 'grim', 'byte', 'rift', 'drift', 'pulse',
    'glow', 'spine', 'crypt', 'mire', 'scar', 'node', 'whisp', 'fract', 'blink', 'gloom',
    'coil', 'screech', 'hush', 'glint', 'strain', 'veil', 'spark', 'thrum', 'crawl', 'weld',
  ];
  const suffixes = [
    'ling', 'oid', 'rite', 'mote', 'spawn', 'kin', 'wisp', 'form', 'shade', 'spark',
    'drone', 'husk', 'shell', 'bloom', 'mark', 'wake', 'ghost', 'phase', 'snare', 'trace',
    'gleam', 'coil', 'shiver', 'crest', 'mire', 'thing', 'crawl', 'echo', 'brand', 'weft',
  ];

  let name = `${pickFrom(seed, 900, prefixes)}${pickFrom(seed, 901, cores)}${pickFrom(seed, 902, suffixes)}`;

  if (random(seed, 903) > 0.75) {
    const index = 1 + Math.floor(random(seed, 904) * Math.max(1, name.length - 2));
    name = `${name.slice(0, index)}${name[index]}${name.slice(index)}`;
  }

  const replacements = {
    a: '4',
    b: '8',
    c: '(',
    d: '[)',
    e: '3',
    f: 'ph',
    g: '9',
    h: '#',
    i: '1',
    j: ']',
    k: '|<',
    l: '|_',
    m: '/\\/\\',
    n: '|\\|',
    o: '0',
    p: '|*',
    q: '0_',
    r: '|2',
    s: '5',
    t: '7',
    u: '(_)',
    v: '\\/',
    w: '\\/\\/',
    x: '}{',
    y: '`/',
    z: '2',
  };
  const mutationCount = random(seed, 905) > 0.84 ? 3 : random(seed, 905) > 0.52 ? 2 : random(seed, 905) > 0.22 ? 1 : 0;

  for (let i = 0; i < mutationCount; i++) {
    const index = Math.floor(random(seed, 906 + i) * name.length);
    const char = name[index]?.toLowerCase();

    if (char && replacements[char]) {
      name = `${name.slice(0, index)}${replacements[char]}${name.slice(index + 1)}`;
    }
  }

  return `${name[0].toUpperCase()}${name.slice(1)}`;
}

// Main entry point: build the anatomy grid, the per-part masks, the palette, and
// the display name in a single deterministic pass from the current state.
export function generateGlytchling(seed, options = {}) {
  const {
    enabledAttributes = {
      dome: true,
      core: true,
      node: true,
      bits: true,
      digits: true,
      treads: true,
    },
    flippedAttributes = {
      dome: false,
      core: false,
      node: false,
      bits: false,
      digits: false,
      treads: false,
    },
    symmetricAttributes = {
      dome: true,
      core: true,
      node: true,
      bits: true,
      digits: true,
      treads: true,
    },
    paletteSeed = seed,
  } = options;
  const grid = emptyGrid();
  const parts = createPartMasks();

  const dome = enabledAttributes.dome
    ? generateDome(grid, parts.dome, seed, symmetricAttributes.dome, flippedAttributes.dome)
    : 'off';
  const core = enabledAttributes.core
    ? generateCore(grid, parts.core, seed, symmetricAttributes.core, flippedAttributes.core)
    : 'off';

  const traits = {
    dome,
    core,
    node: enabledAttributes.node
      ? addNode(grid, parts.node, seed, symmetricAttributes.node, flippedAttributes.node)
      : 'off',
    bits: enabledAttributes.bits
      ? addBits(
          grid,
          parts.bits,
          seed,
          symmetricAttributes.bits,
          flippedAttributes.bits,
        )
      : 'off',
    digits: enabledAttributes.digits
      ? addDigits(grid, parts.digits, seed, symmetricAttributes.digits, flippedAttributes.digits)
      : 'off',
    treads: enabledAttributes.treads
      ? addTreads(grid, parts.treads, seed, symmetricAttributes.treads, flippedAttributes.treads)
      : 'off',
  };

  const palette = generatePalette(paletteSeed, 3);

  return {
    grid,
    name: generateName(seed),
    palette,
    parts,
    traits,
  };
}
