/**
 * Alert System
 *
 * Centralized alert management for cross-station notifications
 * Manages priority-based alerts that appear across all control stations
 */

export enum AlertPriority {
    P0_CRITICAL = 0,    // Immediate death: hull breach, reactor meltdown, collision imminent
    P1_URGENT = 1,      // Mission critical: low fuel, power failure, combat
    P2_WARNING = 2,     // System degradation, low resources
    P3_INFO = 3         // Status changes, waypoint reached
}

export enum AlertCategory {
    HULL = 'hull',
    POWER = 'power',
    THERMAL = 'thermal',
    FUEL = 'fuel',
    COMBAT = 'combat',
    NAVIGATION = 'navigation',
    LIFE_SUPPORT = 'life_support',
    SYSTEMS = 'systems'
}

export interface Alert {
    id: string;
    priority: AlertPriority;
    category: AlertCategory;
    message: string;
    station?: number;           // Which station to see details (1-5), undefined = all
    timestamp: number;
    acknowledged: boolean;
    persistent: boolean;        // Stays until condition resolved vs auto-clear
    condition?: () => boolean;  // Function to check if alert should clear
}

export class AlertSystem {
    private alerts: Map<string, Alert> = new Map();
    private alertHistory: Alert[] = [];
    private maxHistory: number = 50;
    private nextId: number = 0;

    // Station mapping
    private stationNames = [
        'Helm',
        'Engineering',
        'Navigation',
        'Life Support',
        'Weapons'
    ];

    /**
     * Add a new alert
     */
    addAlert(
        priority: AlertPriority,
        category: AlertCategory,
        message: string,
        options: {
            station?: number;
            persistent?: boolean;
            condition?: () => boolean;
        } = {}
    ): string {
        const id = `alert_${this.nextId++}`;

        const alert: Alert = {
            id,
            priority,
            category,
            message,
            station: options.station,
            timestamp: Date.now(),
            acknowledged: false,
            persistent: options.persistent ?? (priority <= AlertPriority.P1_URGENT),
            condition: options.condition
        };

        this.alerts.set(id, alert);
        return id;
    }

    /**
     * Acknowledge an alert (for P0 alerts that require acknowledgment)
     */
    acknowledgeAlert(id: string): boolean {
        const alert = this.alerts.get(id);
        if (!alert) return false;

        alert.acknowledged = true;

        // Move to history if not persistent
        if (!alert.persistent) {
            this.alerts.delete(id);
            this.addToHistory(alert);
        }

        return true;
    }

    /**
     * Clear an alert by ID
     */
    clearAlert(id: string): boolean {
        const alert = this.alerts.get(id);
        if (!alert) return false;

        this.alerts.delete(id);
        this.addToHistory(alert);
        return true;
    }

    /**
     * Clear all alerts for a category
     */
    clearCategory(category: AlertCategory): void {
        const toClear: string[] = [];

        this.alerts.forEach((alert, id) => {
            if (alert.category === category) {
                toClear.push(id);
            }
        });

        toClear.forEach(id => this.clearAlert(id));
    }

    /**
     * Update alerts - check conditions and auto-clear resolved ones
     */
    update(): void {
        const toClear: string[] = [];

        this.alerts.forEach((alert, id) => {
            // Check condition-based alerts
            if (alert.condition && !alert.condition()) {
                toClear.push(id);
            }
        });

        toClear.forEach(id => this.clearAlert(id));
    }

    /**
     * Get all active alerts
     */
    getAlerts(): Alert[] {
        return Array.from(this.alerts.values());
    }

    /**
     * Get alerts by priority
     */
    getAlertsByPriority(priority: AlertPriority): Alert[] {
        return this.getAlerts().filter(a => a.priority === priority);
    }

    /**
     * Get alerts by category
     */
    getAlertsByCategory(category: AlertCategory): Alert[] {
        return this.getAlerts().filter(a => a.category === category);
    }

    /**
     * Get alerts for a specific station
     */
    getAlertsForStation(stationNum: number): Alert[] {
        return this.getAlerts().filter(a =>
            a.station === undefined || a.station === stationNum
        );
    }

