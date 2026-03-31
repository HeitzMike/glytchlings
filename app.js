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
// UI state, rendering, inspector updates, and animation.
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const regenerateButton = document.getElementById('regenerateButton');
const recolorButton = document.getElementById('recolorButton');
const desyncColorButton = document.getElementById('desyncColorButton');
const restoreColorButton = document.getElementById('restoreColorButton');
const favoritesButton = document.getElementById('favoritesButton');
const helpButton = document.getElementById('helpButton');
const shareButton = document.getElementById('shareButton');
const downloadButton = document.getElementById('downloadButton');
const spawnButton = document.getElementById('spawnButton');
const glitchButton = document.getElementById('glitchButton');
const restoreButton = document.getElementById('restoreButton');
const favoritesOverlay = document.getElementById('favoritesOverlay');
const favoritesUploadButton = document.getElementById('favoritesUploadButton');
const favoritesDownloadButton = document.getElementById(
  'favoritesDownloadButton',
);
const favoritesCloseButton = document.getElementById('favoritesCloseButton');
const favoritesImportInput = document.getElementById('favoritesImportInput');
const helpOverlay = document.getElementById('helpOverlay');
const helpCloseButton = document.getElementById('helpCloseButton');
const helpMuteSettingButton = document.getElementById('helpMuteSettingButton');
const helpInspectorSettingButton = document.getElementById(
  'helpInspectorSettingButton',
);
const fullscreenViewButton = document.getElementById('fullscreenViewButton');
const changelogOverlay = document.getElementById('changelogOverlay');
const changelogButton = document.getElementById('changelogButton');
const changelogCloseButton = document.getElementById('changelogCloseButton');
const changelogContent = document.getElementById('changelogContent');
const shapeSeedForm = document.getElementById('shapeSeedForm');
const colorSeedForm = document.getElementById('colorSeedForm');
const shapeSeedInput = document.getElementById('shapeSeedInput');
const colorSeedInput = document.getElementById('colorSeedInput');
const nameValue = document.getElementById('nameValue');
const natureValue = document.getElementById('natureValue');
const symmetryAllButton = document.getElementById('symmetryAllButton');
const terminalModeButton = document.getElementById('terminalModeButton');
const headBobButton = document.getElementById('headBobButton');
const invertColorButton = document.getElementById('invertColorButton');
const inspectorPanel = document.querySelector('.inspector');
const showInspectorButton = document.getElementById('showInspectorButton');
const hideInspectorButton = document.getElementById('hideInspectorButton');
const shapeInspectorTab = document.getElementById('shapeInspectorTab');
const colorInspectorTab = document.getElementById('colorInspectorTab');
const identityInspectorTab = document.getElementById('identityInspectorTab');
const shapeInspectorControls = document.getElementById(
  'shapeInspectorControls',
);
const colorInspectorControls = document.getElementById(
  'colorInspectorControls',
);
const identityInspectorControls = document.getElementById(
  'identityInspectorControls',
);
const identityNameForm = document.getElementById('identityNameForm');
const identityNameInput = document.getElementById('identityNameInput');
const restoreNameButton = document.getElementById('restoreNameButton');
const traitList = document.getElementById('traitList');
const inspectorFavoriteButton = document.getElementById(
  'inspectorFavoriteButton',
);
const favoritesList = document.getElementById('favoritesList');
const favoritesEmpty = document.getElementById('favoritesEmpty');
const favoritesCount = document.getElementById('favoritesCount');
const favoritesStatus = document.getElementById('favoritesStatus');
const playCryButton = document.getElementById('playCryButton');
const cryWaveCanvas = document.getElementById('cryWaveCanvas');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenCanvas = document.getElementById('fullscreenCanvas');
const fullscreenCtx = fullscreenCanvas.getContext('2d');

const glytchlingOffsetX = (canvas.width - GLYTCHLING_WIDTH) / 2;
// Keep one sprite-pixel of breathing room above the highest animated top parts
// and below the lowest animated treads so the canvas border feels evenly framed.
const glytchlingOffsetY = PIXEL * 2;
const FAVORITES_STORAGE_KEY = 'glytchlings:favorites:v1';
const USER_SETTINGS_STORAGE_KEY = 'glytchlings:user-settings:v1';
const FAVORITES_EXPORT_VERSION = 1;
const FAVORITES_LIMIT = 200;
const FAVORITES_IMPORT_MAX_BYTES = 1024 * 1024;
const MAX_NAME_LENGTH = 30;
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
const DEFAULT_ANIMATION_ATTRIBUTES = {
  dome: true,
  node: true,
  bits: true,
  digits: true,
  treads: true,
};
const DEFAULT_HEAD_BOB_ENABLED = true;
const DEFAULT_TERMINAL_MODE_ENABLED = false;
const COLOR_CHANNEL_DEFAULTS = {
  h: null,
  s: null,
  l: null,
};
const SHARE_PART_PARAM_MAP = {
  dome: 'do',
  core: 'co',
  node: 'no',
  bits: 'bi',
  digits: 'di',
  treads: 'tr',
};
const SHARE_MODE_PARAM_MAP = {
  cr: 'terminalModeEnabled',
  pu: 'headBobEnabled',
};
const SHARE_PART_CODE_MAP = Object.fromEntries(
  Object.entries(SHARE_PART_PARAM_MAP).map(([partName, code]) => [
    code,
    partName,
  ]),
);
let changelogLoaded = false;
let audioContext = null;
let lastCrySeed = null;

// Keep newly generated seeds integer-based so the value shown in the UI is the
// exact same value used internally by the deterministic generator.
function randomSeed() {
  return Math.floor(Math.random() * 1000000);
}

function randomBoolean() {
  return Math.random() >= 0.5;
}

function rng(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function seededPick(seed, offset, values) {
  return values[Math.floor(rng(seed + offset) * values.length)];
}

function parseSeedParam(value) {
  if (value == null || value.trim() === '') return null;

  const parsed = Number(value);
  return parseSafeSeedValue(parsed);
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
    colorAdjustments: createDefaultColorAdjustments(),
    flippedAttributes: { ...DEFAULT_FLIPPED_ATTRIBUTES },
    globalColorInvert: false,
    symmetricAttributes: { ...DEFAULT_SYMMETRIC_ATTRIBUTES },
    headBobEnabled: DEFAULT_HEAD_BOB_ENABLED,
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
  if (!state.symmetricAttributes[partName] && state.flippedAttributes[partName])
    return '2';
  if (!state.symmetricAttributes[partName]) return '1';
  return null;
}

function parseSharedColorAdjustments(value) {
  if (!value) return createDefaultColorAdjustments();

  const result = createDefaultColorAdjustments();
  const segments = value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const [partCode, rawChannels] = segment.split('.', 2);
    const partName = SHARE_PART_CODE_MAP[partCode];
    if (!partName || !rawChannels) continue;

    const nextChannels = { ...result[partName] };
    const channelSegments = rawChannels
      .split('_')
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const channelSegment of channelSegments) {
      const channel = channelSegment.charAt(0);
      const rawValue = channelSegment.slice(1);
      if (!['h', 's', 'l'].includes(channel) || rawValue === '') continue;

      const numericValue = Number(rawValue);
      const validH =
        channel === 'h' &&
        Number.isFinite(numericValue) &&
        Number.isInteger(numericValue) &&
        numericValue >= 0 &&
        numericValue <= 359;
      const validSL =
        (channel === 's' || channel === 'l') &&
        Number.isFinite(numericValue) &&
        Number.isInteger(numericValue) &&
        numericValue >= 0 &&
        numericValue <= 100;

      if (!validH && !validSL) continue;
      nextChannels[channel] = numericValue;
    }

    result[partName] = nextChannels;
  }

  return result;
}

function serializeSharedColorAdjustments(adjustmentsMap = colorAdjustments) {
  const segments = [];

  for (const [partName, partCode] of Object.entries(SHARE_PART_PARAM_MAP)) {
    const adjustments = adjustmentsMap[partName] ?? COLOR_CHANNEL_DEFAULTS;
    const channelSegments = [];

    for (const channel of ['h', 's', 'l']) {
      const value = adjustments[channel];
      if (value == null) continue;
      channelSegments.push(`${channel}${Math.round(value)}`);
    }

    if (channelSegments.length > 0) {
      segments.push(`${partCode}.${channelSegments.join('_')}`);
    }
  }

  return segments.join(',');
}

function readSeedStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sharedState = createDefaultShareState();

  for (const [partName, paramName] of Object.entries(SHARE_PART_PARAM_MAP)) {
    const encodedState = parseSharedPartState(params.get(paramName));
    if (encodedState == null) continue;

    applySharedPartState(sharedState, partName, encodedState);
  }

  sharedState.terminalModeEnabled = parseSharedBooleanParam(
    params.get('cr'),
    DEFAULT_TERMINAL_MODE_ENABLED,
  );
  sharedState.headBobEnabled = parseSharedBooleanParam(
    params.get('pu'),
    DEFAULT_HEAD_BOB_ENABLED,
  );
  sharedState.globalColorInvert = parseSharedBooleanParam(
    params.get('iv'),
    false,
  );
  sharedState.colorAdjustments = parseSharedColorAdjustments(params.get('ca'));

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

  const colorAdjustmentsParam = serializeSharedColorAdjustments(
    currentState.colorAdjustments,
  );
  if (colorAdjustmentsParam) {
    url.searchParams.set('ca', colorAdjustmentsParam);
  } else {
    url.searchParams.delete('ca');
  }

  if (currentState.globalColorInvert) {
    url.searchParams.set('iv', '1');
  } else {
    url.searchParams.delete('iv');
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

  const colorAdjustmentsParam = serializeSharedColorAdjustments(
    currentState.colorAdjustments,
  );
  if (colorAdjustmentsParam) {
    url.searchParams.set('ca', colorAdjustmentsParam);
  } else {
    url.searchParams.delete('ca');
  }

  if (currentState.globalColorInvert) {
    url.searchParams.set('iv', '1');
  } else {
    url.searchParams.delete('iv');
  }

  return url.toString();
}

function sanitizeFilenamePart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
    setChangelogOpen(false);
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

  if (!isOpen) {
    favoritesImportInput.value = '';
  }
}

function setChangelogOpen(isOpen) {
  if (isOpen) {
    setFavoritesOpen(false);
    helpOverlay.classList.remove('isOpen');
    helpOverlay.setAttribute('aria-hidden', 'true');
    loadChangelogContent();
  }

  changelogOverlay.classList.toggle('isOpen', isOpen);
  changelogOverlay.setAttribute('aria-hidden', String(!isOpen));
}

