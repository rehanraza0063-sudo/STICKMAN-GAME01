# 💥 STICKMAN FIGHT - ARCADE BRAWL

An action-packed, fast-paced stickman fighting game running locally with pure Web Audio API procedural sound effects, customizable battle music, ragdoll physics, combo attacks, weapons, and AI/PvP modes.

---

## 🚀 How to Run on Localhost

You have several easy ways to launch the game:

### Option 1: Python (Recommended)
```bash
python server.py
```
*(Automatically opens your browser at `http://localhost:8000`)*

### Option 2: Node.js / NPM
```bash
npm start
# or
node server.js
```

### Option 3: Double-Click Launcher (Windows)
Double-click `start.bat` in the folder.

---

## 🎮 Controls

### 🟦 Player 1 (Blue Dragon)
| Action | Keybinding |
| :--- | :--- |
| **Move Left / Right** | `A` / `D` |
| **Jump / Double Jump** | `W` or `Space` |
| **Slide / Sweep Kick** | `S` (while moving) |
| **Dash / Evade** | `Left Shift` |
| **Punch Combo** | `F` or `J` (Jab ➔ Cross ➔ Launching Uppercut) |
| **Heavy Kick** | `G` or `K` |
| **Guard / Block Deflect** | `H` or `L` (hold to reduce damage and deflect with sparks) |
| **Pick Up / Throw Weapon** | `E` or `U` |
| **Super Beam Cannon** | `R` or `I` (requires 100% Super Meter) |

### 🟥 Player 2 (Red Phoenix - 2P Local Brawl)
| Action | Keybinding |
| :--- | :--- |
| **Move Left / Right** | `Left Arrow` / `Right Arrow` |
| **Jump / Double Jump** | `Up Arrow` |
| **Slide / Sweep Kick** | `Down Arrow` |
| **Dash / Evade** | `Right Ctrl` or `Enter` |
| **Punch Combo** | `NumPad 1` or `B` or `,` |
| **Heavy Kick** | `NumPad 2` or `N` or `.` |
| **Guard / Block Deflect** | `NumPad 3` or `M` or `/` |
| **Pick Up / Throw Weapon** | `NumPad 4` or `O` |
| **Super Beam Cannon** | `NumPad 5` or `P` (requires 100% Super Meter) |

---

## 🔊 Sound Effects & Audio Synthesizer (Zero External Files!)

The audio engine uses the HTML5 **Web Audio API** to synthesize all sound effects and background music in real-time. There are zero broken links, zero network lag, and zero missing asset errors:

* **Attacks:** High-speed whoosh on light punch, low-frequency bone crunch on heavy punch/uppercut, whipping whip-crack on roundhouse kicks.
* **Damage Consuming:** Pain vocal resonance, fleshy smack, and metallic deflection tones on blocks.
* **Jumping:** Dynamic rising pitch-sweep on single jump, resonant sonic pop on double jump.
* **Sliding:** Granular friction noise that continuously loops while sliding along the ground.
* **Landing & Running:** Rhythmic footsteps and heavy landing floor impacts.
* **Weapons:** Razor-sharp katana slashes, laser gunshots with recoil, and sub-bass explosions.
* **Background Music (BGM):** 3 full procedural electronic/chiptune battle themes with driving 808 kicks, snappy snares, hi-hats, basslines, and melodic synth leads:
  1. *Neon Brawler* (130 BPM Synthwave)
  2. *Shadow Dojo* (142 BPM Breakbeat / Ninja Trap)
  3. *Adrenaline Rush* (152 BPM Speed Chiptune)

---

## ⚔️ Game Features

1. **3 Game Modes:**
   - **1P VS AI:** Battle against an intelligent bot with 4 difficulty levels (*Easy*, *Normal*, *Hard*, *Demon*).
   - **2P Local Brawl:** Fight with a friend on the same keyboard!
   - **Endless Survival:** Defeat waves of increasingly tougher cyber bots.
2. **3 Battle Stages:**
   - *Neo Tokyo Rooftop* (Cyberpunk skyline, neon signs, and rainfall).
   - *Molten Hazard Foundry* (Catwalk platforms above a bubbling lava pit).
   - *Moonlight Cyber Shrine* (Giant glowing moon and drifting cherry blossom petals).
3. **Arsenal of Weapons (Parachute Drops):**
   - *Shadow Katana* (Swift slashes with glowing blade trails).
   - *Plasma Blaster* (Rapid-fire laser bolts).
   - *Dragon Staff* (Wide whirlwind swings).
   - *RPG Cannon* (Explosive area-of-effect missile).
4. **Cinematic Combat Polish:**
   - Dynamic zoom & pan fight camera.
   - Hit-stop freeze frames on heavy impact.
   - Ragdoll physics tumble on K.O.
   - Screen shake, spark bursts, floating damage numbers, and dual-layer health bars.
