import {
  generateGlytchling,
  HEIGHT,
  DOME_HEIGHT,
  WIDTH,
} from './glytchlingGenerator.js';

const PIXEL = 20;
const GLYTCHLING_WIDTH = WIDTH * PIXEL;
const GLYTCHLING_HEIGHT = HEIGHT * PIXEL;
const PART_PREVIEW_PIXEL = 6;
const DRAW_ORDER = ['core', 'dome', 'treads', 'node', 'bits', 'digits'];
const TRAIT_ORDER = ['dome', 'bits', 'node', 'core', 'digits', 'treads'];

// Cache the DOM once at startup. This file owns the browser-specific layer:
// toolbar state, rendering, inspector updates, and animation.
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const regenerateButton = document.getElementById('regenerateButton');
const recolorButton = document.getElementById('recolorButton');
const favoritesButton = document.getElementById('favoritesButton');
const helpButton = document.getElementById('helpButton');
const shareButton = document.getElementById('shareButton');
const downloadButton = document.getElementById('downloadButton');
const glitchButton = document.getElementById('glitchButton');
const restoreButton = document.getElementById('restoreButton');
const favoritesOverlay = document.getElementById('favoritesOverlay');
const favoritesSaveButton = document.getElementById('favoritesSaveButton');
const favoritesCloseButton = document.getElementById('favoritesCloseButton');
const helpOverlay = document.getElementById('helpOverlay');
const helpCloseButton = document.getElementById('helpCloseButton');
const shapeSeedForm = document.getElementById('shapeSeedForm');
const colorSeedForm = document.getElementById('colorSeedForm');
const shapeSeedInput = document.getElementById('shapeSeedInput');
const colorSeedInput = document.getElementById('colorSeedInput');
const seedValue = document.getElementById('seedValue');
const colorSeedValue = document.getElementById('colorSeedValue');
const traitColorValue = document.getElementById('traitColorValue');
const nameValue = document.getElementById('nameValue');
const symmetryAllButton = document.getElementById('symmetryAllButton');
const terminalModeButton = document.getElementById('terminalModeButton');
const headBobButton = document.getElementById('headBobButton');
const pauseBobButton = document.getElementById('pauseBobButton');
const neckButton = document.getElementById('neckButton');
const traitList = document.getElementById('traitList');
const inspectorFavoriteButton = document.getElementById('inspectorFavoriteButton');
const favoritesList = document.getElementById('favoritesList');
const favoritesEmpty = document.getElementById('favoritesEmpty');

const glytchlingOffsetX = (canvas.width - GLYTCHLING_WIDTH) / 2;
const glytchlingOffsetY = (canvas.height - GLYTCHLING_HEIGHT) / 2;
const FAVORITES_STORAGE_KEY = 'glytchlings:favorites:v1';
const DEFAULT_ENABLED_ATTRIBUTES = {
  dome: true,
  core: true,
  node: true,
  bits: true,
  digits: true,
  treads: true,
};
const DEFAULT_FLIPPED_ATTRIBUTES = {
  dome: false,
  core: false,
  node: false,
  bits: false,
  digits: false,
  treads: false,
};
const DEFAULT_SYMMETRIC_ATTRIBUTES = {
  dome: true,
  core: true,
  node: true,
  bits: true,
  digits: true,
  treads: true,
};
const DEFAULT_HEAD_BOB_ENABLED = true;
const DEFAULT_NECK_GAP_ENABLED = true;
const DEFAULT_TERMINAL_MODE_ENABLED = false;
const SHARE_PART_PARAM_MAP = {
  dome: 'do',
  core: 'co',
  node: 'no',
  bits: 'bi',
  digits: 'di',
  treads: 'tr',
};
const SHARE_MODE_PARAM_MAP = {
  ga: 'neckGapEnabled',
  cr: 'terminalModeEnabled',
  pu: 'headBobEnabled',
};

// Keep newly generated seeds integer-based so the value shown in the UI is the
// exact same value used internally by the deterministic generator.
function randomSeed() {
  return Math.floor(Math.random() * 1000000);
}

function randomBoolean() {
  return Math.random() >= 0.5;
}