    /**
     * Get highest priority unacknowledged alert
     */
    getHighestPriorityAlert(): Alert | null {
        const unacknowledged = this.getAlerts()
            .filter(a => !a.acknowledged)
            .sort((a, b) => a.priority - b.priority);

        return unacknowledged[0] || null;
    }

    /**
     * Get critical (P0) alerts requiring acknowledgment
     */
    getCriticalUnacknowledged(): Alert[] {
        return this.getAlertsByPriority(AlertPriority.P0_CRITICAL)
            .filter(a => !a.acknowledged);
    }

    /**
     * Get alerts for other stations (to show "Check Station X" indicator)
     */
    getOtherStationAlerts(currentStation: number): Map<number, Alert[]> {
        const otherStationAlerts = new Map<number, Alert[]>();

        this.getAlerts().forEach(alert => {
            if (alert.station !== undefined && alert.station !== currentStation) {
                if (!otherStationAlerts.has(alert.station)) {
                    otherStationAlerts.set(alert.station, []);
                }
                otherStationAlerts.get(alert.station)!.push(alert);
            }
        });

        return otherStationAlerts;
    }

    /**
     * Get count of alerts by priority
     */
    getAlertCounts(): { p0: number; p1: number; p2: number; p3: number } {
        const counts = { p0: 0, p1: 0, p2: 0, p3: 0 };

        this.getAlerts().forEach(alert => {
            switch (alert.priority) {
                case AlertPriority.P0_CRITICAL: counts.p0++; break;
                case AlertPriority.P1_URGENT: counts.p1++; break;
                case AlertPriority.P2_WARNING: counts.p2++; break;
                case AlertPriority.P3_INFO: counts.p3++; break;
            }
        });

        return counts;
    }

    /**
     * Get alert history
     */
    getHistory(): Alert[] {
        return [...this.alertHistory];
    }

    /**
     * Get station name for station number
     */
    getStationName(stationNum: number): string {
        return this.stationNames[stationNum - 1] || 'Unknown';
    }

    /**
     * Clear all alerts
     */
    clearAll(): void {
        this.alerts.forEach(alert => this.addToHistory(alert));
        this.alerts.clear();
    }

    /**
     * Add alert to history
     */
    private addToHistory(alert: Alert): void {
        this.alertHistory.unshift(alert);

        // Trim history
        if (this.alertHistory.length > this.maxHistory) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistory);
        }
    }

    /**
     * Get color for priority (matches existing palette)
     */
    getPriorityColor(priority: AlertPriority, palette: any): string {
        switch (priority) {
            case AlertPriority.P0_CRITICAL: return palette.danger;
            case AlertPriority.P1_URGENT: return palette.warning;
            case AlertPriority.P2_WARNING: return palette.info;
            case AlertPriority.P3_INFO: return palette.secondary;
        }
    }

    /**
     * Get priority label
     */
    getPriorityLabel(priority: AlertPriority): string {
        switch (priority) {
            case AlertPriority.P0_CRITICAL: return '⚠ CRITICAL';
            case AlertPriority.P1_URGENT: return '⚠ URGENT';
            case AlertPriority.P2_WARNING: return '⚠ WARNING';
            case AlertPriority.P3_INFO: return 'ℹ INFO';
        }
    }
}

/**
 * Alert Display Component
 * Renders alerts in consistent style across all panels
 */
export class AlertDisplay {
    private alertSystem: AlertSystem;
    private palette: any;

    constructor(alertSystem: AlertSystem, palette: any) {
        this.alertSystem = alertSystem;
        this.palette = palette;
    }

    /**
     * Render top alert bar (critical alerts only)
     */
    renderTopBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
        const critical = this.alertSystem.getCriticalUnacknowledged();
        if (critical.length === 0) return;

        const alert = critical[0]; // Show highest priority

        // Background
        ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
        ctx.fillRect(x, y, width, 35);

        // Alert text
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = this.palette.danger;
        ctx.fillText(
            `${this.alertSystem.getPriorityLabel(alert.priority)}: ${alert.message}`,
            x + 10,
            y + 22
        );

