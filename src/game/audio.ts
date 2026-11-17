// SoundEngine: procedural Web Audio SFX (original) + Phase 2 additions —
// per-channel volume control and a generative music layer. Music is fully
// synthesized (pad chords + sparse minor-key melody, no audio assets),
// scheduled bar-by-bar through a lookahead pump that only runs once an
// AudioContext exists and is running (i.e. after a user gesture).

export type MusicTheme = 'town' | 'dungeon' | 'boss';

/**
 * Pick the music theme for a zone. Pure helper (unit-tested):
 * towns and the Silverwood overworld are calm; an alerted boss anywhere
 * else takes over; everything else is the tense dungeon loop.
 */
export function resolveMusicTheme(input: {
  isTown: boolean;
  zoneId: string;
  bossAlerted: boolean;
}): MusicTheme {
  if (input.isTown || input.zoneId === 'overworld') return 'town';
  if (input.bossAlerted) return 'boss';
  return 'dungeon';
}

interface MusicThemeDef {
  barSeconds: number;
  slotsPerBar: number;
  /** Chord voicings as MIDI note numbers, one chord per bar, looping. */
  chords: number[][];
  /** Melody note pool (MIDI), minor pentatonic of the theme key. */
  melodyPool: number[];
  /** Probability a melody slot actually sounds (sparseness control). */
  melodyChance: number;
  padGain: number;
  melodyGain: number;
  /** Boss themes add a driving root pulse on every slot. */
  pulse: boolean;
}