function parseSeedParam(value) {
  if (value == null || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSharedPartState(value) {
  if (!['1', '2', '3'].includes(value)) return null;
  return Number(value);
}

function parseSharedBooleanParam(value, defaultValue) {
  if (value === '1') return true;
  if (value === '0') return false;
  return defaultValue;
}

function createDefaultShareState() {
  return {
    enabledAttributes: { ...DEFAULT_ENABLED_ATTRIBUTES },
    flippedAttributes: { ...DEFAULT_FLIPPED_ATTRIBUTES },
    symmetricAttributes: { ...DEFAULT_SYMMETRIC_ATTRIBUTES },
    headBobEnabled: DEFAULT_HEAD_BOB_ENABLED,
    neckGapEnabled: DEFAULT_NECK_GAP_ENABLED,
    terminalModeEnabled: DEFAULT_TERMINAL_MODE_ENABLED,
  };
}

function applySharedPartState(state, partName, encodedState) {
  if (encodedState === 1) {
    state.enabledAttributes[partName] = true;
    state.symmetricAttributes[partName] = false;
    state.flippedAttributes[partName] = false;
  } else if (encodedState === 2) {
    state.enabledAttributes[partName] = true;
    state.symmetricAttributes[partName] = false;
    state.flippedAttributes[partName] = true;
  } else if (encodedState === 3) {
    state.enabledAttributes[partName] = false;
    state.symmetricAttributes[partName] = true;
    state.flippedAttributes[partName] = false;
  }
}

function encodeSharedPartState(partName, state) {
  if (!state.enabledAttributes[partName]) return '3';
  if (!state.symmetricAttributes[partName] && state.flippedAttributes[partName]) return '2';
  if (!state.symmetricAttributes[partName]) return '1';
  return null;
}

function readSeedStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sharedState = createDefaultShareState();

  for (const [partName, paramName] of Object.entries(SHARE_PART_PARAM_MAP)) {
    const encodedState = parseSharedPartState(params.get(paramName));
    if (encodedState == null) continue;

    applySharedPartState(sharedState, partName, encodedState);
  }

  sharedState.neckGapEnabled = parseSharedBooleanParam(
    params.get('ga'),
    DEFAULT_NECK_GAP_ENABLED,
  );
  sharedState.terminalModeEnabled = parseSharedBooleanParam(
    params.get('cr'),
    DEFAULT_TERMINAL_MODE_ENABLED,
  );
  sharedState.headBobEnabled = parseSharedBooleanParam(
    params.get('pu'),
    DEFAULT_HEAD_BOB_ENABLED,
  );

  return {
    shapeSeed: parseSeedParam(params.get('shape')),
    colorSeed: parseSeedParam(params.get('color')),
    ...sharedState,
  };
}

function syncUrlState() {
  const currentState = getCurrentStateSnapshot();
  const url = new URL(window.location.href);
  url.searchParams.set('shape', Math.floor(seed));
  url.searchParams.set('color', Math.floor(paletteSeed));

  for (const [partName, paramName] of Object.entries(SHARE_PART_PARAM_MAP)) {
    const encodedState = encodeSharedPartState(partName, currentState);
    if (encodedState) {
      url.searchParams.set(paramName, encodedState);
    } else {
      url.searchParams.delete(paramName);
    }
  }

  for (const [paramName, stateKey] of Object.entries(SHARE_MODE_PARAM_MAP)) {
    const defaultValue = createDefaultShareState()[stateKey];
    if (currentState[stateKey] !== defaultValue) {
      url.searchParams.set(paramName, currentState[stateKey] ? '1' : '0');
    } else {
      url.searchParams.delete(paramName);
    }
  }

  window.history.replaceState({}, '', url);
}

function getShareUrl() {
  const currentState = getCurrentStateSnapshot();
  const url = new URL(window.location.href);
  url.searchParams.set('shape', Math.floor(seed));
  url.searchParams.set('color', Math.floor(paletteSeed));

  for (const [partName, paramName] of Object.entries(SHARE_PART_PARAM_MAP)) {
    const encodedState = encodeSharedPartState(partName, currentState);
    if (encodedState) {
      url.searchParams.set(paramName, encodedState);
    } else {
      url.searchParams.delete(paramName);
    }
  }

  for (const [paramName, stateKey] of Object.entries(SHARE_MODE_PARAM_MAP)) {
    const defaultValue = createDefaultShareState()[stateKey];
    if (currentState[stateKey] !== defaultValue) {
      url.searchParams.set(paramName, currentState[stateKey] ? '1' : '0');
    } else {
      url.searchParams.delete(paramName);
    }
  }

  return url.toString();
}

function sanitizeFilenamePart(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const COPY_ICON_SVG =
  '<svg class="buttonIcon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 1h7v2H4v5H2V1zm5 3h7v11H7V4zm2 2v7h3v-2h-1V9h1V6H9z"/></svg>';
const DOWNLOAD_ICON_SVG =
  '<svg class="buttonIcon" viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1h2v6h2L8 10 5 7h2V1zm-4 9h10v4H3v-4zm2 2v1h6v-1H5z"/></svg>';
const CHECK_ICON_SVG =
  '<svg class="buttonIcon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 12L2 8l2-2 2 2 6-6 2 2-8 8z"/></svg>';
const CLOSE_ICON_SVG =
  '<svg class="buttonIcon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5l2-2 3 3 3-3 2 2-3 3 3 3-2 2-3-3-3 3-2-2 3-3-3-3z"/></svg>';

function flashButtonContent(button, nextContent, timeout = 1400) {
  const previousContent = button.dataset.defaultContent || button.innerHTML;
  button.innerHTML = nextContent;

  window.setTimeout(() => {
    button.innerHTML = previousContent;
  }, timeout);
}

function setHelpOpen(isOpen) {
  if (isOpen) {
    setFavoritesOpen(false);
  }
  helpOverlay.classList.toggle('isOpen', isOpen);
  helpOverlay.setAttribute('aria-hidden', String(!isOpen));
}

function setFavoritesOpen(isOpen) {
  if (isOpen) {
    helpOverlay.classList.remove('isOpen');
    helpOverlay.setAttribute('aria-hidden', 'true');
  }
  favoritesOverlay.classList.toggle('isOpen', isOpen);
  favoritesOverlay.setAttribute('aria-hidden', String(!isOpen));
}

function loadFavoritesFromStorage() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistFavorites() {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage failures so the app still works in private/restricted modes.
  }
}

function getCurrentStateSnapshot() {
  return {
    shapeSeed: Math.floor(seed),
    colorSeed: Math.floor(paletteSeed),
    enabledAttributes: { ...enabledAttributes },
    flippedAttributes: { ...flippedAttributes },
    symmetricAttributes: { ...symmetricAttributes },
    headBobEnabled,
    neckGapEnabled,
    terminalModeEnabled,
  };
}

function getFavoriteStateKey(state) {
  return JSON.stringify({
    shapeSeed: state.shapeSeed,
    colorSeed: state.colorSeed,
    enabledAttributes: state.enabledAttributes,
    flippedAttributes: state.flippedAttributes,
    symmetricAttributes: state.symmetricAttributes,
    headBobEnabled: state.headBobEnabled,
    neckGapEnabled: state.neckGapEnabled,
    terminalModeEnabled: state.terminalModeEnabled,
  });
}

function formatSavedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.append(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  try {
    const copied = document.execCommand('copy');
    textArea.remove();
    if (!copied) {
      throw new Error('execCommand copy failed');
    }
    return true;
  } catch (error) {
    textArea.remove();
    throw error;
  }
}

const initialUrlState = readSeedStateFromUrl();

shareButton.dataset.defaultContent = COPY_ICON_SVG;
downloadButton.dataset.defaultContent = DOWNLOAD_ICON_SVG;
inspectorFavoriteButton.dataset.defaultContent = inspectorFavoriteButton.innerHTML;

let seed = initialUrlState.shapeSeed ?? randomSeed();
let paletteSeed = initialUrlState.colorSeed ?? randomSeed();
let t = 0;
let enabledAttributes = { ...initialUrlState.enabledAttributes };
let flippedAttributes = { ...initialUrlState.flippedAttributes };
let symmetricAttributes = { ...initialUrlState.symmetricAttributes };
let headBobEnabled = initialUrlState.headBobEnabled;
let headBobPaused = false;
let pausedHeadOffset = 0;
let neckGapEnabled = initialUrlState.neckGapEnabled;
let terminalModeEnabled = initialUrlState.terminalModeEnabled;
let glytchling = generateGlytchling(seed, {
  enabledAttributes,
  flippedAttributes,
  paletteSeed,
  symmetricAttributes,
});
let hoveredPart = null;
let pinnedPart = null;
let favorites = loadFavoritesFromStorage();

ctx.imageSmoothingEnabled = false;

// Normalize values before displaying them in the inspector.
function formatTraitValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'present' : 'none';
  }

  return value;
}