function updateFullscreenCanvasSize() {
  const viewportWidth = window.innerWidth - 20;
  const viewportHeight = window.innerHeight - 20;
  const scale = Math.max(
    1,
    Math.min(viewportWidth / canvas.width, viewportHeight / canvas.height),
  );

  fullscreenCanvas.style.width = `${canvas.width * scale}px`;
  fullscreenCanvas.style.height = `${canvas.height * scale}px`;
}

function setFullscreenOpen(isOpen) {
  fullscreenOpen = Boolean(isOpen);
  fullscreenOverlay.classList.toggle('isOpen', fullscreenOpen);
  fullscreenOverlay.setAttribute('aria-hidden', String(!fullscreenOpen));
  fullscreenViewButton.checked = fullscreenOpen;

  if (fullscreenOpen) {
    setHelpOpen(false);
    updateFullscreenCanvasSize();
  }
}

function appendChangelogEntry(container, versionLine, bulletLines) {
  const item = document.createElement('section');
  item.className = 'changelogItem';

  const version = document.createElement('p');
  version.className = 'changelogVersion';
  version.textContent = versionLine;
  item.appendChild(version);

  if (bulletLines.length > 0) {
    const list = document.createElement('ul');
    list.className = 'changelogList';

    for (const bulletLine of bulletLines) {
      const listItem = document.createElement('li');
      listItem.textContent = bulletLine;
      list.appendChild(listItem);
    }

    item.appendChild(list);
  }

  container.appendChild(item);
}

function renderChangelogMarkdown(markdown) {
  const content = document.createElement('div');
  content.id = 'changelogContent';
  content.className = 'helpCopy';

  const lines = markdown.split(/\r?\n/);
  let currentVersion = '';
  let currentBullets = [];
  let hasEntries = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '# Changelog') continue;

    if (line.startsWith('## ')) {
      if (currentVersion) {
        appendChangelogEntry(content, currentVersion, currentBullets);
        hasEntries = true;
      }

      currentVersion = line.slice(3).trim();
      currentBullets = [];
      continue;
    }

    if (line.startsWith('- ')) {
      currentBullets.push(line.slice(2).trim());
    }
  }

  if (currentVersion) {
    appendChangelogEntry(content, currentVersion, currentBullets);
    hasEntries = true;
  }

  if (!hasEntries) {
    content.textContent = 'No changelog entries found.';
  }

  return content;
}

async function loadChangelogContent() {
  if (changelogLoaded) return;

  try {
    const response = await fetch('./CHANGELOG.md', { cache: 'no-cache' });
    if (!response.ok)
      throw new Error(`Unable to load changelog (${response.status})`);

    const markdown = await response.text();
    const renderedContent = renderChangelogMarkdown(markdown);
    changelogContent.replaceWith(renderedContent);
    changelogLoaded = true;
  } catch (_error) {
    changelogContent.textContent = 'Unable to load changelog.';
  }
}

function setFavoritesStatus(message = '', isError = false) {
  favoritesStatus.textContent = `Last action: ${message || 'none'}`;
  favoritesStatus.classList.toggle('isError', isError);
}

function syncFavoritesUiState() {
  const count = favorites.length;
  const isFull = count >= FAVORITES_LIMIT;

  favoritesCount.textContent = `Collection: ${count}/${FAVORITES_LIMIT}`;
  favoritesEmpty.textContent = isFull
    ? 'Log is full. Delete some Glytchlings to save new ones.'
    : 'Add a Glytchling to start your log.';
  favoritesEmpty.hidden = count > 0 && !isFull;

  inspectorFavoriteButton.disabled = isFull;
  inspectorFavoriteButton.setAttribute('aria-disabled', String(isFull));
  inspectorFavoriteButton.setAttribute(
    'aria-label',
    isFull
      ? 'Specimen log full. Delete saved Glytchlings to add more.'
      : 'Save current Glytchling to specimen log',
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSafeSeedValue(value) {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeBooleanAttributeMap(value, defaults) {
  if (!isPlainObject(value)) return null;

  const result = {};
  for (const key of Object.keys(defaults)) {
    if (typeof value[key] !== 'boolean') return null;
    result[key] = value[key];
  }

  return result;
}

function createDefaultColorAdjustments() {
  return Object.fromEntries(
    Object.keys(DEFAULT_ENABLED_ATTRIBUTES).map((partName) => [
      partName,
      { ...COLOR_CHANNEL_DEFAULTS },
    ]),
  );
}

function normalizeColorAdjustments(value) {
  if (!isPlainObject(value)) return null;

  const result = {};
  for (const partName of Object.keys(DEFAULT_ENABLED_ATTRIBUTES)) {
    const channels = value[partName];
    if (!isPlainObject(channels)) return null;

    const h = channels.h;
    const s = channels.s;
    const l = channels.l;

    const validH = h == null || (Number.isFinite(h) && h >= 0 && h <= 359);
    const validS = s == null || (Number.isFinite(s) && s >= 0 && s <= 100);
    const validL = l == null || (Number.isFinite(l) && l >= 0 && l <= 100);
    if (!validH || !validS || !validL) return null;

    result[partName] = {
      h: h == null ? null : Math.round(h),
      s: s == null ? null : Math.round(s),
      l: l == null ? null : Math.round(l),
    };
  }

  return result;
}

function cloneColorAdjustments(value) {
  return Object.fromEntries(
    Object.keys(DEFAULT_ENABLED_ATTRIBUTES).map((partName) => [
      partName,
      {
        ...COLOR_CHANNEL_DEFAULTS,
        ...(value?.[partName] ?? {}),
      },
    ]),
  );
}

function normalizeFavoriteState(value) {
  if (!isPlainObject(value)) return null;

  const shapeSeed = parseSafeSeedValue(value.shapeSeed);
  const colorSeed = parseSafeSeedValue(value.colorSeed);
  const enabled = normalizeBooleanAttributeMap(
    value.enabledAttributes,
    DEFAULT_ENABLED_ATTRIBUTES,
  );
  const flipped = normalizeBooleanAttributeMap(
    value.flippedAttributes,
    DEFAULT_FLIPPED_ATTRIBUTES,
  );
  const symmetric = normalizeBooleanAttributeMap(
    value.symmetricAttributes,
    DEFAULT_SYMMETRIC_ATTRIBUTES,
  );
  const colorAdjustments = isPlainObject(value.colorAdjustments)
    ? normalizeColorAdjustments(value.colorAdjustments)
    : createDefaultColorAdjustments();

  if (
    shapeSeed == null ||
    colorSeed == null ||
    !enabled ||
    !flipped ||
    !symmetric ||
    !colorAdjustments ||
    typeof value.headBobEnabled !== 'boolean' ||
    typeof value.terminalModeEnabled !== 'boolean'
  ) {
    return null;
  }

  return {
    shapeSeed,
    colorSeed,
    enabledAttributes: enabled,
    flippedAttributes: flipped,
    colorAdjustments,
    globalColorInvert:
      typeof value.globalColorInvert === 'boolean'
        ? value.globalColorInvert
        : false,
    symmetricAttributes: symmetric,
    headBobEnabled: value.headBobEnabled,
    neckGapEnabled: false,
    terminalModeEnabled: value.terminalModeEnabled,
  };
}

function createFavoriteRecord(state, options = {}) {
  const normalizedState = normalizeFavoriteState(state);
  if (!normalizedState) return null;

  const previewGlytchling =
    options.generatedGlytchling ??
    generateGlytchling(normalizedState.shapeSeed, {
      enabledAttributes: normalizedState.enabledAttributes,
      flippedAttributes: normalizedState.flippedAttributes,
      paletteSeed: normalizedState.colorSeed,
      symmetricAttributes: normalizedState.symmetricAttributes,
    });

  return {
    ...normalizedState,
    id: getFavoriteStateKey(normalizedState),
    name: normalizeNameValue(options.name) || previewGlytchling.name,
    preview: createFavoritePreviewDataUrl(normalizedState),
    savedAt:
      Number.isFinite(options.savedAt) && options.savedAt > 0
        ? options.savedAt
        : Date.now(),
  };
}

function normalizeImportedFavoriteRecord(value) {
  if (!isPlainObject(value)) return null;

  const parts = value.state?.parts;
  const modes = value.state?.modes;
  if (!isPlainObject(parts) || !isPlainObject(modes)) return null;

  const state = createDefaultShareState();
  const shapeSeed = parseSafeSeedValue(value.shape);
  const colorSeed = parseSafeSeedValue(value.color);

  if (shapeSeed == null || colorSeed == null) return null;

  for (const partName of Object.keys(DEFAULT_ENABLED_ATTRIBUTES)) {
    const encodedState = value.state?.parts?.[partName];
    if (![0, 1, 2, 3].includes(encodedState)) return null;

    if (encodedState !== 0) {
      applySharedPartState(state, partName, encodedState);
    }
  }

  if (typeof modes.crt !== 'boolean' || typeof modes.pulse !== 'boolean') {
    return null;
  }

  state.terminalModeEnabled = modes.crt;
  state.headBobEnabled = modes.pulse;

  const importedColors = isPlainObject(value.state?.colors)
    ? normalizeColorAdjustments(value.state.colors)
    : createDefaultColorAdjustments();
  if (!importedColors) return null;

  return createFavoriteRecord(
    {
      shapeSeed,
      colorSeed,
      enabledAttributes: state.enabledAttributes,
      flippedAttributes: state.flippedAttributes,
      colorAdjustments: importedColors,
      globalColorInvert:
        typeof value.state?.modes?.invrt === 'boolean'
          ? value.state.modes.invrt
          : false,
      symmetricAttributes: state.symmetricAttributes,
      headBobEnabled: state.headBobEnabled,
      neckGapEnabled: state.neckGapEnabled,
      terminalModeEnabled: state.terminalModeEnabled,
    },
    {
      name: value.name,
      savedAt: Date.parse(value.savedAt),
    },
  );
}

function loadFavoritesFromStorage() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((favorite) =>
        createFavoriteRecord(favorite, {
          name: favorite.name,
          savedAt: favorite.savedAt,
        }),
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function loadUserSettings() {
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    return {
      cryMuted:
        typeof parsed.cryMuted === 'boolean' ? parsed.cryMuted : undefined,
      inspectorDefaultOpen:
        typeof parsed.inspectorDefaultOpen === 'boolean'
          ? parsed.inspectorDefaultOpen
          : undefined,
    };
  } catch {
    return {};
  }
}

function persistUserSettings() {
  try {
    window.localStorage.setItem(
      USER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        cryMuted,
        inspectorDefaultOpen,
      }),
    );
  } catch {
    // Ignore storage failures so the app still works in private/restricted modes.
  }
}

function persistFavorites() {
  try {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites),
    );
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
    colorAdjustments: cloneColorAdjustments(colorAdjustments),
    globalColorInvert,
    symmetricAttributes: { ...symmetricAttributes },
    headBobEnabled,
    neckGapEnabled: false,
    terminalModeEnabled,
  };
}