        // Count indicator if multiple
        if (critical.length > 1) {
            ctx.fillStyle = this.palette.warning;
            ctx.font = '12px "Courier New"';
            ctx.fillText(`+${critical.length - 1} more`, width - 80, y + 22);
        }
    }

    /**
     * Render corner alert block
     */
    renderCornerBlock(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        category: AlertCategory,
        title: string
    ): void {
        const alerts = this.alertSystem.getAlertsByCategory(category)
            .filter(a => a.priority <= AlertPriority.P1_URGENT); // Only urgent and critical

        if (alerts.length === 0) return;

        const width = 180;
        const height = 20 + (alerts.length * 18);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, width, height);

        // Border
        ctx.strokeStyle = this.palette.danger;
        ctx.strokeRect(x, y, width, height);

        // Title
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.danger;
        ctx.fillText(title, x + 5, y + 15);

        // Alerts
        ctx.font = '11px "Courier New"';
        let ay = y + 30;

        alerts.slice(0, 5).forEach(alert => {
            const color = this.alertSystem.getPriorityColor(alert.priority, this.palette);
            ctx.fillStyle = color;

            const truncated = alert.message.length > 25
                ? alert.message.substring(0, 22) + '...'
                : alert.message;

            ctx.fillText(`• ${truncated}`, x + 5, ay);
            ay += 18;
        });
    }

    /**
     * Render station indicator (for alerts on other stations)
     */
    renderStationIndicators(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        currentStation: number
    ): void {
        const otherStations = this.alertSystem.getOtherStationAlerts(currentStation);
        if (otherStations.size === 0) return;

        const width = 200;
        const height = 20 + (otherStations.size * 20);

        // Background
        ctx.fillStyle = 'rgba(0, 50, 0, 0.8)';
        ctx.fillRect(x, y, width, height);

        // Title
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = this.palette.warning;
        ctx.fillText('CHECK STATIONS:', x + 5, y + 15);

        // Station indicators
        ctx.font = '11px "Courier New"';
        let sy = y + 30;

        otherStations.forEach((alerts, stationNum) => {
            const stationName = this.alertSystem.getStationName(stationNum);
            const count = alerts.length;
            const highestPriority = Math.min(...alerts.map(a => a.priority));

            const color = highestPriority === AlertPriority.P0_CRITICAL
                ? this.palette.danger
                : this.palette.warning;

            ctx.fillStyle = color;
            ctx.fillText(`→ F${stationNum} ${stationName} (${count})`, x + 5, sy);
            sy += 20;
        });
    }

    /**
     * Render alert list (detailed view for specific station)
     */
    renderAlertList(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        stationNum: number,
        maxAlerts: number = 10
    ): void {
        const alerts = this.alertSystem.getAlertsForStation(stationNum)
            .sort((a, b) => a.priority - b.priority)
            .slice(0, maxAlerts);

        if (alerts.length === 0) {
            ctx.font = '12px "Courier New"';
            ctx.fillStyle = this.palette.secondary;
            ctx.fillText('No alerts', x, y + 15);
            return;
        }

        ctx.font = '11px "Courier New"';
        let ay = y;

        alerts.forEach(alert => {
            const color = this.alertSystem.getPriorityColor(alert.priority, this.palette);
            ctx.fillStyle = color;

            const prefix = this.alertSystem.getPriorityLabel(alert.priority);
            const text = `${prefix}: ${alert.message}`;

            // Truncate if too long
            const maxLen = Math.floor(width / 7);
            const truncated = text.length > maxLen
                ? text.substring(0, maxLen - 3) + '...'
                : text;

            ctx.fillText(truncated, x, ay + 12);
            ay += 16;
        });
    }

    /**
     * Render alert count badge
     */
    renderAlertBadge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        const counts = this.alertSystem.getAlertCounts();
        const total = counts.p0 + counts.p1;

        if (total === 0) return;

        // Badge background
        const badgeWidth = 40;
        const badgeHeight = 18;

        ctx.fillStyle = counts.p0 > 0 ? this.palette.danger : this.palette.warning;
        ctx.fillRect(x, y, badgeWidth, badgeHeight);

        // Badge text
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(`${total}`, x + badgeWidth / 2, y + 13);
        ctx.textAlign = 'left';
    }
}