// Rendering keeps the generator palette intact, but adjusts a few parts to give
// them clearer semantic roles. Nodes skew darker, bits lighter, etc.
function adjustHslLightness(color, amount) {
  const match = color.match(/^hsl\((\d+),(\d+)%?,(\d+)%\)$/);
  if (!match) return color;

  const [, hue, saturation, lightness] = match;
  const nextLightness = Math.max(0, Math.min(100, Number(lightness) + amount));
  return `hsl(${hue},${saturation}%,${nextLightness}%)`;
}

function getPartColor(palette, partName) {
  switch (partName) {
    case 'dome':
      return palette[0];
    case 'core':
      return palette[1];
    case 'treads':
      return palette[0];
    case 'node':
      return adjustHslLightness(palette[2], -12);
    case 'bits':
      return adjustHslLightness(palette[2], 14);
    case 'digits':
      return palette[2];
    default:
      return palette[0];
  }
}

// The top toolbar has a few stateful buttons. This keeps their visual state in
// sync with the underlying booleans after any inspector or toolbar interaction.
function syncPresentationButtons() {
  headBobButton.classList.toggle('isOn', headBobEnabled);
  pauseBobButton.classList.toggle('isOn', headBobPaused);
  neckButton.classList.toggle('isOn', neckGapEnabled);
  terminalModeButton.classList.toggle('isOn', terminalModeEnabled);
  symmetryAllButton.classList.toggle(
    'isOn',
    Object.values(symmetricAttributes).every(Boolean),
  );
}