function createFavoriteExportPayload() {
  return {
    version: FAVORITES_EXPORT_VERSION,
    app: 'glytchlings',
    exportedAt: new Date().toISOString(),
    specimens: favorites.map((favorite) => ({
      name: favorite.name,
      shape: favorite.shapeSeed,
      color: favorite.colorSeed,
      savedAt: new Date(favorite.savedAt).toISOString(),
      state: {
        parts: Object.fromEntries(
          Object.keys(DEFAULT_ENABLED_ATTRIBUTES).map((partName) => [
            partName,
            Number(encodeSharedPartState(partName, favorite) ?? 0),
          ]),
        ),
        colors: cloneColorAdjustments(favorite.colorAdjustments),
        modes: {
          gap: false,
          crt: favorite.terminalModeEnabled,
          invrt: favorite.globalColorInvert,
          pulse: favorite.headBobEnabled,
        },
      },
    })),
  };
}

function downloadFavoritesLog() {
  const payload = createFavoriteExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `glytchlings-specimen-log-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);

  setFavoritesStatus(
    `exported ${payload.specimens.length} specimen${payload.specimens.length === 1 ? '' : 's'}.`,
  );
  flashButtonContent(favoritesDownloadButton, 'Done');
}

async function importFavoritesLog(file) {
  if (!file) return;

  try {
    if (file.size > FAVORITES_IMPORT_MAX_BYTES) {
      throw new Error('Log file is too large to import.');
    }

    const raw = await file.text();
    const parsed = JSON.parse(raw);

    if (
      !isPlainObject(parsed) ||
      parsed.version !== FAVORITES_EXPORT_VERSION ||
      !Array.isArray(parsed.specimens)
    ) {
      throw new Error('Unsupported specimen log format.');
    }

    if (parsed.specimens.length > FAVORITES_LIMIT) {
      throw new Error(
        `Log file is too large. Specimen logs can hold up to ${FAVORITES_LIMIT} Glytchlings.`,
      );
    }

    let skippedCount = 0;
    let invalidCount = 0;
    const existingIds = new Set(favorites.map((favorite) => favorite.id));
    const importedFavorites = [];

    for (const specimen of parsed.specimens) {
      const normalizedFavorite = normalizeImportedFavoriteRecord(specimen);
      if (!normalizedFavorite) {
        invalidCount += 1;
        continue;
      }

      if (existingIds.has(normalizedFavorite.id)) {
        skippedCount += 1;
        continue;
      }

      existingIds.add(normalizedFavorite.id);
      importedFavorites.push(normalizedFavorite);
    }

    const remainingSlots = FAVORITES_LIMIT - favorites.length;
    if (importedFavorites.length > remainingSlots) {
      throw new Error(
        'Uploaded log is too large for the current collection. Delete some Glytchlings and try again.',
      );
    }

    favorites = [...importedFavorites, ...favorites];
    persistFavorites();
    renderFavoritesList();

    const summary = [
      `Imported ${importedFavorites.length}`,
      skippedCount
        ? `skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'}`
        : null,
      invalidCount
        ? `ignored ${invalidCount} invalid entr${invalidCount === 1 ? 'y' : 'ies'}`
        : null,
    ]
      .filter(Boolean)
      .join(' | ');

    setFavoritesStatus(
      summary ? summary.toLowerCase() : 'no specimens imported.',
    );
    flashButtonContent(favoritesUploadButton, 'Done');
  } catch (error) {
    setFavoritesStatus(
      error instanceof Error ? error.message : 'import failed.',
      true,
    );
    flashButtonContent(favoritesUploadButton, 'Error');
  } finally {
    favoritesImportInput.value = '';
  }
}

function getFavoriteStateKey(state) {
  return JSON.stringify({
    shapeSeed: state.shapeSeed,
    colorSeed: state.colorSeed,
    enabledAttributes: state.enabledAttributes,
    flippedAttributes: state.flippedAttributes,
    colorAdjustments: state.colorAdjustments,
    globalColorInvert: state.globalColorInvert,
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
const userSettings = loadUserSettings();

shareButton.dataset.defaultContent = COPY_ICON_SVG;
downloadButton.dataset.defaultContent = DOWNLOAD_ICON_SVG;
inspectorFavoriteButton.dataset.defaultContent =
  inspectorFavoriteButton.innerHTML;

let seed = initialUrlState.shapeSeed ?? randomSeed();
let paletteSeed = initialUrlState.colorSeed ?? randomSeed();
let basePaletteSeed = paletteSeed;
let t = 0;
let enabledAttributes = { ...initialUrlState.enabledAttributes };
let flippedAttributes = { ...initialUrlState.flippedAttributes };
let colorAdjustments =
  normalizeColorAdjustments(initialUrlState.colorAdjustments) ??
  createDefaultColorAdjustments();
let globalColorInvert = Boolean(initialUrlState.globalColorInvert);
let symmetricAttributes = { ...initialUrlState.symmetricAttributes };
let headBobEnabled = initialUrlState.headBobEnabled;
let inspectorView = 'shape';
let animationAttributes = Object.fromEntries(
  Object.keys(DEFAULT_ANIMATION_ATTRIBUTES).map((part) => [
    part,
    headBobEnabled,
  ]),
);
let cryMuted = userSettings.cryMuted ?? true;
let terminalModeEnabled = initialUrlState.terminalModeEnabled;
let glytchling = generateGlytchling(seed, {
  enabledAttributes,
  flippedAttributes,
  paletteSeed,
  symmetricAttributes,
});
let currentResolvedName = glytchling.name;
let hoveredPart = null;
let pinnedPart = null;
let favorites = loadFavoritesFromStorage();
let digitsMotionState = 'rest';
let digitsMotionType = 'inward';
let digitsMotionUntil = 0;
let treadMarchPhase = 0;
let treadMarchUntil = 0;
let treadWalkActive = false;
let treadWalkStepsRemaining = 0;
let bitsLiftActive = false;
let bitsLiftUntil = 0;
let nodeCompressActive = false;
let nodeCompressUntil = 0;
let desktopInspectorMinHeight = 0;
let inspectorDefaultOpen = userSettings.inspectorDefaultOpen ?? false;
let inspectorVisible = inspectorDefaultOpen;
let fullscreenOpen = false;

function formatFamilyLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomIntBetween(min, max) {
  return Math.round(randomBetween(min, max));
}

function normalizeNameValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_NAME_LENGTH);
}

ctx.imageSmoothingEnabled = false;
syncFavoritesUiState();

// Normalize values before displaying them in the inspector.
function formatTraitValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'present' : 'none';
  }

  return value;
}

