# Claude Wrapped 2025 - Scratchpad

## Status: COMPLETE

## Data Source
- File: `../conversations.json` (~624KB)
- 37 conversations, 209 messages

## Results Summary
- **Total Chats:** 36
- **Messages Sent:** 106 (human)
- **Total Messages:** 209
- **Chattiest Day:** 2025-02-02 (14 messages)
- **Days Active:** 32
- **Em-dashes:** 14
- **Tool Use:** 9
- **Date Range:** 2024-09-10 to 2025-11-04
- **Archetype:** Learner (0.47 confidence)
- **Top Themes:** Creative, Coding, Writing
- **Top Phrases:** remix, citizenship, dhivehi, shopify

## Implementation Progress

### Phase 1: Project Setup
- [x] Create folder structure
- [x] Create SCRATCHPAD.md
- [x] Create extract.py
- [x] Create .gitignore

### Phase 2: Extraction Features
- [x] Basic stats (conversations, messages, dates)
- [x] Daily rollups (chattiest day)
- [x] Content analysis (em-dashes, tool_use, images)
- [x] Phrase extraction (n-grams)
- [x] Theme detection (8 categories)
- [x] Archetype classification (7 archetypes)

### Phase 3: Output Files
- [x] wrapped_summary.json (main stats + archetype + themes)
- [x] wrapped_daily.json (per-day message counts)
- [x] wrapped_conversations.json (per-conversation summaries)
- [x] wrapped_phrases.json (unigrams, bigrams, trigrams)
- [x] wrapped_themes.json (top 3 themes)

## Files Created
```
claude-wrapped/
├── .gitignore
├── SCRATCHPAD.md
├── extract.py
└── output/
    ├── wrapped_summary.json
    ├── wrapped_daily.json
    ├── wrapped_conversations.json
    ├── wrapped_phrases.json
    └── wrapped_themes.json
```

## Run Command
```bash
cd claude-wrapped && python3 extract.py
```

## Frontend Implementation

### Completed
- [x] Created `index.html` with 7 screens:
  1. Intro - "Your Year with Claude"
  2. Stats - Total chats, messages, chattiest day, em-dashes, tool use
  3. Archetype - Learner/Doer/Planner etc.
  4. Themes - Top 3 themes
  5. Phrases - Top phrases with counts
  6. Awards - Dynamic award based on archetype
  7. Thank You - Closing message

### Features
- Touch/click navigation (tap left/right)
- Swipe navigation
- Keyboard navigation (arrow keys)
- Navigation dots
- Floating stat coins with animations
- Gradient backgrounds per screen
- Auto-loads data from output/wrapped_summary.json

### To Run
```bash
cd claude-wrapped
python3 -m http.server 8000
# Open http://localhost:8000
```

### Future Enhancements
- [x] Add poem/story generation screen (AI-generated via Claude API)
- [x] Add fortune screen with randomized predictions (AI-generated via Claude API)
- [ ] Add mascot screen
- [ ] Screenshot/share functionality
- [ ] More elaborate animations

### AI Features (Added 2025-12-26)
- `auth.js` - OAuth/API key handling for Claude API
- Poem screen - AI-generated personalized poem based on user's stats
- Predictions screen - 4 AI-generated 2026 predictions
- Uses Anthropic API directly from browser with `dangerouslyAllowBrowser`
- Requires user's Anthropic API key (stored in sessionStorage)