// Rebuild the trait list from scratch any time the Glytchling or option state changes.
// That keeps the row controls, labels, current values, and shareable URL aligned
// with the active deterministic seed state.
function renderTraitInspector(seed, traits) {
  syncUrlState();
  seedValue.textContent = `[${Math.floor(seed)}]...`;
  colorSeedValue.textContent = `[${Math.floor(paletteSeed)}]...`;
  shapeSeedInput.value = Math.floor(seed);
  colorSeedInput.value = Math.floor(paletteSeed);
  traitList.innerHTML = '';

  for (const label of TRAIT_ORDER) {
    if (!(label in traits)) continue;

    const value = traits[label];
    const row = document.createElement('li');
    row.className = 'traitRow';

    const traitMeta = document.createElement('div');
    traitMeta.className = 'traitMeta';
    const traitSummary = document.createElement('div');
    traitSummary.className = 'traitSummary';

    const traitLabel = document.createElement('span');
    traitLabel.className = 'traitLabel';
    traitLabel.textContent = `${label}:`;

    const traitValue = document.createElement('span');
    traitValue.className = 'traitValue';
    traitValue.textContent = `[${formatTraitValue(value)}]`;

    if (Object.hasOwn(symmetricAttributes, label)) {
      const controlRow = document.createElement('div');
      controlRow.className = 'partControls';

      const enableLabel = document.createElement('label');
      enableLabel.className = 'partToggle';

      const enableInput = document.createElement('input');
      enableInput.type = 'checkbox';
      enableInput.checked = enabledAttributes[label];
      enableInput.dataset.partEnabled = label;

      const enableCopy = document.createElement('span');
      enableCopy.textContent = 'on';

      enableLabel.append(enableInput, enableCopy);

      const symmetryLabel = document.createElement('label');
      symmetryLabel.className = 'partToggle';

      const symmetryInput = document.createElement('input');
      symmetryInput.type = 'checkbox';
      symmetryInput.checked = symmetricAttributes[label];
      symmetryInput.dataset.partToggle = label;

      const symmetryCopy = document.createElement('span');
      symmetryCopy.textContent = 'sym';

      const flipLabel = document.createElement('label');
      flipLabel.className = 'partToggle';

      const flipInput = document.createElement('input');
      flipInput.type = 'checkbox';
      flipInput.checked = flippedAttributes[label];
      flipInput.dataset.partFlip = label;

      const flipCopy = document.createElement('span');
      flipCopy.textContent = 'flip';

      symmetryLabel.append(symmetryInput, symmetryCopy);
      flipLabel.append(flipInput, flipCopy);
      traitSummary.append(traitLabel, traitValue);
      controlRow.append(enableLabel, symmetryLabel, flipLabel);
      traitMeta.append(traitSummary, controlRow);
    } else {
      traitSummary.append(traitLabel, traitValue);
      traitMeta.append(traitSummary);
    }

    row.dataset.part = label;
    row.append(traitMeta);
    traitList.appendChild(row);
  }
}

// Hover is temporary focus; pin is persistent focus. This helper resolves which
// one currently "wins" for the main canvas and sidebar row styling.
function getActivePart() {
  return hoveredPart ?? pinnedPart;
}

function updateTraitColorReadout() {
  const activePart = getActivePart();

  if (!activePart || !glytchling) {
    traitColorValue.textContent = '[None Selected]';
    return;
  }

  traitColorValue.textContent = `[${getPartColor(glytchling.palette, activePart)}]`;
}

function partHasPixels(partMask) {
  return partMask.some((row) => row.some(Boolean));
}

function getDrawY(y, headOffset) {
  let drawY = y < DOME_HEIGHT ? y + headOffset : y;
  if (!neckGapEnabled && y >= DOME_HEIGHT) {
    drawY -= 1;
  }

  return drawY;
}

function buildTerminalIntensityMap(parts, headOffset) {
  const intensityMap = new Map();

  for (const partName of DRAW_ORDER) {
    const partMask = parts[partName];
    if (!partMask || !partHasPixels(partMask)) continue;

    for (let y = 0; y < partMask.length; y++) {
      for (let x = 0; x < partMask[y].length; x++) {
        if (!partMask[y][x]) continue;

        const key = `${x},${getDrawY(y, headOffset)}`;
        intensityMap.set(key, (intensityMap.get(key) ?? 0) + 1);
      }
    }
  }

  return intensityMap;
}

function updateTraitRowStates() {
  const activePart = getActivePart();

  for (const row of traitList.querySelectorAll('.traitRow')) {
    const part = row.dataset.part;
    row.classList.toggle('isActive', part === activePart);
    row.classList.toggle('isPinned', part === pinnedPart);
  }

  updateTraitColorReadout();
}

// Trait previews are miniature masks shown in the sidebar. They are intentionally
// rendered in green so they read like diagnostic silhouettes rather than tiny
// duplicates of the fully colored Glytchling.
function drawPartPreview(canvas, partMask, color) {
  const previewCtx = canvas.getContext('2d');

  previewCtx.clearRect(0, 0, canvas.width, canvas.height);
  previewCtx.fillStyle = color;

  for (let y = 0; y < partMask.length; y++) {
    for (let x = 0; x < partMask[y].length; x++) {
      if (!partMask[y][x]) continue;

      previewCtx.fillRect(
        (x + 1) * PART_PREVIEW_PIXEL,
        (y + 1) * PART_PREVIEW_PIXEL,
        PART_PREVIEW_PIXEL,
        PART_PREVIEW_PIXEL,
      );
    }
  }
}