function formatDisplayValue(value) {
  const normalized = String(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

function parseHslColor(color) {
  const match = color.match(/^hsl\((\d+),(\d+)%?,(\d+)%\)$/);
  if (!match) return null;

  return {
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
  };
}

function formatHslColor({ h, s, l }) {
  return `hsl(${h},${s}%,${l}%)`;
}

function invertHslColor(color) {
  const parsed = parseHslColor(color);
  if (!parsed) return color;

  return formatHslColor({
    h: (parsed.h + 180) % 360,
    s: parsed.s,
    l: 100 - parsed.l,
  });
}

function getBasePartColor(palette, partName) {
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

function getResolvedPartColor(
  palette,
  partName,
  adjustmentsMap = colorAdjustments,
  invertAll = globalColorInvert,
) {
  const baseColor = getBasePartColor(palette, partName);
  const parsed = parseHslColor(baseColor);
  if (!parsed) return baseColor;

  const adjustments = adjustmentsMap[partName] ?? COLOR_CHANNEL_DEFAULTS;
  const resolved = formatHslColor({
    h: adjustments.h == null ? parsed.h : adjustments.h,
    s: adjustments.s == null ? parsed.s : adjustments.s,
    l: adjustments.l == null ? parsed.l : adjustments.l,
  });

  return invertAll ? invertHslColor(resolved) : resolved;
}

function getPartColor(palette, partName) {
  return getResolvedPartColor(palette, partName);
}

function getDisplayedPartChannels(
  palette,
  partName,
  adjustmentsMap = colorAdjustments,
  invertAll = globalColorInvert,
) {
  const parsed = parseHslColor(
    getResolvedPartColor(palette, partName, adjustmentsMap, invertAll),
  );
  return parsed ?? { h: 0, s: 0, l: 0 };
}

function getStoredChannelValue(
  channel,
  displayedValue,
  invertAll = globalColorInvert,
) {
  if (!invertAll) return displayedValue;

  if (channel === 'h') {
    return (displayedValue + 180) % 360;
  }

  if (channel === 'l') {
    return 100 - displayedValue;
  }

  return displayedValue;
}

function resetColorEdits() {
  colorAdjustments = createDefaultColorAdjustments();
  globalColorInvert = false;
}

// De$yn𝓬 breaks away from the palette families by assigning each visible part
// a fully random H/S/L color override. The underlying base color seed is kept
// intact so Restore can return to the seeded palette later.
function desyncColorPalette() {
  colorAdjustments = Object.fromEntries(
    Object.keys(DEFAULT_ENABLED_ATTRIBUTES).map((partName) => [
      partName,
      {
        h: Math.floor(Math.random() * 360),
        s: Math.floor(Math.random() * 101),
        l: Math.floor(Math.random() * 101),
      },
    ]),
  );
  globalColorInvert = false;
  renderPartInspector(seed, glytchling);
}

// Keep shared control state in sync after any inspector or help-menu interaction.
function syncPresentationButtons() {
  headBobButton.classList.toggle(
    'isOn',
    Object.values(animationAttributes).every(Boolean),
  );
  helpMuteSettingButton.checked = cryMuted;
  helpInspectorSettingButton.checked = inspectorDefaultOpen;
  terminalModeButton.classList.toggle('isOn', terminalModeEnabled);
  invertColorButton.classList.toggle('isOn', globalColorInvert);
  symmetryAllButton.classList.toggle(
    'isOn',
    Object.values(symmetricAttributes).every(Boolean),
  );
}

// Cry families are weighted tendencies, not hard boxes. A family biases the
// waveform pool, pitch range, duration, sweep, crunch, noise, and tail style,
// but the seeded rolls inside those ranges still decide the exact sound.
//
// In simple terms:
// - chirper = bright and quick
// - growler = low and heavy
// - warbler = wobbly and melodic
// - buzzer = harsh and electronic
// - stutterer = choppy and glitchy
//
// Families also bias the short cry bookends. An intro or tail can appear
// before/after the main body, but those are still weighted tendencies rather
// than guarantees.
function getCryFamily(shapeSeed) {
  return seededPick(shapeSeed, 1199, [
    'chirper',
    'growler',
    'warbler',
    'buzzer',
    'stutterer',
  ]);
}

function getEnergyFamily(shapeSeed) {
  return seededPick(shapeSeed, 1399, [
    'slothish',
    'gentle',
    'steady',
    'lively',
    'zippy',
  ]);
}

function getEnergyProfile(shapeSeed) {
  const family = getEnergyFamily(shapeSeed);

  switch (family) {
    case 'slothish':
      return {
        family,
        domeSpeed: 0.58,
        digitsActive: [320, 500],
        digitsRest: [900, 1800],
        treadStep: [320, 450],
        treadNeutral: [360, 520],
        treadWalkSteps: [3, 6],
        treadRest: [1300, 2600],
        bitsActive: [220, 340],
        bitsRest: [1800, 3200],
        nodeActive: [240, 380],
        nodeRest: [4200, 6200],
      };
    case 'gentle':
      return {
        family,
        domeSpeed: 0.78,
        digitsActive: [260, 420],
        digitsRest: [700, 1450],
        treadStep: [280, 390],
        treadNeutral: [320, 450],
        treadWalkSteps: [4, 7],
        treadRest: [1100, 2200],
        bitsActive: [200, 300],
        bitsRest: [1450, 2600],
        nodeActive: [220, 340],
        nodeRest: [3400, 5200],
      };
    case 'lively':
      return {
        family,
        domeSpeed: 1.18,
        digitsActive: [150, 280],
        digitsRest: [260, 680],
        treadStep: [180, 280],
        treadNeutral: [220, 320],
        treadWalkSteps: [5, 9],
        treadRest: [600, 1200],
        bitsActive: [130, 240],
        bitsRest: [700, 1500],
        nodeActive: [160, 280],
        nodeRest: [2000, 3600],
      };
    case 'zippy':
      return {
        family,
        domeSpeed: 1.42,
        digitsActive: [110, 210],
        digitsRest: [150, 460],
        treadStep: [120, 220],
        treadNeutral: [150, 240],
        treadWalkSteps: [6, 10],
        treadRest: [360, 920],
        bitsActive: [100, 180],
        bitsRest: [420, 1000],
        nodeActive: [130, 230],
        nodeRest: [1500, 2800],
      };
    case 'steady':
    default:
      return {
        family,
        domeSpeed: 1,
        digitsActive: [220, 380],
        digitsRest: [420, 1240],
        treadStep: [250, 360],
        treadNeutral: [300, 420],
        treadWalkSteps: [4, 8],
        treadRest: [900, 1800],
        bitsActive: [170, 320],
        bitsRest: [1100, 2200],
        nodeActive: [180, 350],
        nodeRest: [2600, 4200],
      };
  }
}

function getNatureLabel(shapeSeed) {
  return `${formatFamilyLabel(getEnergyFamily(shapeSeed))} ${formatFamilyLabel(getCryFamily(shapeSeed))}`;
}

function getCryFamilyProfile(shapeSeed) {
  const family = getCryFamily(shapeSeed);

  switch (family) {
    case 'growler':
      return {
        family,
        waveforms: ['square', 'sawtooth', 'triangle'],
        pitchBase: 95,
        pitchRange: 240,
        durationBase: 260,
        durationRange: 360,
        sweepScale: 0.55,
        repeatMax: 2,
        noiseThreshold: 0.34,
        segmentBase: 2,
        segmentRange: 2,
        offsetScale: 100,
        jitterScale: 30,
        vibratoDepthBase: 2,
        vibratoDepthRange: 12,
        vibratoRateBase: 6,
        vibratoRateRange: 10,
        clickBase: 0.03,
        clickRange: 0.04,
        crunchBase: 6,
        crunchRange: 8,
        crushBase: 7,
        crushRange: 10,
        introTypes: ['thump', 'glitch', 'spark'],
        introChance: 0.64,
        tailTypes: ['grumble', 'spark', 'drop'],
        tailChance: 0.72,
        filterBase: 1200,
        filterRange: 1200,
      };
    case 'warbler':
      return {
        family,
        waveforms: ['triangle', 'sine', 'square'],
        pitchBase: 180,
        pitchRange: 360,
        durationBase: 180,
        durationRange: 280,
        sweepScale: 0.9,
        repeatMax: 3,
        noiseThreshold: 0.68,
        segmentBase: 4,
        segmentRange: 3,
        offsetScale: 120,
        jitterScale: 40,
        vibratoDepthBase: 10,
        vibratoDepthRange: 20,
        vibratoRateBase: 16,
        vibratoRateRange: 20,
        clickBase: 0.04,
        clickRange: 0.05,
        crunchBase: 2,
        crunchRange: 4,
        crushBase: 11,
        crushRange: 10,
        introTypes: ['chirp', 'whistle', 'spark'],
        introChance: 0.58,
        tailTypes: ['chirp', 'spark', 'whistle'],
        tailChance: 0.62,
        filterBase: 1800,
        filterRange: 1800,
      };
    case 'buzzer':
      return {
        family,
        waveforms: ['sawtooth', 'square', 'triangle'],
        pitchBase: 130,
        pitchRange: 330,
        durationBase: 200,
        durationRange: 300,
        sweepScale: 0.75,
        repeatMax: 3,
        noiseThreshold: 0.28,
        segmentBase: 4,
        segmentRange: 3,
        offsetScale: 160,
        jitterScale: 60,
        vibratoDepthBase: 3,
        vibratoDepthRange: 14,
        vibratoRateBase: 10,
        vibratoRateRange: 16,
        clickBase: 0.07,
        clickRange: 0.07,
        crunchBase: 4,
        crunchRange: 8,
        crushBase: 6,
        crushRange: 8,
        introTypes: ['spark', 'glitch', 'tick'],
        introChance: 0.52,
        tailTypes: ['spark', 'chirp', 'tick'],
        tailChance: 0.54,
        filterBase: 1600,
        filterRange: 1400,
      };
    case 'stutterer':
      return {
        family,
        waveforms: ['square', 'triangle', 'sawtooth'],
        pitchBase: 140,
        pitchRange: 300,
        durationBase: 150,
        durationRange: 220,
        sweepScale: 0.65,
        repeatMax: 3,
        noiseThreshold: 0.58,
        segmentBase: 5,
        segmentRange: 3,
        offsetScale: 180,
        jitterScale: 75,
        vibratoDepthBase: 2,
        vibratoDepthRange: 10,
        vibratoRateBase: 12,
        vibratoRateRange: 12,
        clickBase: 0.08,
        clickRange: 0.08,
        crunchBase: 7,
        crunchRange: 10,
        crushBase: 5,
        crushRange: 7,
        introTypes: ['tick', 'glitch', 'chirp'],
        introChance: 0.6,
        tailTypes: ['chirp', 'spark', 'tick'],
        tailChance: 0.48,
        filterBase: 1700,
        filterRange: 1500,
      };
    case 'chirper':
    default:
      return {
        family,
        waveforms: ['triangle', 'square', 'sine'],
        pitchBase: 210,
        pitchRange: 360,
        durationBase: 140,
        durationRange: 240,
        sweepScale: 1,
        repeatMax: 3,
        noiseThreshold: 0.72,
        segmentBase: 3,
        segmentRange: 3,
        offsetScale: 130,
        jitterScale: 45,
        vibratoDepthBase: 6,
        vibratoDepthRange: 16,
        vibratoRateBase: 14,
        vibratoRateRange: 18,
        clickBase: 0.04,
        clickRange: 0.05,
        crunchBase: 3,
        crunchRange: 5,
        crushBase: 10,
        crushRange: 10,
        introTypes: ['chirp', 'tick', 'whistle'],
        introChance: 0.68,
        tailTypes: ['chirp', 'spark', 'whistle'],
        tailChance: 0.66,
        filterBase: 2200,
        filterRange: 1600,
      };
  }
}

function getCryDefaults(shapeSeed) {
  const profile = getCryFamilyProfile(shapeSeed);
  const durationMs =
    profile.durationBase +
    Math.round(rng(shapeSeed + 1202) * profile.durationRange);
  return {
    family: profile.family,
    waveform: seededPick(shapeSeed, 1200, profile.waveforms),
    pitch:
      profile.pitchBase +
      Math.round(rng(shapeSeed + 1201) * profile.pitchRange),
    durationMs,
    sweep: Math.round(
      (rng(shapeSeed + 1203) * 2 - 1) * 240 * profile.sweepScale,
    ),
    repeat: 1 + Math.floor(rng(shapeSeed + 1204) * profile.repeatMax),
    noise: rng(shapeSeed + 1205) > profile.noiseThreshold,
    loFi: rng(shapeSeed + 1206) > 0.64,
    echo: rng(shapeSeed + 1207) > 0.71,
  };
}

function resetCryControls(shapeSeed) {
  renderCryWaveSignature(shapeSeed);
}

function syncCryControls(shapeSeed) {
  if (lastCrySeed !== shapeSeed) {
    resetCryControls(shapeSeed);
    lastCrySeed = shapeSeed;
    return;
  }

  renderCryWaveSignature(shapeSeed);
}

function getCrySettings(shapeSeed) {
  return getCryDefaults(shapeSeed);
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function createSeededNoise(seed) {
  let state = (Math.floor(seed) ^ 0xa5a5a5a5) >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function sampleWaveform(type, phase) {
  const wrapped = phase % 1;

  switch (type) {
    case 'triangle':
      return 1 - 4 * Math.abs(wrapped - 0.5);
    case 'sawtooth':
      return wrapped * 2 - 1;
    case 'sine':
      return Math.sin(wrapped * Math.PI * 2);
    case 'square':
    default:
      return wrapped < 0.5 ? 1 : -1;
  }
}

function renderCryTransient(
  type,
  progress,
  sampleRate,
  basePitch,
  phaseState,
  noise,
) {
  let freq = basePitch;
  let sample = 0;

  switch (type) {
    case 'chirp':
      freq = basePitch + 220 - progress * 280;
      phaseState.value += freq / sampleRate;
      sample = sampleWaveform('triangle', phaseState.value);
      break;
    case 'grumble':
      freq = Math.max(45, basePitch * 0.38 - progress * 40);
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('square', phaseState.value) * 0.7 +
        sampleWaveform('sawtooth', phaseState.value * 0.5) * 0.3;
      break;
    case 'spark':
      freq = basePitch + 110 - progress * 140;
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('sine', phaseState.value) * 0.45 +
        (noise() * 2 - 1) * 0.55;
      break;
    case 'tick':
      freq = basePitch + 180 - progress * 230;
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('square', phaseState.value) * 0.5 +
        Math.sign(sampleWaveform('sine', phaseState.value * 3.2)) * 0.35;
      break;
    case 'whistle':
      freq = basePitch + 260 - progress * 180;
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('sine', phaseState.value) * 0.78 +
        sampleWaveform('triangle', phaseState.value * 0.5) * 0.22;
      break;
    case 'drop':
      freq = Math.max(38, basePitch * 0.44 - progress * 95);
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('sawtooth', phaseState.value) * 0.55 +
        sampleWaveform('square', phaseState.value * 0.33) * 0.25;
      break;
    case 'thump':
      freq = Math.max(34, basePitch * 0.3 - progress * 120);
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('sine', phaseState.value) * 0.62 +
        sampleWaveform('triangle', phaseState.value * 0.25) * 0.22 +
        (noise() * 2 - 1) * 0.12;
      break;
    case 'glitch':
    default:
      freq = basePitch + 140 - progress * 120;
      phaseState.value += freq / sampleRate;
      sample =
        sampleWaveform('square', phaseState.value) * 0.4 +
        sampleWaveform('sawtooth', phaseState.value * 1.9) * 0.2 +
        (noise() * 2 - 1) * 0.4;
      break;
  }

  return sample;
}

function generateCrySampleData(sampleRate, shapeSeed, settings) {
  const profile = getCryFamilyProfile(shapeSeed);
  const repeatGapMs = 58;
  const introEnabled = rng(shapeSeed + 1247) > 1 - profile.introChance;
  const introType = seededPick(shapeSeed, 1248, profile.introTypes);
  const introDurationMs = introEnabled
    ? 35 + Math.round(rng(shapeSeed + 1249) * 95)
    : 0;
  const mainTotalMs =
    settings.repeat * settings.durationMs + (settings.repeat - 1) * repeatGapMs;
  const tailEnabled = rng(shapeSeed + 1250) > 1 - profile.tailChance;
  const tailType = seededPick(shapeSeed, 1251, profile.tailTypes);
  const tailDurationMs = tailEnabled
    ? 70 + Math.round(rng(shapeSeed + 1252) * 150)
    : 0;
  const totalMs = introDurationMs + mainTotalMs + tailDurationMs;
  const frameCount = Math.max(1, Math.floor(sampleRate * (totalMs / 1000)));
  const data = new Float32Array(frameCount);
  const noise = createSeededNoise(shapeSeed + 4000);
  const crunchHoldBase =
    profile.crunchBase +
    Math.floor(rng(shapeSeed + 1210) * profile.crunchRange);
  const crushLevelsBase =
    profile.crushBase + Math.floor(rng(shapeSeed + 1211) * profile.crushRange);
  const crunchHold = settings.loFi ? crunchHoldBase + 5 : crunchHoldBase;
  const crushLevels = settings.loFi
    ? Math.max(3, crushLevelsBase - 4)
    : crushLevelsBase;
  const segmentCount =
    profile.segmentBase +
    Math.floor(rng(shapeSeed + 1212) * profile.segmentRange);
  const segmentOffsets = Array.from({ length: segmentCount }, (_, index) =>
    Math.round((rng(shapeSeed + 1220 + index) * 2 - 1) * profile.offsetScale),
  );
  const vibratoDepth =
    profile.vibratoDepthBase +
    rng(shapeSeed + 1216) * profile.vibratoDepthRange;
  const vibratoRate =
    profile.vibratoRateBase + rng(shapeSeed + 1217) * profile.vibratoRateRange;
  const clickStrength =
    profile.clickBase + rng(shapeSeed + 1218) * profile.clickRange;
  const perRepeatPitchJitter = Array.from(
    { length: settings.repeat },
    (_, index) =>
      Math.round((rng(shapeSeed + 1230 + index) * 2 - 1) * profile.jitterScale),
  );
  let heldSample = 0;
  let phase = 0;
  const introPhase = { value: 0 };
  const tailPhase = { value: 0 };
  let holdCounter = 0;

  for (let i = 0; i < frameCount; i++) {
    const tMs = (i / sampleRate) * 1000;

    if (introEnabled && tMs < introDurationMs) {
      const introProgress = Math.min(1, tMs / introDurationMs);
      const introAttack = Math.min(1, introProgress / 0.12);
      const introDecay = Math.pow(1 - introProgress, 1.45);
      let introSample = renderCryTransient(
        introType,
        introProgress,
        sampleRate,
        settings.pitch,
        introPhase,
        noise,
      );

      introSample *= introAttack * introDecay * 0.26;
      data[i] = Math.max(-1, Math.min(1, introSample));
      continue;
    }

    const bodyMs = tMs - introDurationMs;

    if (tailEnabled && bodyMs >= mainTotalMs) {
      const tailProgress = Math.min(1, (bodyMs - mainTotalMs) / tailDurationMs);
      const tailAttack = Math.min(1, tailProgress / 0.18);
      const tailDecay = Math.pow(1 - tailProgress, 1.8);
      let tailSample = renderCryTransient(
        tailType,
        tailProgress,
        sampleRate,
        settings.pitch,
        tailPhase,
        noise,
      );

      tailSample *= tailAttack * tailDecay * 0.24;
      data[i] = Math.max(-1, Math.min(1, tailSample));
      continue;
    }

    const cycleMs = settings.durationMs + repeatGapMs;
    const repeatIndex = Math.min(
      settings.repeat - 1,
      Math.floor(bodyMs / cycleMs),
    );
    const localMs = bodyMs - repeatIndex * cycleMs;

    if (bodyMs >= mainTotalMs || localMs >= settings.durationMs) {
      data[i] = 0;
      continue;
    }

    const progress = localMs / settings.durationMs;
    const segmentIndex = Math.min(
      segmentCount - 1,
      Math.floor(progress * segmentCount),
    );
    const freq = Math.max(
      55,
      settings.pitch +
        settings.sweep * progress +
        segmentOffsets[segmentIndex] +
        perRepeatPitchJitter[repeatIndex] +
        Math.sin(progress * Math.PI * 2 * vibratoRate) * vibratoDepth,
    );
    const attack = Math.min(1, localMs / 16);
    const decay = Math.pow(1 - progress, 1.45);
    const gate =
      attack *
      decay *
      (0.84 + 0.16 * Math.sign(Math.sin(progress * Math.PI * 10)));

    phase += freq / sampleRate;

    if (holdCounter <= 0) {
      let sample = sampleWaveform(settings.waveform, phase);
      sample +=
        Math.sign(Math.sin(progress * Math.PI * 2 * (3 + segmentIndex))) *
        clickStrength;

      if (settings.noise) {
        sample += (noise() * 2 - 1) * 0.42;
      }

      sample *= gate;
      heldSample = Math.round(sample * crushLevels) / Math.max(1, crushLevels);
      holdCounter = crunchHold;
    }

    holdCounter -= 1;
    data[i] = Math.max(-1, Math.min(1, heldSample * 0.28));
  }

  return data;
}

function renderCryBuffer(audioCtx, shapeSeed, settings) {
  const data = generateCrySampleData(audioCtx.sampleRate, shapeSeed, settings);
  const buffer = audioCtx.createBuffer(1, data.length, audioCtx.sampleRate);
  buffer.getChannelData(0).set(data);
  return buffer;
}

function renderCryWaveSignature(shapeSeed) {
  const previewSampleRate = 6000;
  const settings = getCrySettings(shapeSeed);
  const samples = generateCrySampleData(previewSampleRate, shapeSeed, settings);
  const previewCtx = cryWaveCanvas.getContext('2d');
  const { width, height } = cryWaveCanvas;
  const midY = height / 2;
  const step = Math.max(1, Math.floor(samples.length / width));

  previewCtx.clearRect(0, 0, width, height);
  previewCtx.strokeStyle = 'rgba(82, 160, 96, 0.34)';
  previewCtx.beginPath();
  previewCtx.moveTo(0, midY);
  previewCtx.lineTo(width, midY);
  previewCtx.stroke();

  previewCtx.fillStyle = '#84ff92';
  for (let x = 0; x < width; x++) {
    let peak = 0;
    const start = x * step;
    const end = Math.min(samples.length, start + step);

    for (let i = start; i < end; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }

    const barHeight = Math.max(1, Math.round(peak * (height * 0.78)));
    previewCtx.fillRect(x, Math.round(midY - barHeight / 2), 1, barHeight);
  }
}

async function playCry(ignoreMute = false) {
  if (cryMuted && !ignoreMute) return;

  const audioCtx = ensureAudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const settings = getCrySettings(seed);
  const profile = getCryFamilyProfile(seed);
  const source = audioCtx.createBufferSource();
  source.buffer = renderCryBuffer(audioCtx, seed, settings);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value =
    profile.filterBase + rng(seed + 1240) * profile.filterRange;
  filter.Q.value = 0.7 + rng(seed + 1241) * 2.2;

  const outputGain = audioCtx.createGain();
  outputGain.gain.value = 0.92;

  source.connect(filter);
  filter.connect(outputGain);
  outputGain.connect(audioCtx.destination);

  if (settings.echo) {
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.11 + rng(seed + 1242) * 0.08;

    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.22 + rng(seed + 1243) * 0.14;

    const wet = audioCtx.createGain();
    wet.gain.value = 0.24;

    outputGain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(audioCtx.destination);
  }

  source.start(audioCtx.currentTime + 0.02);
}

// Rebuild the trait list from scratch any time the Glytchling or option state changes.
// That keeps the row controls, labels, current values, and shareable URL aligned
// with the active deterministic seed state.
function formatPartLabel(partName) {
  return `${partName.charAt(0).toUpperCase()}${partName.slice(1)}:`;
}

function renderShapeInspectorRows(traits) {
  for (const label of TRAIT_ORDER) {
    if (!(label in traits)) continue;

    const value = traits[label];
    const row = document.createElement('li');
    row.className = 'traitRow';
    row.dataset.part = label;

    const traitMeta = document.createElement('div');
    traitMeta.className = 'traitMeta';
    const traitSummary = document.createElement('div');
    traitSummary.className = 'traitSummary';

    const traitLabel = document.createElement('span');
    traitLabel.className = 'traitLabel';
    traitLabel.textContent = formatPartLabel(label);

    const traitValue = document.createElement('span');
    traitValue.className = 'traitValue';
    traitValue.textContent = formatDisplayValue(formatTraitValue(value));

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

      if (Object.hasOwn(animationAttributes, label)) {
        const animationLabel = document.createElement('label');
        animationLabel.className = 'partToggle';

        const animationInput = document.createElement('input');
        animationInput.type = 'checkbox';
        animationInput.checked = animationAttributes[label];
        animationInput.dataset.partAnim = label;

        const animationCopy = document.createElement('span');
        animationCopy.textContent = 'anim';

        animationLabel.append(animationInput, animationCopy);
        controlRow.append(animationLabel);
      }

      traitMeta.append(traitSummary, controlRow);
    } else {
      traitSummary.append(traitLabel, traitValue);
      traitMeta.append(traitSummary);
    }

    row.append(traitMeta);
    traitList.appendChild(row);
  }
}

function renderColorInspectorRows() {
  const expandedPart = pinnedPart;

  for (const label of TRAIT_ORDER) {
    const row = document.createElement('li');
    row.className = 'traitRow';
    row.dataset.part = label;

    const traitMeta = document.createElement('div');
    traitMeta.className = 'traitMeta';
    const traitSummary = document.createElement('div');
    traitSummary.className = 'traitSummary';

    const traitLabel = document.createElement('span');
    traitLabel.className = 'traitLabel';
    traitLabel.textContent = formatPartLabel(label);

    const traitValue = document.createElement('span');
    traitValue.className = 'traitValue';
    traitValue.textContent = getPartColor(glytchling.palette, label);

    traitSummary.append(traitLabel, traitValue);
    traitMeta.append(traitSummary);

    if (expandedPart === label) {
      const controlRow = document.createElement('div');
      controlRow.className = 'partControls colorControls';

      const visibleChannels = getDisplayedPartChannels(
        glytchling.palette,
        label,
      );
      const channels = [
        ['h', 0, 359, visibleChannels.h],
        ['s', 0, 100, visibleChannels.s],
        ['l', 0, 100, visibleChannels.l],
      ];

      for (const [channel, min, max, value] of channels) {
        const sliderLabel = document.createElement('label');
        sliderLabel.className = 'partToggle';

        const sliderCopy = document.createElement('span');
        sliderCopy.textContent = channel;

        const sliderInput = document.createElement('input');
        sliderInput.type = 'range';
        sliderInput.min = String(min);
        sliderInput.max = String(max);
        sliderInput.value = String(value);
        sliderInput.dataset.colorPart = label;
        sliderInput.dataset.colorChannel = channel;

        sliderLabel.append(sliderCopy, sliderInput);
        controlRow.append(sliderLabel);
      }

      traitMeta.append(controlRow);
    }

    row.append(traitMeta);
    traitList.appendChild(row);
  }
}

function appendIdentityRow(label, value) {
  const row = document.createElement('li');
  row.className = 'identityRow';

  const labelEl = document.createElement('span');
  labelEl.className = 'identityLabel';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'identityValue';
  valueEl.textContent = String(value);

  row.append(labelEl, valueEl);
  traitList.appendChild(row);
}

function getGeneratedNameForCurrentState() {
  return generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  }).name;
}

function getCanonicalTraitsForCurrentState() {
  return generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes: Object.fromEntries(
      Object.keys(DEFAULT_FLIPPED_ATTRIBUTES).map((partName) => [
        partName,
        false,
      ]),
    ),
    paletteSeed,
    symmetricAttributes: Object.fromEntries(
      Object.keys(DEFAULT_SYMMETRIC_ATTRIBUTES).map((partName) => [
        partName,
        true,
      ]),
    ),
  }).traits;
}

