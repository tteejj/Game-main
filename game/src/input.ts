/**
 * Input Manager
 * Handles keyboard and mouse input
 */

import { Game } from './game';

export class InputManager {
    private keysPressed: Set<string> = new Set();
    private game: Game | null = null;

    // Callbacks
    onStationSwitch: ((station: number) => void) | null = null;
    onKeyPress: ((key: string) => void) | null = null;

    constructor() {
        this.setupListeners();
    }

    /**
     * Link to game instance for camera/targeting controls
     */
    setGame(game: Game): void {
        this.game = game;
    }

    private setupListeners(): void {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('wheel', this.onMouseWheel);
    }

    private onKeyDown = (e: KeyboardEvent) => {
        const key = e.key;
        this.keysPressed.add(key);

        // === GAME CONTROLS ===

        // Pause (P or Space)
        if (key === 'p' || key === 'P') {
            this.game?.togglePause();
            e.preventDefault();
            return;
        }

        // Time acceleration (+ / -)
        if (key === '=' || key === '+') {
            const currentAccel = this.game?.getState().timeAcceleration || 1;
            this.game?.setTimeAcceleration(currentAccel * 1.5);
            e.preventDefault();
            return;
        }
        if (key === '-' || key === '_') {
            const currentAccel = this.game?.getState().timeAcceleration || 1;
            this.game?.setTimeAcceleration(currentAccel / 1.5);
            e.preventDefault();
            return;
        }

        // === CAMERA CONTROLS ===

        // Camera mode (C)
        if (key === 'c' || key === 'C') {
            this.game?.cycleCameraMode();
            e.preventDefault();
            return;
        }

        // === TARGETING CONTROLS ===

        // Cycle target (T)
        if (key === 't' || key === 'T') {
            this.game?.cycleTarget();
            e.preventDefault();
            return;
        }

        // Clear target (Escape)
        if (key === 'Escape') {
            this.game?.clearTarget();
            e.preventDefault();
            return;
        }

        // Fire weapons (F or Space in combat mode)
        if (key === 'f' || key === 'F') {
            this.game?.fireWeapons();
            e.preventDefault();
            return;
        }

        // === VIEW TOGGLES ===

        // Toggle orbits (O)
        if (key === 'o' || key === 'O') {
            this.game?.toggleOrbits();
            e.preventDefault();
            return;
        }

        // Toggle labels (L)
        if (key === 'l' || key === 'L') {
            this.game?.toggleLabels();
            e.preventDefault();
            return;
        }

        // Toggle velocity vectors (V)
        if (key === 'v' || key === 'V') {
            this.game?.toggleVelocityVectors();
            e.preventDefault();
            return;
        }

        // Toggle grid (G)
        if (key === 'g' || key === 'G') {
            this.game?.toggleGrid();
            e.preventDefault();
            return;
        }

        // Toggle HUD (H)
        if (key === 'h' || key === 'H') {
            this.game?.toggleHUD();
            e.preventDefault();
            return;
        }

        // === UI CONTROLS ===

        // Station switching (1-5 keys)
        if (key >= '1' && key <= '5') {
            const stationNum = parseInt(key);
            if (this.onStationSwitch) {
                this.onStationSwitch(stationNum);
            }
            e.preventDefault();
            return;
        }

        // TAB for cycling stations
        if (key === 'Tab') {
            // Will cycle through stations
            e.preventDefault();
            return;
        }

        // Pass other keys to active station
        if (this.onKeyPress) {
            this.onKeyPress(key);
        }
    };

    private onKeyUp = (e: KeyboardEvent) => {
        this.keysPressed.delete(e.key);
    };

    private onMouseWheel = (e: WheelEvent) => {
        // Zoom camera
        if (this.game) {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.game.zoomCamera(delta);
            e.preventDefault();
        }
    };

    isKeyPressed(key: string): boolean {
        return this.keysPressed.has(key);
    }

    destroy(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('wheel', this.onMouseWheel);
    }
}