// Rebuild all sidebar previews after the text rows are rendered. This keeps the
// DOM construction simple and lets the same part masks power both preview types.
function renderPartInspector(seed, glytchling) {
  const { name, parts, traits } = glytchling;

  nameValue.textContent = `[${name}]...`;
  updateTraitColorReadout();
  renderTraitInspector(seed, traits);

  for (const row of traitList.querySelectorAll('.traitRow')) {
    const part = row.dataset.part;

    if (!part || !parts[part]) continue;

    const preview = document.createElement('canvas');
    preview.className = 'traitPreview';
    preview.width = (WIDTH + 2) * PART_PREVIEW_PIXEL;
    preview.height = (HEIGHT + 2) * PART_PREVIEW_PIXEL;

    drawPartPreview(preview, parts[part], '#7dff8f');
    row.prepend(preview);
  }

  updateTraitRowStates();
  syncPresentationButtons();
  renderFavoritesList();
}

function createFavoritePreviewDataUrl(state) {
  const previewGlytchling = generateGlytchling(state.shapeSeed, {
    enabledAttributes: state.enabledAttributes,
    flippedAttributes: state.flippedAttributes,
    paletteSeed: state.colorSeed,
    symmetricAttributes: state.symmetricAttributes,
  });
  const previewCanvas = document.createElement('canvas');
  const previewCtx = previewCanvas.getContext('2d');
  const previewPixel = 5;
  const previewOffset = previewPixel;
  const getPreviewDrawY = (y) => (y < DOME_HEIGHT || state.neckGapEnabled ? y : y - 1);

  previewCanvas.width = (WIDTH + 2) * previewPixel;
  previewCanvas.height = (HEIGHT + 2) * previewPixel;
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  const previewIntensityMap = new Map();

  if (state.terminalModeEnabled) {
    for (const partName of DRAW_ORDER) {
      const partMask = previewGlytchling.parts[partName];
      if (!partMask || !partHasPixels(partMask)) continue;

      for (let y = 0; y < partMask.length; y++) {
        for (let x = 0; x < partMask[y].length; x++) {
          if (!partMask[y][x]) continue;

          const key = `${x},${getPreviewDrawY(y)}`;
          previewIntensityMap.set(key, (previewIntensityMap.get(key) ?? 0) + 1);
        }
      }
    }
  }

  for (const partName of DRAW_ORDER) {
    const partMask = previewGlytchling.parts[partName];
    if (!partMask || !partHasPixels(partMask)) continue;

    for (let y = 0; y < partMask.length; y++) {
      for (let x = 0; x < partMask[y].length; x++) {
        if (!partMask[y][x]) continue;

        const drawY = getPreviewDrawY(y);
        const drawX = x * previewPixel + previewOffset;
        const absoluteY = drawY * previewPixel + previewOffset;

        if (state.terminalModeEnabled) {
          const overlapCount = previewIntensityMap.get(`${x},${drawY}`) ?? 1;
          const glowStrength =
            overlapCount >= 3 ? 0.95 : overlapCount === 2 ? 0.6 : 0.28;

          previewCtx.fillStyle = 'rgba(5, 20, 10, 0.92)';
          previewCtx.fillRect(drawX, absoluteY, previewPixel, previewPixel);

          previewCtx.fillStyle = `rgba(125, 255, 143, ${0.18 + glowStrength * 0.22})`;
          previewCtx.fillRect(
            drawX + 1,
            absoluteY + 1,
            Math.max(1, previewPixel - 2),
            Math.max(1, previewPixel - 2),
          );

          previewCtx.strokeStyle = `rgba(162, 255, 173, ${0.2 + glowStrength * 0.28})`;
          previewCtx.lineWidth = 1;
          previewCtx.strokeRect(
            drawX + 0.5,
            absoluteY + 0.5,
            Math.max(0, previewPixel - 1),
            Math.max(0, previewPixel - 1),
          );
        } else {
          previewCtx.fillStyle = getPartColor(previewGlytchling.palette, partName);
          previewCtx.fillRect(drawX, absoluteY, previewPixel, previewPixel);
        }
      }
    }
  }

  return previewCanvas.toDataURL('image/png');
}

function renderFavoritesList() {
  favoritesList.innerHTML = '';
  favoritesEmpty.hidden = favorites.length > 0;
  const currentStateKey = getFavoriteStateKey(getCurrentStateSnapshot());

  for (const favorite of favorites) {
    const item = document.createElement('li');
    item.className = 'favoriteItem';

    const row = document.createElement('div');
    row.className = 'favoriteRow';

    const loadButton = document.createElement('button');
    loadButton.className = 'favoriteLoad';
    loadButton.type = 'button';
    loadButton.dataset.favoriteLoad = favorite.id;
    loadButton.classList.toggle('isCurrent', favorite.id === currentStateKey);

    const thumb = document.createElement('img');
    thumb.className = 'favoriteThumb';
    thumb.src = favorite.preview;
    thumb.alt = `${favorite.name} preview`;

    const meta = document.createElement('div');
    meta.className = 'favoriteMeta';

    const name = document.createElement('span');
    name.className = 'favoriteName';
    name.textContent = favorite.name;

    const seeds = document.createElement('span');
    seeds.className = 'favoriteSeeds';
    seeds.textContent = `shape ${favorite.shapeSeed} / color ${favorite.colorSeed}`;

    const savedAt = document.createElement('span');
    savedAt.className = 'favoriteSavedAt';
    savedAt.textContent = `saved ${formatSavedAt(favorite.savedAt)}`;

    meta.append(name, seeds, savedAt);
    loadButton.append(thumb, meta);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'seedButton iconButton';
    deleteButton.type = 'button';
    deleteButton.dataset.favoriteDelete = favorite.id;
    deleteButton.setAttribute('aria-label', `Delete ${favorite.name}`);
    deleteButton.textContent = 'X';

    row.append(loadButton, deleteButton);
    item.append(row);
    favoritesList.append(item);
  }
}