function renderIdentityInspectorRows(seed, traits) {
  appendIdentityRow('Shape Seed:', Math.floor(seed));
  appendIdentityRow('Color Seed:', Math.floor(paletteSeed));
  appendIdentityRow('Energy:', formatFamilyLabel(getEnergyFamily(seed)));
  appendIdentityRow('Cry:', formatFamilyLabel(getCryFamily(seed)));

  for (const label of TRAIT_ORDER) {
    if (!(label in traits)) continue;
    appendIdentityRow(
      formatPartLabel(label),
      formatDisplayValue(formatTraitValue(traits[label])),
    );
  }
}

function renderTraitInspector(seed, traits) {
  syncUrlState();
  shapeSeedInput.value = Math.floor(seed);
  colorSeedInput.value = Math.floor(paletteSeed);
  identityNameInput.value = currentResolvedName;
  traitList.innerHTML = '';

  shapeInspectorTab.classList.toggle('isOn', inspectorView === 'shape');
  colorInspectorTab.classList.toggle('isOn', inspectorView === 'color');
  identityInspectorTab.classList.toggle('isOn', inspectorView === 'identity');
  shapeInspectorTab.setAttribute(
    'aria-selected',
    String(inspectorView === 'shape'),
  );
  colorInspectorTab.setAttribute(
    'aria-selected',
    String(inspectorView === 'color'),
  );
  identityInspectorTab.setAttribute(
    'aria-selected',
    String(inspectorView === 'identity'),
  );
  shapeInspectorControls.hidden = inspectorView !== 'shape';
  colorInspectorControls.hidden = inspectorView !== 'color';
  identityInspectorControls.hidden = inspectorView !== 'identity';

  if (inspectorView === 'color') {
    renderColorInspectorRows();
    return;
  }

  if (inspectorView === 'identity') {
    renderIdentityInspectorRows(seed, traits);
    return;
  }

  renderShapeInspectorRows(traits);
}

