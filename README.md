# Glytchlings

<table>
  <tr>
    <td><img src="./images/AppHeroImage.png" alt="App Screenshot" /></td>
  </tr>
  <tr>
    <td><em>App Screenshot · ?shape=89706&color=255351</em></td>
  </tr>
</table>

## System Readout

Glytchlings is a seeded procedural Glytchling generator built as a small static web app.

Each Glytchling is generated from deterministic shape and color seeds. That means the same `shape` and `color` values will always recreate the same Glytchling and palette, which makes sharing, saving favorites, and reusing seeds across other projects straightforward.

View the live site: [heitzmike.github.io/glytchlings/](https://heitzmike.github.io/glytchlings/)
Like this project and want to help support? [Buy Me A Coffee!](https://buymeacoffee.com/heitzstudio)

## Specimen Variants

<table>
  <tr>
    <td><img src="./images/balanced-shape-453039-color-418255.png" alt="Balanced Glytchling" /></td>
    <td><img src="./images/crt-shape-888388-color-490005.png" alt="CRT Glytchling" /></td>
    <td><img src="./images/corrupt-shape-811152-color-633740.png" alt="Corrupt Glytchling" /></td>
  </tr>
  <tr>
    <td><em>Balanced · ?shape=453039&color=418255</em></td>
    <td><em>CRT · ?shape=888388&color=490005</em></td>
    <td><em>Corrupt · ?shape=811152&color=633740</em></td>
  </tr>
</table>

## Capabilities

- Generates mirrored or asymmetrical pixel Glytchlings from a shape seed
- Generates palettes independently from a color seed
- Builds each Glytchling from modular parts like dome, core, node, bits, digits, and treads
- Uses weighted randomness in several part regions so generated silhouettes feel varied without becoming pure noise
- Generates a deterministic glitchy name from seeded syllable pools with occasional character mutations
- Generates a deterministic cry for each Glytchling based on its shape seed
- Generates a deterministic `Type` from motion energy + cry family
- Lets you inspect each generated part individually through `Shape`, `Color`, and `Identity` Inspector tabs
- Supports per-part toggles for `on`, `sym`, `flip`, and `anim` where applicable
- Supports per-part H/S/L color editing plus fully random `De$yn𝓬` palette overrides
- Includes a local `Specimen Log` for adding favorite Glytchlings with their current Inspector settings
- Can copy a shareable URL with the current `shape`, `color`, and Inspector settings
- Can download the current render as a PNG
- Fullscreen display mode can be enabled from Help Menu

## Generation Logic

The app is split into a few small pieces:

- [`index.html`](./index.html): page shell, styling, and toolbar/inspector layout
- [`app.js`](./app.js): browser-side UI state, rendering, animation, share/download behavior, and URL syncing
- [`glytchlingGenerator.js`](./glytchlingGenerator.js): deterministic Glytchling generation, part masks, traits, palette generation, and naming

Generation is deterministic, so the same inputs always produce the same result:

- `shape` controls the Glytchling structure
- `color` controls the palette

Part generation is not uniform random. Several sections use weighted randomness inside fixed zones, which helps the results stay readable while still feeling surprising from seed to seed.

The current URL is kept in sync like this:

```text
?shape=123456&color=789012
```

When part and color edits are present, the URL can also include per-part overrides
and color state, such as:

```text
?shape=123456&color=789012&ca=do.h210_s62,di.l40,no.l28&iv=1
```

Opening that link later will restore the same Glytchling, color scheme, and
shared color edits.

## Controls

### User Settings

- `Mute Audio On Glytchling Generation`: saved user setting for automatic cry playback on spawn/load
- `Enable Inspector Panel On Start`: saved user setting for whether the Inspector opens on refresh
- `View Glytchling Fullscreen`: Enable Fullscreen display. Clicking anywhere or pressing Esc will exit fullscreen

### Spawn

- `SPAWN!`: generate a completely new shape and color seeded Glytchling with default Inspector toggles

### Glytchling Panel

- `Magnifying Glass Icon`: open the `Inspector Panel`
- `Name`: the generated Glytchling name or current nickname
- `Type`: combined motion energy family + cry family, such as `Lively Warbler`
- `Cry`: clickable waveform that plays the current Glytchling cry
- `Book Icon`: open the `Specimen Log`
- `Copy Icon`: copy a shareable URL with the current seeds and Inspector customizations
- `Download Icon`: save the current rendered Glytchling as a PNG
- `Bookmark Icon`: save the current Glytchling shape, color, and Inspector customizations to the log

## Inspector Panel

The inspector shows:

- `Shape` tab with anatomy values and toggles
- `Color` tab with per-part color previews and active-part H/S/L controls
- `Identity` tab with nickname editing and a specimen readout
- an `X` button to hide the Inspector panel

Each trait row includes:

- a mini preview mask
- the current generated value
- `on`: enable or disable that part
- `sym`: mirror that part left/right
- `flip`: swap the asymmetry side for that part
- `anim`: enable or disable animation for that part where motion exists

Hovering or clicking a trait highlights the corresponding area on the main Glytchling.

In the `Color` tab, pinning a row expands `H`, `S`, and `L` sliders for that
part. `INVRT` affects the visible result globally, while the part sliders edit
the part's stored color values directly.

Clicking the `Cry` waveform always plays the current Glytchling cry manually,
even if automatic cry playback is muted.

### Shape Tab

- `Load`: load a specific shape seed
- `Reshape`: generate a new shape seed while keeping the current color seed and current toggles
- `Cºrru_pt`: randomize the current trait and animation toggles without changing the current seeds
- `Sym`: toggle symmetry on all trait parts
- `Anim`: toggle animation on all supported parts
- `Restore`: return the current anatomy controls to a clean readable baseline

### Color Tab

- `Load`: load a specific color seed
- `Recolor`: generate a new base palette seed while keeping the current shape
- `De$yn𝓬`: assign fully random per-part H/S/L colors outside the palette-family system
- `CRT`: render the Glytchling in a terminal-style CRT view
- `INVRT`: invert the current specimen colors
- `Restore`: clear color edits and return to the current color seed's default palette

### Identity Tab

- `Nickname`: apply a custom name to the current Glytchling
- `Restore`: return the name to the current seed-generated default
- shows `Shape Seed`, `Color Seed`, `Energy`, `Cry`, and canonical part values

## Specimen Log

- `Collection` shows the saved Glytchling count out of the 200 limit
- `Last Action` shows the most recent log action
- saved entries can be loaded back into the app by clicking them
- `Trash Icon` deletes a saved Glytchling
- `Upload Log` imports a saved specimen log JSON file and rebuilds thumbnails locally
- `Download Log` exports the current specimen log as a JSON file
- clearing browser storage or cache on the device may remove the saved collection

## Local Boot

This project is completely static, so you do not need a build step or dependencies.

Clone the repo, then serve the folder with any simple local web server.

### Option 1: `npx serve`

```bash
npx serve
```

Then open the local URL shown in the terminal.

### Option 2: Python

```bash
python3 -m http.server
```

Then open:

```text
http://localhost:8000
```

### Option 3: VS Code Live Server

If you use VS Code, you can also open the folder and run it with the Live Server extension.

## System Notes

- Favicons and manifest files are already included for basic browser/mobile support
- The favicon is based on this Glytchling: `?shape=89706&color=255351`
- Clipboard copy may behave differently across browsers, so the app includes a fallback copy path for mobile compatibility
- The generator code is intentionally deterministic so seeds can be reused outside this app

## Origin

Developed by [HeitzMike](https://github.com/HeitzMike).

Glytchlings started as a way to explore deterministic generation for another project, then grew into its own weird little pixel experiment.

The project was inspired in part by the generative space-invader work of [f2d](https://github.com/f2d/random_ship_generator) and by the task fish tank of [MewTru](https://www.instagram.com/mewtru/).