// Draw one part mask into the main canvas, applying the current presentation
// settings such as pulse motion and the optional removal of the dome/core gap.
function drawPartMask(partMask, headOffset, color, intensityMap = null) {
  for (let y = 0; y < partMask.length; y++) {
    for (let x = 0; x < partMask[y].length; x++) {
      if (!partMask[y][x]) continue;

      const drawY = getDrawY(y, headOffset);

      const drawX = x * PIXEL + glytchlingOffsetX;
      const absoluteY = drawY * PIXEL + glytchlingOffsetY;

      if (terminalModeEnabled) {
        const overlapCount = intensityMap?.get(`${x},${drawY}`) ?? 1;
        const glowStrength =
          overlapCount >= 3 ? 1 : overlapCount === 2 ? 0.56 : 0.24;
        const innerGlowAlpha = 0.14 + glowStrength * 0.26;
        const coreGlowAlpha = 0.12 + glowStrength * 0.34;
        const scanAlpha = 0.08 + glowStrength * 0.12;
        const edgeGlowAlpha = 0.12 + glowStrength * 0.22;

        ctx.fillStyle = 'rgba(5, 20, 10, 0.9)';
        ctx.fillRect(drawX, absoluteY, PIXEL, PIXEL);

        if (overlapCount >= 3) {
          ctx.fillStyle = 'rgba(125, 255, 143, 0.2)';
          ctx.fillRect(drawX - 1, absoluteY + 5, PIXEL + 2, PIXEL - 10);
          ctx.fillRect(drawX + 5, absoluteY - 1, PIXEL - 10, PIXEL + 2);
        }

        ctx.fillStyle = `rgba(125, 255, 143, ${innerGlowAlpha})`;
        ctx.fillRect(drawX + 1, absoluteY + 1, PIXEL - 2, PIXEL - 2);

        ctx.fillStyle = `rgba(170, 255, 182, ${coreGlowAlpha})`;
        ctx.fillRect(drawX + 4, absoluteY + 4, PIXEL - 8, PIXEL - 8);

        ctx.fillStyle = `rgba(125, 255, 143, ${scanAlpha})`;
        ctx.fillRect(drawX + 2, absoluteY + 3, PIXEL - 4, 2);
        ctx.fillRect(drawX + 2, absoluteY + PIXEL - 5, PIXEL - 4, 1);

        ctx.strokeStyle = `rgba(162, 255, 173, ${edgeGlowAlpha})`;
        ctx.lineWidth = overlapCount >= 3 ? 1.5 : 1;
        ctx.strokeRect(drawX + 1.5, absoluteY + 1.5, PIXEL - 3, PIXEL - 3);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX + 0.5, absoluteY + 0.5, PIXEL - 1, PIXEL - 1);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(drawX, absoluteY, PIXEL, PIXEL);
      }
    }
  }
}

// Main Glytchling renderer. When a trait is focused, the selected part keeps its
// full color while the other parts are dimmed so the anatomy remains readable.
function drawGlytchling(glytchling, headOffset = 0) {
  const { parts } = glytchling;
  const activePart = getActivePart();
  const intensityMap = terminalModeEnabled
    ? buildTerminalIntensityMap(parts, headOffset)
    : null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const partName of DRAW_ORDER) {
    const partMask = parts[partName];
    if (!partMask || !partHasPixels(partMask)) continue;

    const color = terminalModeEnabled
      ? activePart && partName !== activePart
        ? 'rgba(58, 122, 71, 0.38)'
        : 'rgba(125, 255, 143, 0.9)'
      : activePart && partName !== activePart
        ? 'rgba(255, 255, 255, 0.12)'
        : getPartColor(glytchling.palette, partName);
    drawPartMask(partMask, headOffset, color, intensityMap);
  }
}

// The idle animation is intentionally subtle: it settles downward and returns,
// rather than constantly bouncing, to keep the sprite feeling alive but calm.
function getHeadOffset(time) {
  const settle = (Math.sin(time) + 1) / 2;
  const secondarySettle = (Math.sin(time * 0.43 + 1.4) + 1) / 2;

  return Math.round(settle * 0.7 + secondarySettle * 0.3);
}

function animate() {
  if (!headBobPaused) {
    t += 0.018;
  }

  const headOffset = headBobEnabled
    ? headBobPaused
      ? pausedHeadOffset
      : getHeadOffset(t)
    : 0;
  drawGlytchling(glytchling, headOffset);

  requestAnimationFrame(animate);
}

