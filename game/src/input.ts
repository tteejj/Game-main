/**
 * Input Manager
 * Handles keyboard and mouse input
 */

export class InputManager {
    private keysPressed: Set<string> = new Set();

    // Callbacks
    onStationSwitch: ((station: number) => void) | null = null;
    onKeyPress: ((key: string) => void) | null = null;
    onRenderingControl: ((control: string) => void) | null = null;

    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    private onKeyDown = (e: KeyboardEvent) => {
        const key = e.key;
        this.keysPressed.add(key);

        // Rendering controls (higher priority than station switching)
        if (key === '[' || key === ']' || key === 't' || key === 'h' || key === 'F3') {
            if (this.onRenderingControl) {
                this.onRenderingControl(key);
            }
            e.preventDefault();
            return;
        }

        // Station switching (F1-F2, F4-F5 keys, excluding F3)
        if (key === 'F1' || key === 'F2' || key === 'F4' || key === 'F5') {
            const stationNum = parseInt(key.substring(1)); // Extract number from F1, F2, etc.
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

    isKeyPressed(key: string): boolean {
        return this.keysPressed.has(key);
    }

    destroy(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}
