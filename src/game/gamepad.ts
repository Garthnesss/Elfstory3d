// Gamepad support (Phase 6 "reach & refinement").
//
// The button→action mapping and the polling/repeat logic live here as pure
// functions over plain snapshots ({ pressed } buttons + axis values), so
// they are unit-testable without hardware. App.tsx owns the actual
// Gamepad API polling (requestAnimationFrame) and feeds snapshots in; the
// actions returned here are dispatched through the exact same handlers the
// keyboard path uses.

/** Actions a gamepad can trigger. Movement actions double as the poller's
 *  held-direction values; the rest fire on press edges only. */
export type GamepadAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'interact'
  | 'cancel'
  | 'map'
  | 'journal'
  | 'cycleTarget'
  | 'pause'
  | 'explore';

export type MoveDirection = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight';

/** Left-stick deadzone: below this magnitude the stick counts as centred. */
export const GAMEPAD_DEADZONE = 0.45;
/** While a movement direction is held, it re-fires at this cadence. */
export const GAMEPAD_REPEAT_MS = 170;

// Standard-layout mapping (W3C "standard" gamepad mapping):
//   A(0) interact · B(1) cancel/back · X(2) map · Y(3) journal
//   LB(4)/RB(5) cycle target · Back(8) auto-explore · Start(9) pause
//   DPad(12–15) movement. LT(6)/RT(7) and stick clicks are unbound.
const BUTTON_ACTIONS: Readonly<Record<number, GamepadAction>> = {
  0: 'interact',
  1: 'cancel',
  2: 'map',
  3: 'journal',
  4: 'cycleTarget',
  5: 'cycleTarget',
  8: 'explore',
  9: 'pause',
  12: 'moveUp',
  13: 'moveDown',
  14: 'moveLeft',
  15: 'moveRight',
};

/** The action bound to a standard-layout button index, or null. */
export function gamepadButtonAction(index: number): GamepadAction | null {
  return BUTTON_ACTIONS[index] ?? null;
}

function isMoveAction(action: GamepadAction): action is MoveDirection {
  return action === 'moveUp' || action === 'moveDown' || action === 'moveLeft' || action === 'moveRight';
}

/**
 * Direction the left stick is pushed in, by dominant axis, or null when
 * inside the deadzone. Diagonal pushes resolve to the stronger axis.
 */
export function stickDirection(
  x: number,
  y: number,
  deadzone: number = GAMEPAD_DEADZONE
): MoveDirection | null {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (Math.max(ax, ay) < deadzone) return null;
  if (ax >= ay) return x > 0 ? 'moveRight' : 'moveLeft';
  return y > 0 ? 'moveDown' : 'moveUp';
}

/** A plain-data snapshot of one gamepad read (a structural subset of the
 *  browser's Gamepad, so tests can fabricate snapshots freely). */
export interface GamepadSnapshot {
  buttons: ReadonlyArray<{ pressed: boolean } | boolean>;
  axes: ReadonlyArray<number>;
}

function pressedAt(buttons: GamepadSnapshot['buttons'], index: number): boolean {
  const b = buttons[index];
  if (typeof b === 'boolean') return b;
  return Boolean(b?.pressed);
}

/** Direction from the DPad (first pressed wins, in up/down/left/right order). */
export function dpadDirection(buttons: GamepadSnapshot['buttons']): MoveDirection | null {
  if (pressedAt(buttons, 12)) return 'moveUp';
  if (pressedAt(buttons, 13)) return 'moveDown';
  if (pressedAt(buttons, 14)) return 'moveLeft';
  if (pressedAt(buttons, 15)) return 'moveRight';
  return null;
}

/** The movement direction a snapshot is asking for: DPad beats the stick. */
export function snapshotDirection(pad: GamepadSnapshot): MoveDirection | null {
  return dpadDirection(pad.buttons) ?? stickDirection(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
}

/**
 * Stateful poller: turns a stream of snapshots into discrete actions.
 * Non-movement buttons fire once per press (edge-triggered). Movement
 * fires on engage and then repeats every GAMEPAD_REPEAT_MS while held;
 * switching direction re-fires immediately. `now` is a millisecond clock
 * supplied by the caller (performance.now() in App, synthetic in tests).
 */
export class GamepadPoller {
  private prevPressed: boolean[] = [];
  private heldDirection: MoveDirection | null = null;
  private nextRepeatAt = 0;

  poll(pad: GamepadSnapshot, now: number): GamepadAction[] {
    const actions: GamepadAction[] = [];

    const count = Math.max(pad.buttons.length, this.prevPressed.length);
    for (let i = 0; i < count; i++) {
      const action = gamepadButtonAction(i);
      if (!action || isMoveAction(action)) continue;
      if (pressedAt(pad.buttons, i) && !this.prevPressed[i]) actions.push(action);
    }
    this.prevPressed = Array.from({ length: pad.buttons.length }, (_, i) =>
      pressedAt(pad.buttons, i)
    );

    const dir = snapshotDirection(pad);
    if (dir !== this.heldDirection) {
      this.heldDirection = dir;
      if (dir) {
        actions.push(dir);
        this.nextRepeatAt = now + GAMEPAD_REPEAT_MS;
      }
    } else if (dir && now >= this.nextRepeatAt) {
      actions.push(dir);
      this.nextRepeatAt = now + GAMEPAD_REPEAT_MS;
    }
    return actions;
  }

  /** Forget all held state (e.g. on disconnect, so a reconnect starts clean). */
  reset(): void {
    this.prevPressed = [];
    this.heldDirection = null;
    this.nextRepeatAt = 0;
  }
}