// Spawn creates a new shape seed and a new palette seed together.
function regenerateGlytchling() {
  seed = randomSeed();
  paletteSeed = randomSeed();
  enabledAttributes = { ...DEFAULT_ENABLED_ATTRIBUTES };
  flippedAttributes = { ...DEFAULT_FLIPPED_ATTRIBUTES };
  symmetricAttributes = { ...DEFAULT_SYMMETRIC_ATTRIBUTES };
  headBobEnabled = DEFAULT_HEAD_BOB_ENABLED;
  headBobPaused = false;
  pausedHeadOffset = 0;
  neckGapEnabled = DEFAULT_NECK_GAP_ENABLED;
  terminalModeEnabled = DEFAULT_TERMINAL_MODE_ENABLED;
  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
}

// Load a known shape while preserving the current palette seed and option state.
function setGlytchlingSeed(nextSeed) {
  if (!Number.isFinite(nextSeed)) return;

  seed = nextSeed;
  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
}

// Load a known palette while preserving the current Glytchling structure.
function setColorSeed(nextSeed) {
  if (!Number.isFinite(nextSeed)) return;

  paletteSeed = nextSeed;
  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  renderPartInspector(seed, glytchling);
}

// Recolor keeps the current shape and options, but rolls a fresh deterministic palette.
function recolorGlytchling() {
  paletteSeed = randomSeed();
  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  renderPartInspector(seed, glytchling);
}

// Share is currently a simple copy-link action. The URL-backed shape/color query
// params recreate the same Glytchling later when someone opens the copied link.
async function copyGlytchlingLink() {
  const shareUrl = getShareUrl();

  try {
    await copyTextToClipboard(shareUrl);
    flashButtonContent(shareButton, CHECK_ICON_SVG);
  } catch {
    flashButtonContent(shareButton, CLOSE_ICON_SVG);
  }
}

// Download saves the current canvas exactly as rendered, including presentation
// modes like CRT FX, and uses the name plus current shape/color seeds in the file.
function downloadGlytchlingImage() {
  const link = document.createElement('a');
  const safeName = sanitizeFilenamePart(glytchling.name || 'glytchling') || 'glytchling';

  link.href = canvas.toDataURL('image/png');
  link.download = `${safeName}-shape-${Math.floor(seed)}-color-${Math.floor(paletteSeed)}.png`;
  link.click();
  flashButtonContent(downloadButton, CHECK_ICON_SVG);
}

function applySavedState(state) {
  seed = state.shapeSeed;
  paletteSeed = state.colorSeed;
  enabledAttributes = { ...state.enabledAttributes };
  flippedAttributes = { ...state.flippedAttributes };
  symmetricAttributes = { ...state.symmetricAttributes };
  headBobEnabled = state.headBobEnabled;
  headBobPaused = false;
  pausedHeadOffset = 0;
  neckGapEnabled = state.neckGapEnabled;
  terminalModeEnabled = state.terminalModeEnabled;

  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
  renderFavoritesList();
}

function saveCurrentFavorite() {
  const state = getCurrentStateSnapshot();
  const favorite = {
    ...state,
    id: getFavoriteStateKey(state),
    name: glytchling.name,
    preview: createFavoritePreviewDataUrl(state),
    savedAt: Date.now(),
  };

  favorites = [favorite, ...favorites.filter((entry) => entry.id !== favorite.id)];
  persistFavorites();
  renderFavoritesList();
  flashButtonContent(favoritesSaveButton, 'Saved');
  flashButtonContent(inspectorFavoriteButton, CHECK_ICON_SVG);
}

function loadFavoriteById(favoriteId) {
  const favorite = favorites.find((entry) => entry.id === favoriteId);
  if (!favorite) return;

  applySavedState(favorite);
}

function deleteFavoriteById(favoriteId) {
  favorites = favorites.filter((entry) => entry.id !== favoriteId);
  persistFavorites();
  renderFavoritesList();
}

// Glitch mode scrambles the current option state without rolling a new shape or
// palette seed. That makes it useful for stress-testing combinations and
// exploring unusual silhouettes from a known deterministic Glytchling.
function glitchGlytchlingOptions() {
  enabledAttributes = Object.fromEntries(
    Object.keys(enabledAttributes).map((part) => [part, randomBoolean()]),
  );
  symmetricAttributes = Object.fromEntries(
    Object.keys(symmetricAttributes).map((part) => [part, randomBoolean()]),
  );
  flippedAttributes = Object.fromEntries(
    Object.keys(flippedAttributes).map((part) => [part, randomBoolean()]),
  );
  headBobEnabled = randomBoolean();
  headBobPaused = false;
  pausedHeadOffset = 0;
  neckGapEnabled = randomBoolean();
  terminalModeEnabled = randomBoolean();

  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
}

// Restore returns the anatomy controls to a readable baseline: all parts on,
// mirrored, and unflipped. The current shape and color seeds stay the same.
function restoreGlytchlingOptions() {
  enabledAttributes = Object.fromEntries(
    Object.keys(enabledAttributes).map((part) => [part, true]),
  );
  symmetricAttributes = Object.fromEntries(
    Object.keys(symmetricAttributes).map((part) => [part, true]),
  );
  flippedAttributes = Object.fromEntries(
    Object.keys(flippedAttributes).map((part) => [part, false]),
  );
  headBobEnabled = true;
  headBobPaused = false;
  pausedHeadOffset = 0;
  neckGapEnabled = true;
  terminalModeEnabled = false;

  glytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
}