function syncInspectorPanelHeight() {
  if (!inspectorPanel || !inspectorVisible) return;

  if (window.innerWidth <= 780) {
    inspectorPanel.style.minHeight = '';
    return;
  }

  if (inspectorView !== 'identity') {
    desktopInspectorMinHeight = Math.max(
      desktopInspectorMinHeight,
      inspectorPanel.offsetHeight,
    );
  }

  if (desktopInspectorMinHeight > 0) {
    inspectorPanel.style.minHeight = `${desktopInspectorMinHeight}px`;
  }
}

function setInspectorVisible(nextVisible) {
  inspectorVisible = Boolean(nextVisible);
  inspectorPanel.hidden = !inspectorVisible;
  showInspectorButton.hidden = inspectorVisible;
  showInspectorButton.setAttribute('aria-hidden', String(inspectorVisible));

  if (inspectorVisible) {
    syncInspectorPanelHeight();
  }
}

// Hover is temporary focus; pin is persistent focus. This helper resolves which
// one currently "wins" for the main canvas and sidebar row styling.
function getActivePart() {
  return hoveredPart ?? pinnedPart;
}

function partHasPixels(partMask) {
  return partMask.some((row) => row.some(Boolean));
}

function getDrawY(y, headOffset) {
  return y < DOME_HEIGHT ? y + headOffset : y;
}

function getPartDrawY(partName, y, headOffset, digitsDrop = 0, bitsLift = 0) {
  const drawY = getDrawY(y, headOffset);

  if (partName === 'digits' && digitsDrop > 0) {
    return drawY + digitsDrop;
  }

  if (partName === 'bits' && bitsLift > 0) {
    return drawY - bitsLift;
  }

  return drawY;
}

function getDrawX(partName, x, digitsInset = 0) {
  if (partName === 'digits' && digitsInset > 0) {
    return x < WIDTH / 2 ? x + digitsInset : x - digitsInset;
  }

  return x;
}

function getTreadYOffset(x, treadPhase = 0) {
  if (treadPhase === 0 || treadPhase === 2) {
    return 0;
  }

  const isLeftLeg = (x >= 0 && x <= 1) || (x >= 7 && x <= 8);
  const isRightLeg = (x >= 3 && x <= 4) || (x >= 10 && x <= 11);

  if (!isLeftLeg && !isRightLeg) {
    return 0;
  }

  if (treadPhase === 1) {
    return isLeftLeg ? -1 : 1;
  }

  return isLeftLeg ? 1 : -1;
}

function getNodeCompressedX(x, nodeCompress = 0) {
  if (!nodeCompress) return x;

  if (x >= 3 && x <= 5) {
    return x + 1;
  }

  if (x >= 6 && x <= 8) {
    return x - 1;
  }

  return x;
}

function buildTerminalIntensityMap(
  parts,
  headOffset,
  digitsInset = 0,
  digitsDrop = 0,
  treadPhase = 0,
  bitsLift = 0,
  nodeCompress = 0,
) {
  const intensityMap = new Map();

  for (const partName of DRAW_ORDER) {
    const partMask = parts[partName];
    if (!partMask || !partHasPixels(partMask)) continue;

    for (let y = 0; y < partMask.length; y++) {
      for (let x = 0; x < partMask[y].length; x++) {
        if (!partMask[y][x]) continue;

        const nodeX =
          partName === 'node' ? getNodeCompressedX(x, nodeCompress) : x;
        const treadYOffset =
          partName === 'treads' ? getTreadYOffset(x, treadPhase) : 0;
        const key = `${getDrawX(partName, nodeX, digitsInset)},${getPartDrawY(partName, y, headOffset, digitsDrop, bitsLift) + treadYOffset}`;
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

function drawColorPartPreview(canvas, partMask, color) {
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
  const { name, parts } = glytchling;
  const canonicalTraits = getCanonicalTraitsForCurrentState();

  nameValue.textContent = name;
  natureValue.textContent = getNatureLabel(seed);
  renderTraitInspector(seed, canonicalTraits);

  for (const row of traitList.querySelectorAll('.traitRow')) {
    const part = row.dataset.part;

    if (!part || !parts[part]) continue;

    const preview = document.createElement('canvas');
    preview.className = 'traitPreview';
    if (inspectorView === 'color') {
      preview.classList.add('colorPreview');
    }
    preview.width = (WIDTH + 2) * PART_PREVIEW_PIXEL;
    preview.height = (HEIGHT + 2) * PART_PREVIEW_PIXEL;

    if (inspectorView === 'color') {
      drawColorPartPreview(
        preview,
        parts[part],
        getPartColor(glytchling.palette, part),
      );
    } else {
      drawPartPreview(preview, parts[part], '#7dff8f');
    }
    row.prepend(preview);
  }

  updateTraitRowStates();
  syncPresentationButtons();
  syncCryControls(seed);
  renderFavoritesList();
  syncInspectorPanelHeight();
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
  const getPreviewDrawY = (y) => y;

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
          previewCtx.fillStyle = getResolvedPartColor(
            previewGlytchling.palette,
            partName,
            state.colorAdjustments,
            state.globalColorInvert,
          );
          previewCtx.fillRect(drawX, absoluteY, previewPixel, previewPixel);
        }
      }
    }
  }

  return previewCanvas.toDataURL('image/png');
}