const MUSIC_THEMES: Record<MusicTheme, MusicThemeDef> = {
  // D minor, slow and warm: Dm – B♭ – F – C.
  town: {
    barSeconds: 4.8,
    slotsPerBar: 4,
    chords: [
      [50, 53, 57, 62],
      [46, 50, 53, 57],
      [48, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    melodyPool: [62, 65, 67, 69, 72, 74],
    melodyChance: 0.38,
    padGain: 0.042,
    melodyGain: 0.05,
    pulse: false,
  },
  // A minor, low and sparse: Am – F – Am – E.
  dungeon: {
    barSeconds: 5.6,
    slotsPerBar: 4,
    chords: [
      [45, 48, 52, 57],
      [41, 45, 48, 53],
      [45, 48, 52, 59],
      [40, 44, 47, 52],
    ],
    melodyPool: [57, 60, 62, 64, 67, 69],
    melodyChance: 0.22,
    padGain: 0.05,
    melodyGain: 0.045,
    pulse: false,
  },
  // D minor, driving: Dm – Dm – B♭ – A, root pulse on eighth slots.
  boss: {
    barSeconds: 3.2,
    slotsPerBar: 8,
    chords: [
      [38, 50, 53, 57],
      [38, 50, 53, 60],
      [46, 50, 53, 58],
      [45, 49, 52, 57],
    ],
    melodyPool: [62, 65, 67, 69, 72, 74, 77],
    melodyChance: 0.5,
    padGain: 0.038,
    melodyGain: 0.05,
    pulse: true,
  },
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private sfxVolume = 0.9;
  private musicVolume = 0.65;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicFade: GainNode | null = null;

  // Music scheduler state.
  private musicTheme: MusicTheme | null = null;
  private pendingTheme: MusicTheme | null = null;
  private pendingThemeAt = 0;
  private musicTimer: number | null = null;
  private nextBarAt = 0;
  private barCount = 0;
  private melodyCursor = 2;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.ctx.destination);
      this.musicFade = this.ctx.createGain();
      this.musicFade.connect(this.musicBus);
      this.applyBusGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyBusGains(): void {
    if (!this.ctx) return;
    if (this.sfxBus) this.sfxBus.gain.value = this.muted ? 0 : this.sfxVolume;
    if (this.musicBus) this.musicBus.gain.value = this.muted ? 0 : this.musicVolume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyBusGains();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyBusGains();
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
    this.applyBusGains();
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    this.applyBusGains();
  }

  /** Apply a full settings snapshot (from game/settings.ts) at once. */
  public applyAudioSettings(settings: { sfxVolume: number; musicVolume: number; muted: boolean }): void {
    this.sfxVolume = Math.min(1, Math.max(0, settings.sfxVolume));
    this.musicVolume = Math.min(1, Math.max(0, settings.musicVolume));
    this.muted = settings.muted;
    this.applyBusGains();
  }

  /** Call from a real user gesture (pointer/key) so the AudioContext may
   *  start — browsers refuse audible audio before one. Safe to call often. */
  public noteUserGesture(): void {
    this.ensureContext();
  }

  // ---------------------------------------------------------------- music

  /** Request a theme. Switching crossfades through the fade bus; starting
   *  is deferred until the context exists and is running (post-gesture). */
  public startMusic(theme: MusicTheme): void {
    if (this.musicTheme === theme && !this.pendingTheme) {
      this.ensureMusicPump();
      return;
    }
    if (this.musicTheme === null) {
      this.musicTheme = theme;
      this.barCount = 0;
      this.nextBarAt = 0;
      this.ensureMusicPump();
      return;
    }
    // Theme change: fade out, swap at the bottom of the fade, fade back in.
    this.pendingTheme = theme;
    if (this.ctx && this.musicFade) {
      const now = this.ctx.currentTime;
      this.pendingThemeAt = now + 0.45;
      this.musicFade.gain.cancelScheduledValues(now);
      this.musicFade.gain.setValueAtTime(this.musicFade.gain.value, now);
      this.musicFade.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    } else {
      this.pendingThemeAt = 0;
    }
    this.ensureMusicPump();
  }

  public stopMusic(): void {
    this.musicTheme = null;
    this.pendingTheme = null;
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.musicFade) {
      const now = this.ctx.currentTime;
      this.musicFade.gain.cancelScheduledValues(now);
      this.musicFade.gain.setValueAtTime(this.musicFade.gain.value, now);
      this.musicFade.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    }
  }

  public getMusicTheme(): MusicTheme | null {
    return this.pendingTheme ?? this.musicTheme;
  }

  private ensureMusicPump(): void {
    if (this.musicTimer !== null || typeof window === 'undefined') return;
    this.musicTimer = window.setInterval(() => this.pumpMusic(), 200);
  }

  private pumpMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.musicTheme) return;

    if (this.pendingTheme) {
      if (ctx.currentTime >= this.pendingThemeAt) {
        this.musicTheme = this.pendingTheme;
        this.pendingTheme = null;
        this.barCount = 0;
        this.nextBarAt = ctx.currentTime + 0.05;
        if (this.musicFade) {
          const now = ctx.currentTime;
          this.musicFade.gain.cancelScheduledValues(now);
          this.musicFade.gain.setValueAtTime(Math.max(0.0001, this.musicFade.gain.value), now);
          this.musicFade.gain.linearRampToValueAtTime(1, now + 0.7);
        }
      } else {
        return; // still fading out — schedule nothing new
      }
    }

    if (this.nextBarAt === 0) {
      this.nextBarAt = ctx.currentTime + 0.06;
      if (this.musicFade) this.musicFade.gain.value = 1;
    }
    const def = MUSIC_THEMES[this.musicTheme];
    while (this.nextBarAt < ctx.currentTime + 1.0) {
      this.scheduleBar(this.musicTheme, this.barCount, this.nextBarAt);
      this.nextBarAt += def.barSeconds;
      this.barCount += 1;
    }
  }

  private scheduleBar(theme: MusicTheme, barIndex: number, startAt: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicFade) return;
    const def = MUSIC_THEMES[theme];
    const chord = def.chords[barIndex % def.chords.length];
    const bar = def.barSeconds;

    // Pad: one soft oscillator per chord tone, slow attack, tail past the bar.
    for (const midi of chord) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiToFreq(midi);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(def.padGain, startAt + Math.min(1.1, bar * 0.3));
      gain.gain.setValueAtTime(def.padGain, startAt + bar * 0.72);
      gain.gain.linearRampToValueAtTime(0.0001, startAt + bar + 0.5);
      osc.connect(gain);
      gain.connect(this.musicFade);
      osc.start(startAt);
      osc.stop(startAt + bar + 0.55);
    }

    const slotDur = bar / def.slotsPerBar;
    for (let slot = 0; slot < def.slotsPerBar; slot++) {
      const slotAt = startAt + slot * slotDur;
      if (def.pulse) {
        // Driving root pulse (boss themes).
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = midiToFreq(chord[0]);
        gain.gain.setValueAtTime(0.0001, slotAt);
        gain.gain.linearRampToValueAtTime(0.055, slotAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, slotAt + Math.min(0.2, slotDur * 0.9));
        osc.connect(gain);
        gain.connect(this.musicFade);
        osc.start(slotAt);
        osc.stop(slotAt + Math.min(0.22, slotDur));
      }
      // Sparse generative melody: a lazy random walk over the pentatonic pool.
      if (Math.random() < def.melodyChance) {
        const step = Math.random() < 0.6 ? (Math.random() < 0.5 ? -1 : 1) : Math.random() < 0.5 ? -2 : 2;
        this.melodyCursor = Math.min(
          def.melodyPool.length - 1,
          Math.max(0, this.melodyCursor + step)
        );
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = midiToFreq(def.melodyPool[this.melodyCursor]);
        gain.gain.setValueAtTime(0.0001, slotAt);
        gain.gain.linearRampToValueAtTime(def.melodyGain, slotAt + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, slotAt + slotDur * 1.7);
        osc.connect(gain);
        gain.connect(this.musicFade);
        osc.start(slotAt);
        osc.stop(slotAt + slotDur * 1.75);
      }
    }
  }

  // ------------------------------------------------------------------ sfx

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.08,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.015, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxBus ?? ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playStep(): void {
    this.tone(115, 80, 0.045, 'triangle', 0.03);
  }

  public playHit(): void {
    this.tone(180, 65, 0.11, 'sawtooth', 0.08);
    this.tone(95, 50, 0.09, 'square', 0.05, 0.01);
  }

  public playCrit(): void {
    this.tone(320, 110, 0.16, 'sawtooth', 0.11);
    this.tone(620, 440, 0.14, 'triangle', 0.08, 0.02);
  }

  public playPlayerHurt(): void {
    this.tone(130, 52, 0.15, 'square', 0.09);
  }

  public playSpell(): void {
    this.tone(360, 720, 0.18, 'sine', 0.07);
    this.tone(540, 880, 0.22, 'triangle', 0.05, 0.04);
  }

  public playHeal(): void {
    this.tone(392, 523, 0.14, 'sine', 0.06);
    this.tone(523, 659, 0.18, 'sine', 0.06, 0.08);
  }

  public playLoot(): void {
    this.tone(523.25, 523.25, 0.08, 'triangle', 0.07, 0);
    this.tone(659.25, 659.25, 0.09, 'triangle', 0.07, 0.06);
    this.tone(783.99, 1046.5, 0.16, 'sine', 0.08, 0.12);
  }

  public playLevelUp(): void {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      this.tone(n, n * 1.02, 0.18, 'triangle', 0.08, idx * 0.08);
    });
  }

  public playQuill(): void {
    this.tone(420, 320, 0.035, 'sine', 0.035);
  }

  public playClick(): void {
    this.tone(480, 400, 0.04, 'sine', 0.04);
  }

  public playDoor(): void {
    this.tone(140, 210, 0.14, 'triangle', 0.06);
  }

  public playWaystone(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.tone(freq, freq * 1.03, 0.22, 'sine', 0.065, idx * 0.07);
    });
  }

  public playForge(): void {
    this.tone(920, 620, 0.09, 'triangle', 0.09, 0);
    this.tone(1240, 740, 0.18, 'sine', 0.06, 0.02);
    this.tone(180, 95, 0.14, 'sawtooth', 0.05, 0.06);
  }

  public playTrap(): void {
    this.tone(420, 120, 0.09, 'square', 0.08, 0);
    this.tone(140, 58, 0.15, 'sawtooth', 0.08, 0.04);
  }

  public playBossRoar(): void {
    this.tone(130, 72, 0.28, 'sawtooth', 0.08, 0);
    this.tone(195, 98, 0.3, 'triangle', 0.07, 0.05);
  }

  public playFrost(): void {
    this.tone(760, 1120, 0.16, 'sine', 0.06, 0);
    this.tone(540, 380, 0.2, 'triangle', 0.05, 0.04);
  }

  public playEmber(): void {
    this.tone(240, 580, 0.14, 'sawtooth', 0.06, 0);
    this.tone(460, 210, 0.18, 'triangle', 0.06, 0.05);
  }

  public playHazard(): void {
    this.tone(280, 140, 0.11, 'sawtooth', 0.06, 0);
    this.tone(180, 90, 0.14, 'triangle', 0.05, 0.04);
  }

  public playCompanion(): void {
    this.tone(540, 780, 0.08, 'triangle', 0.05, 0);
    this.tone(720, 960, 0.1, 'sine', 0.04, 0.03);
  }

  public playRuneforge(): void {
    this.tone(840, 580, 0.1, 'triangle', 0.075, 0);
    this.tone(1120, 1420, 0.2, 'sine', 0.06, 0.05);
  }

}

export const soundEngine = new SoundEngine();