// Inspector interactions:
// - hover previews a part
// - click pins that part
// - change events handle the per-part on/sym/flip controls
traitList.addEventListener('pointerover', (event) => {
  const row = event.target.closest('.traitRow');
  if (!row) return;

  hoveredPart = row.dataset.part;
  updateTraitRowStates();
});

traitList.addEventListener('pointerout', (event) => {
  const row = event.target.closest('.traitRow');
  if (!row) return;

  const nextRow = event.relatedTarget?.closest?.('.traitRow');
  if (nextRow === row) return;

  hoveredPart = null;
  updateTraitRowStates();
});

traitList.addEventListener('click', (event) => {
  const row = event.target.closest('.traitRow');
  if (!row) return;

  const part = row.dataset.part;
  pinnedPart = pinnedPart === part ? null : part;
  updateTraitRowStates();
});

// Toolbar interactions:
// - Spawn rolls a new Glytchling
// - Recolor rolls only the palette
// - shape/color forms load explicit seeds
// - the presentation buttons update only the renderer, not the generator
favoritesButton.addEventListener('click', () => {
  setFavoritesOpen(true);
});
helpButton.addEventListener('click', () => {
  setHelpOpen(true);
});
regenerateButton.addEventListener('click', regenerateGlytchling);
recolorButton.addEventListener('click', recolorGlytchling);
shareButton.addEventListener('click', copyGlytchlingLink);
downloadButton.addEventListener('click', downloadGlytchlingImage);
glitchButton.addEventListener('click', glitchGlytchlingOptions);
restoreButton.addEventListener('click', restoreGlytchlingOptions);
favoritesSaveButton.addEventListener('click', saveCurrentFavorite);
inspectorFavoriteButton.addEventListener('click', saveCurrentFavorite);
favoritesCloseButton.addEventListener('click', () => {
  setFavoritesOpen(false);
});
favoritesOverlay.addEventListener('click', (event) => {
  if (event.target === favoritesOverlay) {
    setFavoritesOpen(false);
  }
});
helpCloseButton.addEventListener('click', () => {
  setHelpOpen(false);
});
helpOverlay.addEventListener('click', (event) => {
  if (event.target === helpOverlay) {
    setHelpOpen(false);
  }
});
symmetryAllButton.addEventListener('click', () => {
  const nextValue = !Object.values(symmetricAttributes).every(Boolean);
  symmetricAttributes = Object.fromEntries(
    Object.keys(symmetricAttributes).map((part) => [part, nextValue]),
  );
  setGlytchlingSeed(seed);
});
headBobButton.addEventListener('click', () => {
  headBobEnabled = !headBobEnabled;
  if (!headBobEnabled) {
    headBobPaused = false;
    pausedHeadOffset = 0;
  }
  syncPresentationButtons();
});
pauseBobButton.addEventListener('click', () => {
  if (!headBobEnabled) return;

  headBobPaused = !headBobPaused;
  if (headBobPaused) {
    pausedHeadOffset = getHeadOffset(t);
  }
  syncPresentationButtons();
});
neckButton.addEventListener('click', () => {
  neckGapEnabled = !neckGapEnabled;
  syncPresentationButtons();
});
terminalModeButton.addEventListener('click', () => {
  terminalModeEnabled = !terminalModeEnabled;
  syncPresentationButtons();
});
shapeSeedForm.addEventListener('submit', (event) => {
  event.preventDefault();

  setGlytchlingSeed(Number(shapeSeedInput.value));
});
colorSeedForm.addEventListener('submit', (event) => {
  event.preventDefault();

  setColorSeed(Number(colorSeedInput.value));
});
traitList.addEventListener('change', (event) => {
  const enableToggle = event.target.closest('[data-part-enabled]');
  if (enableToggle) {
    enabledAttributes = {
      ...enabledAttributes,
      [enableToggle.dataset.partEnabled]: enableToggle.checked,
    };
    setGlytchlingSeed(seed);
    return;
  }

  const toggle = event.target.closest('[data-part-toggle]');
  if (toggle) {
    symmetricAttributes = {
      ...symmetricAttributes,
      [toggle.dataset.partToggle]: toggle.checked,
    };
    setGlytchlingSeed(seed);
    return;
  }

  const flipToggle = event.target.closest('[data-part-flip]');
  if (!flipToggle) return;

  flippedAttributes = {
    ...flippedAttributes,
    [flipToggle.dataset.partFlip]: flipToggle.checked,
  };
  setGlytchlingSeed(seed);
});
favoritesList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-favorite-delete]');
  if (deleteButton) {
    deleteFavoriteById(deleteButton.dataset.favoriteDelete);
    return;
  }

  const loadButton = event.target.closest('[data-favorite-load]');
  if (loadButton) {
    loadFavoriteById(loadButton.dataset.favoriteLoad);
    setFavoritesOpen(false);
  }
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (favoritesOverlay.classList.contains('isOpen')) {
      setFavoritesOpen(false);
      return;
    }

    if (helpOverlay.classList.contains('isOpen')) {
      setHelpOpen(false);
    }
  }
});
renderPartInspector(seed, glytchling);
syncPresentationButtons();
animate();