function renderFavoritesList() {
  favoritesList.innerHTML = '';
  syncFavoritesUiState();
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
    deleteButton.innerHTML = `
      <svg class="buttonIcon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M5 1h6l1 2h3v2H1V3h3l1-2zm-1 5h2v6H4V6zm3 0h2v6H7V6zm3 0h2v6h-2V6zM3 13h10v1H3v-1z"
        />
      </svg>
    `;

    row.append(loadButton, deleteButton);
    item.append(row);
    favoritesList.append(item);
  }
}

// Draw one part mask into the main canvas, applying the current presentation
// settings such as pulse motion and the optional removal of the dome/core gap.
function drawPartMask(
  partName,
  partMask,
  headOffset,
  color,
  intensityMap = null,
  digitsInset = 0,
  digitsDrop = 0,
  treadPhase = 0,
  bitsLift = 0,
  nodeCompress = 0,
) {
  for (let y = 0; y < partMask.length; y++) {
    for (let x = 0; x < partMask[y].length; x++) {
      if (!partMask[y][x]) continue;

      const nodeX =
        partName === 'node' ? getNodeCompressedX(x, nodeCompress) : x;
      const treadYOffset =
        partName === 'treads' ? getTreadYOffset(x, treadPhase) : 0;
      const drawY =
        getPartDrawY(partName, y, headOffset, digitsDrop, bitsLift) +
        treadYOffset;
      const drawXGrid = getDrawX(partName, nodeX, digitsInset);

      const drawX = drawXGrid * PIXEL + glytchlingOffsetX;
      const absoluteY = drawY * PIXEL + glytchlingOffsetY;

      if (terminalModeEnabled) {
        const overlapCount = intensityMap?.get(`${drawXGrid},${drawY}`) ?? 1;
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
function drawGlytchling(
  glytchling,
  headOffset = 0,
  digitsInset = 0,
  digitsDrop = 0,
  treadPhase = 0,
  bitsLift = 0,
  nodeCompress = 0,
) {
  const { parts } = glytchling;
  const activePart = getActivePart();
  const intensityMap = terminalModeEnabled
    ? buildTerminalIntensityMap(
        parts,
        headOffset,
        digitsInset,
        digitsDrop,
        treadPhase,
        bitsLift,
        nodeCompress,
      )
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
    drawPartMask(
      partName,
      partMask,
      headOffset,
      color,
      intensityMap,
      digitsInset,
      digitsDrop,
      treadPhase,
      bitsLift,
      nodeCompress,
    );
  }
}

function getDigitsMotion(now) {
  const profile = getEnergyProfile(seed);

  if (now >= digitsMotionUntil) {
    if (digitsMotionState === 'rest') {
      digitsMotionState = 'active';
      digitsMotionType = Math.random() < 0.5 ? 'inward' : 'down';
      digitsMotionUntil = now + randomBetween(...profile.digitsActive);
    } else {
      digitsMotionState = 'rest';
      digitsMotionUntil = now + randomBetween(...profile.digitsRest);
    }
  }

  if (digitsMotionState !== 'active') {
    return { inset: 0, drop: 0 };
  }

  return digitsMotionType === 'inward'
    ? { inset: 1, drop: 0 }
    : { inset: 0, drop: 1 };
}

function getTreadMarchPhase(now) {
  const profile = getEnergyProfile(seed);

  if (now >= treadMarchUntil) {
    if (!treadWalkActive) {
      treadWalkActive = true;
      treadWalkStepsRemaining = randomIntBetween(...profile.treadWalkSteps);
      treadMarchPhase = 1;
      treadMarchUntil = now + randomBetween(...profile.treadStep);
      return treadMarchPhase;
    }

    if (treadMarchPhase === 0 || treadMarchPhase === 2) {
      treadWalkStepsRemaining -= 1;
      if (treadWalkStepsRemaining <= 0) {
        treadWalkActive = false;
        treadMarchPhase = 0;
        treadMarchUntil = now + randomBetween(...profile.treadRest);
        return treadMarchPhase;
      }
    }

    treadMarchPhase = (treadMarchPhase + 1) % 4;
    const isRestPhase = treadMarchPhase === 0 || treadMarchPhase === 2;
    treadMarchUntil =
      now +
      randomBetween(
        ...(isRestPhase ? profile.treadNeutral : profile.treadStep),
      );
  }

  return treadMarchPhase;
}

function getBitsLift(now) {
  const profile = getEnergyProfile(seed);

  if (now >= bitsLiftUntil) {
    if (!bitsLiftActive) {
      bitsLiftActive = true;
      bitsLiftUntil = now + randomBetween(...profile.bitsActive);
    } else {
      bitsLiftActive = false;
      bitsLiftUntil = now + randomBetween(...profile.bitsRest);
    }
  }

  return bitsLiftActive ? 1 : 0;
}

function getNodeCompress(now) {
  const profile = getEnergyProfile(seed);

  if (now >= nodeCompressUntil) {
    if (!nodeCompressActive) {
      nodeCompressActive = true;
      nodeCompressUntil = now + randomBetween(...profile.nodeActive);
    } else {
      nodeCompressActive = false;
      nodeCompressUntil = now + randomBetween(...profile.nodeRest);
    }
  }

  return nodeCompressActive ? 1 : 0;
}

function applyResolvedName(nextGlytchling, nextName = currentResolvedName) {
  const resolvedName = normalizeNameValue(nextName) || nextGlytchling.name;

  currentResolvedName = resolvedName;
  return {
    ...nextGlytchling,
    name: resolvedName,
  };
}

// The idle animation is intentionally subtle: it settles downward and returns,
// rather than constantly bouncing, to keep the sprite feeling alive but calm.
function getHeadOffset(time) {
  const profile = getEnergyProfile(seed);
  const settle = (Math.sin(time * profile.domeSpeed) + 1) / 2;
  const secondarySettle =
    (Math.sin(time * profile.domeSpeed * 0.43 + 1.4) + 1) / 2;

  return Math.round(settle * 0.7 + secondarySettle * 0.3);
}

function animate() {
  t += 0.018;

  const headOffset = animationAttributes.dome ? getHeadOffset(t) : 0;
  const now = performance.now();
  const digitsMotion = !animationAttributes.digits
    ? { inset: 0, drop: 0 }
    : getDigitsMotion(now);
  const treadPhase = !animationAttributes.treads ? 0 : getTreadMarchPhase(now);
  const bitsLift = !animationAttributes.bits ? 0 : getBitsLift(now);
  const nodeCompress = !animationAttributes.node ? 0 : getNodeCompress(now);
  drawGlytchling(
    glytchling,
    headOffset,
    digitsMotion.inset,
    digitsMotion.drop,
    treadPhase,
    bitsLift,
    nodeCompress,
  );

  if (fullscreenOpen) {
    fullscreenCtx.clearRect(
      0,
      0,
      fullscreenCanvas.width,
      fullscreenCanvas.height,
    );
    fullscreenCtx.drawImage(canvas, 0, 0);
  }

  requestAnimationFrame(animate);
}

// Spawn creates a brand new specimen: new shape and color seeds, plus the
// default readable toggle baseline across shape, color, and animation state.
function spawnGlytchling() {
  seed = randomSeed();
  paletteSeed = randomSeed();
  basePaletteSeed = paletteSeed;
  enabledAttributes = { ...DEFAULT_ENABLED_ATTRIBUTES };
  flippedAttributes = { ...DEFAULT_FLIPPED_ATTRIBUTES };
  symmetricAttributes = { ...DEFAULT_SYMMETRIC_ATTRIBUTES };
  animationAttributes = { ...DEFAULT_ANIMATION_ATTRIBUTES };
  headBobEnabled = DEFAULT_HEAD_BOB_ENABLED;
  terminalModeEnabled = DEFAULT_TERMINAL_MODE_ENABLED;
  resetColorEdits();
  glytchling = applyResolvedName(
    generateGlytchling(seed, {
      enabledAttributes,
      flippedAttributes,
      paletteSeed,
      symmetricAttributes,
    }),
    null,
  );
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
  playCry();
}

// Reshape rolls only the shape seed. The current palette seed and current
// toggle state stay intact so the user can explore new bodies within the same
// current setup.
function reshapeGlytchling() {
  setGlytchlingSeed(randomSeed());
}

// Load a known shape while preserving the current palette seed and option state.
function setGlytchlingSeed(
  nextSeed,
  playSound = true,
  preserveName = false,
  preserveInspectorState = false,
) {
  if (!Number.isFinite(nextSeed)) return;

  seed = nextSeed;
  const nextGlytchling = generateGlytchling(seed, {
    enabledAttributes,
    flippedAttributes,
    paletteSeed,
    symmetricAttributes,
  });
  glytchling = applyResolvedName(
    nextGlytchling,
    preserveName ? currentResolvedName : null,
  );
  hoveredPart = null;
  if (!preserveInspectorState) {
    pinnedPart = null;
  }
  renderPartInspector(seed, glytchling);
  if (playSound) {
    playCry();
  }
}

// Load a known palette while preserving the current Glytchling structure.
function setColorSeed(nextSeed, updateBase = true) {
  if (!Number.isFinite(nextSeed)) return;

  paletteSeed = nextSeed;
  if (updateBase) {
    basePaletteSeed = nextSeed;
  }
  resetColorEdits();
  glytchling = applyResolvedName(
    generateGlytchling(seed, {
      enabledAttributes,
      flippedAttributes,
      paletteSeed,
      symmetricAttributes,
    }),
  );
  renderPartInspector(seed, glytchling);
}

// Recolor keeps the current shape and options, but rolls a fresh deterministic palette.
function recolorGlytchling() {
  setColorSeed(randomSeed(), true);
}

function restoreColorSeed() {
  terminalModeEnabled = false;
  setColorSeed(basePaletteSeed, false);
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
  const safeName =
    sanitizeFilenamePart(glytchling.name || 'glytchling') || 'glytchling';

  link.href = canvas.toDataURL('image/png');
  link.download = `${safeName}-shape-${Math.floor(seed)}-color-${Math.floor(paletteSeed)}.png`;
  link.click();
  flashButtonContent(downloadButton, CHECK_ICON_SVG);
}

function applySavedState(state) {
  seed = state.shapeSeed;
  paletteSeed = state.colorSeed;
  basePaletteSeed = paletteSeed;
  enabledAttributes = { ...state.enabledAttributes };
  flippedAttributes = { ...state.flippedAttributes };
  colorAdjustments =
    normalizeColorAdjustments(state.colorAdjustments) ??
    createDefaultColorAdjustments();
  globalColorInvert = Boolean(state.globalColorInvert);
  symmetricAttributes = { ...state.symmetricAttributes };
  headBobEnabled = state.headBobEnabled;
  animationAttributes = Object.fromEntries(
    Object.keys(DEFAULT_ANIMATION_ATTRIBUTES).map((part) => [
      part,
      headBobEnabled,
    ]),
  );
  terminalModeEnabled = state.terminalModeEnabled;

  glytchling = applyResolvedName(
    generateGlytchling(seed, {
      enabledAttributes,
      flippedAttributes,
      paletteSeed,
      symmetricAttributes,
    }),
    state.name,
  );
  hoveredPart = null;
  pinnedPart = null;
  renderPartInspector(seed, glytchling);
  renderFavoritesList();
}

function saveCurrentFavorite() {
  if (favorites.length >= FAVORITES_LIMIT) {
    setFavoritesStatus(
      'log is full. delete some glytchlings to save new ones.',
      true,
    );
    flashButtonContent(inspectorFavoriteButton, CLOSE_ICON_SVG);
    return;
  }

  const state = getCurrentStateSnapshot();
  const favorite = createFavoriteRecord(state, {
    name: glytchling.name,
    generatedGlytchling: glytchling,
    savedAt: Date.now(),
  });
  if (!favorite) return;

  favorites = [
    favorite,
    ...favorites.filter((entry) => entry.id !== favorite.id),
  ];
  persistFavorites();
  renderFavoritesList();
  setFavoritesStatus('specimen saved.');
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
  setFavoritesStatus('specimen removed.');
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
  animationAttributes = Object.fromEntries(
    Object.keys(animationAttributes).map((part) => [part, randomBoolean()]),
  );
  headBobEnabled = randomBoolean();

  glytchling = applyResolvedName(
    generateGlytchling(seed, {
      enabledAttributes,
      flippedAttributes,
      paletteSeed,
      symmetricAttributes,
    }),
  );
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
  animationAttributes = Object.fromEntries(
    Object.keys(animationAttributes).map((part) => [part, true]),
  );
  headBobEnabled = true;

  glytchling = applyResolvedName(
    generateGlytchling(seed, {
      enabledAttributes,
      flippedAttributes,
      paletteSeed,
      symmetricAttributes,
    }),
  );
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
  if (event.target.closest('.partControls')) {
    return;
  }

  const row = event.target.closest('.traitRow');
  if (!row) return;

  const part = row.dataset.part;
  pinnedPart = pinnedPart === part ? null : part;
  if (inspectorView === 'color') {
    renderPartInspector(seed, glytchling);
    return;
  }
  updateTraitRowStates();
});

// Toolbar interactions:
// - Spawn rolls a new Glytchling
// - Recolor rolls only the palette
// - shape/color forms load explicit seeds
// - the presentation buttons update only the renderer, not the generator
spawnButton.addEventListener('click', spawnGlytchling);
favoritesButton.addEventListener('click', () => {
  setFavoritesOpen(true);
});
helpButton.addEventListener('click', () => {
  setHelpOpen(true);
});
shapeInspectorTab.addEventListener('click', () => {
  inspectorView = 'shape';
  renderPartInspector(seed, glytchling);
});
colorInspectorTab.addEventListener('click', () => {
  inspectorView = 'color';
  renderPartInspector(seed, glytchling);
});
identityInspectorTab.addEventListener('click', () => {
  inspectorView = 'identity';
  renderPartInspector(seed, glytchling);
});

window.addEventListener('resize', () => {
  syncInspectorPanelHeight();
  if (fullscreenOpen) {
    updateFullscreenCanvasSize();
  }
});
showInspectorButton.addEventListener('click', () => {
  setInspectorVisible(true);
});
hideInspectorButton.addEventListener('click', () => {
  setInspectorVisible(false);
});
identityNameForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const nextName = identityNameInput.value.trim();
  if (!nextName) {
    identityNameInput.value = currentResolvedName;
    return;
  }

  glytchling = applyResolvedName(glytchling, nextName);
  renderPartInspector(seed, glytchling);
});
restoreNameButton.addEventListener('click', () => {
  glytchling = applyResolvedName(glytchling, getGeneratedNameForCurrentState());
  renderPartInspector(seed, glytchling);
});
regenerateButton.addEventListener('click', reshapeGlytchling);
recolorButton.addEventListener('click', recolorGlytchling);
desyncColorButton.addEventListener('click', desyncColorPalette);
restoreColorButton.addEventListener('click', restoreColorSeed);
shareButton.addEventListener('click', copyGlytchlingLink);
downloadButton.addEventListener('click', downloadGlytchlingImage);
glitchButton.addEventListener('click', glitchGlytchlingOptions);
restoreButton.addEventListener('click', restoreGlytchlingOptions);
inspectorFavoriteButton.addEventListener('click', saveCurrentFavorite);
playCryButton.addEventListener('click', () => {
  playCry(true);
});
favoritesUploadButton.addEventListener('click', () => {
  favoritesImportInput.click();
});
favoritesDownloadButton.addEventListener('click', downloadFavoritesLog);
favoritesCloseButton.addEventListener('click', () => {
  setFavoritesOpen(false);
});
favoritesImportInput.addEventListener('change', (event) => {
  importFavoritesLog(event.target.files?.[0] ?? null);
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
changelogButton.addEventListener('click', () => {
  setChangelogOpen(true);
});
changelogCloseButton.addEventListener('click', () => {
  setChangelogOpen(false);
});
changelogOverlay.addEventListener('click', (event) => {
  if (event.target === changelogOverlay) {
    setChangelogOpen(false);
  }
});
symmetryAllButton.addEventListener('click', () => {
  const nextValue = !Object.values(symmetricAttributes).every(Boolean);
  symmetricAttributes = Object.fromEntries(
    Object.keys(symmetricAttributes).map((part) => [part, nextValue]),
  );
  setGlytchlingSeed(seed, false, true);
});
headBobButton.addEventListener('click', () => {
  const nextValue = !Object.values(animationAttributes).every(Boolean);
  animationAttributes = Object.fromEntries(
    Object.keys(DEFAULT_ANIMATION_ATTRIBUTES).map((part) => [part, nextValue]),
  );
  headBobEnabled = nextValue;
  renderPartInspector(seed, glytchling);
  syncPresentationButtons();
});
helpMuteSettingButton.addEventListener('change', () => {
  cryMuted = helpMuteSettingButton.checked;
  persistUserSettings();
  syncPresentationButtons();
});
helpInspectorSettingButton.addEventListener('change', () => {
  inspectorDefaultOpen = helpInspectorSettingButton.checked;
  persistUserSettings();
  syncPresentationButtons();
});
fullscreenViewButton.addEventListener('change', () => {
  setFullscreenOpen(fullscreenViewButton.checked);
});
terminalModeButton.addEventListener('click', () => {
  terminalModeEnabled = !terminalModeEnabled;
  syncPresentationButtons();
});
invertColorButton.addEventListener('click', () => {
  globalColorInvert = !globalColorInvert;
  renderPartInspector(seed, glytchling);
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
    setGlytchlingSeed(seed, false, true, true);
    return;
  }

  const toggle = event.target.closest('[data-part-toggle]');
  if (toggle) {
    symmetricAttributes = {
      ...symmetricAttributes,
      [toggle.dataset.partToggle]: toggle.checked,
    };
    setGlytchlingSeed(seed, false, true, true);
    return;
  }

  const flipToggle = event.target.closest('[data-part-flip]');
  if (flipToggle) {
    flippedAttributes = {
      ...flippedAttributes,
      [flipToggle.dataset.partFlip]: flipToggle.checked,
    };
    setGlytchlingSeed(seed, false, true, true);
    return;
  }

  const animationToggle = event.target.closest('[data-part-anim]');
  if (animationToggle) {
    animationAttributes = {
      ...animationAttributes,
      [animationToggle.dataset.partAnim]: animationToggle.checked,
    };
    headBobEnabled = Object.values(animationAttributes).every(Boolean);
    renderPartInspector(seed, glytchling);
    return;
  }
});
traitList.addEventListener('input', (event) => {
  const slider = event.target.closest('[data-color-channel]');
  if (!slider) return;

  const partName = slider.dataset.colorPart;
  const channel = slider.dataset.colorChannel;
  if (!partName || !channel) return;

  const displayedValue = Number(slider.value);
  const storedValue = getStoredChannelValue(channel, displayedValue);

  colorAdjustments = {
    ...colorAdjustments,
    [partName]: {
      ...colorAdjustments[partName],
      [channel]: storedValue,
    },
  };
  const row = slider.closest('.traitRow');
  const value = row?.querySelector('.traitValue');
  if (value) {
    value.textContent = getPartColor(glytchling.palette, partName);
  }

  const preview = row?.querySelector('.traitPreview');
  if (preview) {
    drawColorPartPreview(
      preview,
      glytchling.parts[partName],
      getPartColor(glytchling.palette, partName),
    );
  }
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
fullscreenOverlay.addEventListener('click', () => {
  setFullscreenOpen(false);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (fullscreenOpen) {
      setFullscreenOpen(false);
      return;
    }

    if (favoritesOverlay.classList.contains('isOpen')) {
      setFavoritesOpen(false);
      return;
    }

    if (helpOverlay.classList.contains('isOpen')) {
      setHelpOpen(false);
      return;
    }

    if (changelogOverlay.classList.contains('isOpen')) {
      setChangelogOpen(false);
    }
  }
});
setInspectorVisible(inspectorVisible);
renderPartInspector(seed, glytchling);
syncPresentationButtons();
animate();
