# Game Development Plans

## Current Games

### 1. Tetris (`tetris.html`) ✅
- Classic block-stacking puzzle
- Progressive difficulty (speed increases with level)
- Syncs with competition timer
- Score: lines cleared × level

### 2. Last Stand (`last-stand.html`) ✅
- Zombie survival game
- Move to dodge, weapons auto-fire
- Collect weapon drops, power-ups on the field
- Wave-based with dramatic announcements

---

## Planned Game: Mob Runner (2.5D)

### Concept
Mob Control / Crowd Runner style game with fake 3D perspective.

### Visual Style
```
        ╱ ═══════ ╲        ← Horizon (objects appear small)
       ╱           ╲
      ╱   🧟  💎    ╲      ← Objects spawn here
     ╱               ╲
    ╱    🧟    🔫     ╲    ← Objects get bigger as they approach
   ╱                   ╲
  ╱      🧟      💎     ╲  ← Near player (large)
 ╱                       ╲
╱═══════════════════════════╲
          🤠               ← Player at bottom (3 lanes)
```

### Core Mechanics
1. **Auto-running** - Player runs forward automatically (visual scroll)
2. **3 Lanes** - Swipe left/right to change lanes
3. **Collectibles** coming toward player:
   - 🔫 Weapons - Increase firepower
   - 💎 Coins/Gems - Bonus points
   - ❤️ Health - Restore HP
   - ⬆️ Upgrade Gates - Multiply damage/speed
4. **Enemies** - Zombies run toward you, weapons auto-kill them
5. **Scoring** - Distance + Kills + Pickups

### 2.5D Perspective Tricks
- Objects scale up as they approach (small → large)
- Road narrows toward horizon point
- Shadows beneath objects
- Parallax background layers
- Speed lines effect

### Technical Requirements
- Canvas-based rendering
- Perspective math for scaling
- Touch/swipe detection
- Collision detection per lane
- Sprite support (easy swap from emojis)

### Sprite Needs
| Element | Size | Notes |
|---------|------|-------|
| Player/Hero | 64x64 | Running animation (optional) |
| Zombie | 48x48 | Walking toward player |
| Weapon pickup | 32x32 | Gun/sword icon |
| Coin/Gem | 32x32 | Shiny collectible |
| Upgrade gate | 64x64 | "x2" or arrow up |
| Bullet | 16x16 | Projectile |
| Road texture | 256x256 | Tileable (optional) |

### Sprite Sources (Free)
- **Kenney.nl** - CC0, no attribution needed
- **itch.io/game-assets/free** - Check individual licenses
- **OpenGameArt.org** - CC0/CC-BY
- **Craftpix.net/freebies** - Free with license

### Implementation Phases
1. **Phase 1**: Basic 2.5D road with perspective
2. **Phase 2**: Player movement (3 lanes)
3. **Phase 3**: Spawning objects with scaling
4. **Phase 4**: Collision & scoring
5. **Phase 5**: Weapons & combat
6. **Phase 6**: Polish (effects, sounds, sprites)

### Integration
- Same structure as other games
- Receives `init` message with remaining time
- Sends `gameComplete` with final score
- Works with existing MiniGameWebView

---

## Game Ideas Backlog

### Stack Tower
- Swinging blocks, tap to drop
- Stack as high as possible
- Complexity: Easy
- Build time: 30 min

### Snake
- Classic snake game
- Eat food, grow longer
- Complexity: Easy
- Build time: 30 min

### 2048
- Slide tiles, merge numbers
- Complexity: Easy
- Build time: 1 hr

### Flappy Bird Clone
- Tap to fly through gaps
- Complexity: Easy
- Build time: 30 min

### Block Puzzle (Blockudoku)
- Place shapes to clear lines
- Complexity: Medium
- Build time: 2-3 hrs
