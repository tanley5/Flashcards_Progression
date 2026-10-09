# Flashcards Progression

Desktop flashcard app with a 3-deck graduated review system (modified Leitner).

## Decks

| Deck | Interval |
|------|----------|
| 1    | every 1 day |
| 2    | every 3 days |
| 3    | every 3 days |

Correct answers promote a card; a correct answer in Deck 3 marks it mastered. Incorrect answers demote one deck (floor at Deck 1).

## Stack

- Electron
- SQLite via `better-sqlite3`
- Plain HTML/CSS/JS renderer
- Jest unit tests for core logic

## Install the app (macOS)

1. Get the installer: build it locally (see [Build a DMG](#build-a-dmg)), or use an existing file such as  
   `dist/Flashcards Progression-1.0.0-arm64.dmg`.
2. Double-click the `.dmg` to open it.
3. Drag **Flashcards Progression** into the **Applications** folder.
4. Eject the DMG (optional).
5. Open the app from **Applications**.
   - First launch: **right-click** the app → **Open** → confirm **Open**.  
     macOS Gatekeeper warns because the build is not Apple-signed; you only need to do this once.
6. Later launches: open normally from Applications or Spotlight.

Your flashcard data is stored locally under your user Library  
(`~/Library/Application Support/flashcards-progression/`).

### Other platforms

| Platform | Command | Output |
|----------|---------|--------|
| Windows  | `npm run dist:win` | NSIS installer in `dist/` — run the `.exe` and follow the wizard |
| Linux    | `npm run dist:linux` | AppImage in `dist/` — make executable and run |

## Develop from source

```bash
npm install
npm test
npm start
```

`better-sqlite3` is native (pinned to 12.x for Electron 33 / Node 20 compatibility).  
`postinstall` / `pretest` rebuild for Node; `prestart` / `dist:*` force-rebuild for Electron.

## Build a DMG

```bash
npm install
npm run dist:mac    # macOS .dmg for this Mac’s architecture (e.g. arm64)
```

The DMG appears in `dist/` (for example `Flashcards Progression-1.0.0-arm64.dmg`).  
Then follow [Install the app](#install-the-app-macos).

```bash
npm run dist:win    # Windows NSIS installer (build on Windows)
npm run dist:linux  # Linux AppImage
```

## Tests

Core logic is covered with Jest against an in-memory SQLite DB (`npm test`). Write or update tests first when changing review/set/card behavior.

## Theme

UI follows the OS light/dark appearance (`prefers-color-scheme` + Electron `nativeTheme`).

## Remote

https://github.com/tanley5/Flashcards_Progression.git
