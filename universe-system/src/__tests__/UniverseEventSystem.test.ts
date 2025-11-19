/**
 * UniverseEventSystem Tests
 *
 * Comprehensive test suite for the event bus system
 */

import {
  EventBus,
  EventLogger,
  UniverseEventType,
  EventPriority,
  UniverseEvent,
  getGlobalEventBus,
  resetGlobalEventBus,
} from '../UniverseEventSystem';

describe('UniverseEventSystem', () => {
  describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
      eventBus = new EventBus();
    });

    describe('Event Emission', () => {
      test('should emit events and return event ID', () => {
        const eventId = eventBus.emit(
          UniverseEventType.CONSTRUCTION_COMPLETE,
          { buildingType: 'FACTORY' },
          {
            source: 'ConstructionSystem',
            priority: EventPriority.NORMAL,
          }
        );

        expect(eventId).toBeDefined();
        expect(eventId).toMatch(/^evt_\d+_\d+$/);
      });

      test('should emit sync events', () => {
        let callbackCalled = false;

        eventBus.subscribe(UniverseEventType.SIEGE_STARTED, () => {
          callbackCalled = true;
        });

        eventBus.emitSync(
          UniverseEventType.SIEGE_STARTED,
          { attackerFaction: 'EMPIRE' },
          { source: 'ConquestSystem', priority: EventPriority.CRITICAL }
        );

        expect(callbackCalled).toBe(true);
      });

      test('should store emitted events in history', () => {
        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          { value: 1000 },
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        const history = eventBus.getHistory();
        expect(history.length).toBe(1);
        expect(history[0].type).toBe(UniverseEventType.TRADE_COMPLETED);
      });
    });

    describe('Subscriptions', () => {
      test('should subscribe to specific event types', () => {
        let eventReceived = false;

        eventBus.subscribe(UniverseEventType.POPULATION_MIGRATED, (event) => {
          eventReceived = true;
          expect(event.type).toBe(UniverseEventType.POPULATION_MIGRATED);
        });

        eventBus.emit(
          UniverseEventType.POPULATION_MIGRATED,
          { count: 1000 },
          { source: 'PopulationSystem', priority: EventPriority.NORMAL }
        );

        // Allow async processing
        return new Promise((resolve) => {
          setTimeout(() => {
            expect(eventReceived).toBe(true);
            resolve(undefined);
          }, 10);
        });
      });

      test('should subscribe to all events with wildcard', () => {
        const receivedTypes: UniverseEventType[] = [];

        eventBus.subscribe('*', (event) => {
          receivedTypes.push(event.type);
        });

        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        eventBus.emit(
          UniverseEventType.COMBAT_STARTED,
          {},
          { source: 'CombatSystem', priority: EventPriority.URGENT }
        );

        return new Promise((resolve) => {
          setTimeout(() => {
            expect(receivedTypes).toContain(UniverseEventType.TRADE_COMPLETED);
            expect(receivedTypes).toContain(UniverseEventType.COMBAT_STARTED);
            resolve(undefined);
          }, 10);
        });
      });

      test('should unsubscribe correctly', () => {
        let callCount = 0;

        const subId = eventBus.subscribe(UniverseEventType.TRADE_COMPLETED, () => {
          callCount++;
        });

        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        eventBus.unsubscribe(subId);

        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        return new Promise((resolve) => {
          setTimeout(() => {
            expect(callCount).toBe(1); // Only first emission should trigger
            resolve(undefined);
          }, 10);
        });
      });

      test('should handle priority-based subscription ordering', () => {
        const callOrder: string[] = [];

        eventBus.subscribe(
          UniverseEventType.RESEARCH_COMPLETED,
          () => {
            callOrder.push('low');
          },
          EventPriority.LOW
        );

        eventBus.subscribe(
          UniverseEventType.RESEARCH_COMPLETED,
          () => {
            callOrder.push('high');
          },
          EventPriority.HIGH
        );

        eventBus.subscribe(
          UniverseEventType.RESEARCH_COMPLETED,
          () => {
            callOrder.push('critical');
          },
          EventPriority.CRITICAL
        );

        eventBus.emitSync(
          UniverseEventType.RESEARCH_COMPLETED,
          {},
          { source: 'ResearchSystem', priority: EventPriority.NORMAL }
        );

        expect(callOrder).toEqual(['critical', 'high', 'low']);
      });
    });

    describe('Event History', () => {
      beforeEach(() => {
        // Emit multiple events for history tests
        for (let i = 0; i < 5; i++) {
          eventBus.emit(
            UniverseEventType.TRADE_COMPLETED,
            { value: i * 100 },
            { source: 'EconomySystem', priority: EventPriority.LOW }
          );
        }

        eventBus.emit(
          UniverseEventType.COMBAT_STARTED,
          { attacker: 'pirate' },
          { source: 'CombatSystem', priority: EventPriority.URGENT }
        );

        eventBus.emit(
          UniverseEventType.SIEGE_STARTED,
          { attackerFaction: 'EMPIRE' },
          { source: 'ConquestSystem', priority: EventPriority.CRITICAL, tags: ['warfare'] }
        );
      });

      test('should retrieve all events', () => {
        const history = eventBus.getHistory();
        expect(history.length).toBe(7);
      });

      test('should filter by event type', () => {
        const tradeEvents = eventBus.getHistory({
          types: [UniverseEventType.TRADE_COMPLETED],
        });
        expect(tradeEvents.length).toBe(5);
        expect(tradeEvents.every((e) => e.type === UniverseEventType.TRADE_COMPLETED)).toBe(true);
      });

      test('should filter by source', () => {
        const economyEvents = eventBus.getHistory({
          sources: ['EconomySystem'],
        });
        expect(economyEvents.length).toBe(5);
        expect(economyEvents.every((e) => e.source === 'EconomySystem')).toBe(true);
      });

      test('should filter by priority', () => {
        const urgentEvents = eventBus.getHistory({
          minPriority: EventPriority.URGENT,
        });
        expect(urgentEvents.length).toBe(2); // URGENT and CRITICAL events
      });

      test('should filter by tags', () => {
        const warfareEvents = eventBus.getHistory({
          tags: ['warfare'],
        });
        expect(warfareEvents.length).toBe(1);
        expect(warfareEvents[0].type).toBe(UniverseEventType.SIEGE_STARTED);
      });

      test('should limit results', () => {
        const recentEvents = eventBus.getHistory({
          limit: 3,
        });
        expect(recentEvents.length).toBe(3);
      });

      test('should filter by time range', () => {
        const now = Date.now();
        const events = eventBus.getHistory({
          startTime: now - 1000,
          endTime: now + 1000,
        });
        expect(events.length).toBeGreaterThan(0);
      });

      test('should clear history', () => {
        const clearedCount = eventBus.clearHistory();
        expect(clearedCount).toBe(7);
        expect(eventBus.getHistory().length).toBe(0);
      });

      test('should clear history before timestamp', () => {
        const midTime = Date.now();

        // Emit more events after midTime
        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        const clearedCount = eventBus.clearHistory(midTime);
        expect(clearedCount).toBeGreaterThan(0);

        const remaining = eventBus.getHistory();
        expect(remaining.every((e) => e.timestamp >= midTime)).toBe(true);
      });
    });

    describe('Event Retrieval', () => {
      test('should get event by ID', () => {
        const eventId = eventBus.emit(
          UniverseEventType.TECHNOLOGY_UNLOCKED,
          { techId: 'shields' },
          { source: 'ResearchSystem', priority: EventPriority.HIGH }
        );

        const event = eventBus.getEventById(eventId);
        expect(event).toBeDefined();
        expect(event!.id).toBe(eventId);
        expect(event!.type).toBe(UniverseEventType.TECHNOLOGY_UNLOCKED);
      });

      test('should get events by parent ID (cascade chains)', () => {
        const parentId = eventBus.emit(
          UniverseEventType.SIEGE_ENDED,
          {},
          { source: 'ConquestSystem', priority: EventPriority.HIGH }
        );

        eventBus.emit(
          UniverseEventType.TERRITORY_CAPTURED,
          {},
          {
            source: 'ConquestSystem',
            priority: EventPriority.HIGH,
            parentEventId: parentId,
          }
        );

        eventBus.emit(
          UniverseEventType.POPULATION_MIGRATED,
          {},
          {
            source: 'PopulationSystem',
            priority: EventPriority.NORMAL,
            parentEventId: parentId,
          }
        );

        const children = eventBus.getEventsByParent(parentId);
        expect(children.length).toBe(2);
        expect(children.every((e) => e.parentEventId === parentId)).toBe(true);
      });
    });

    describe('Statistics', () => {
      test('should track event statistics', () => {
        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        eventBus.emit(
          UniverseEventType.COMBAT_STARTED,
          {},
          { source: 'CombatSystem', priority: EventPriority.URGENT }
        );

        const stats = eventBus.getStats();

        expect(stats.totalEventsEmitted).toBe(3);
        expect(stats.eventsByType.get(UniverseEventType.TRADE_COMPLETED)).toBe(2);
        expect(stats.eventsByType.get(UniverseEventType.COMBAT_STARTED)).toBe(1);
        expect(stats.eventsBySources.get('EconomySystem')).toBe(2);
        expect(stats.eventsBySources.get('CombatSystem')).toBe(1);
      });

      test('should track subscription count', () => {
        eventBus.subscribe(UniverseEventType.TRADE_COMPLETED, () => {});
        eventBus.subscribe(UniverseEventType.COMBAT_STARTED, () => {});
        eventBus.subscribe('*', () => {});

        const stats = eventBus.getStats();
        expect(stats.subscriptionCount).toBe(3);
      });
    });

    describe('Performance', () => {
      test('should process events in < 1ms (target)', () => {
        const start = performance.now();

        for (let i = 0; i < 100; i++) {
          eventBus.emit(
            UniverseEventType.TICK_UPDATE,
            { deltaTime: 16.67 },
            { source: 'GameLoop', priority: EventPriority.NORMAL }
          );
        }

        const elapsed = performance.now() - start;
        const averagePerEvent = elapsed / 100;

        console.log(`Average event processing time: ${averagePerEvent.toFixed(3)}ms`);
        expect(averagePerEvent).toBeLessThan(1.0);
      });

      test('should handle max history size', () => {
        eventBus.setMaxHistorySize(100);

        // Emit more than max
        for (let i = 0; i < 150; i++) {
          eventBus.emit(
            UniverseEventType.TICK_UPDATE,
            { tick: i },
            { source: 'GameLoop', priority: EventPriority.LOW }
          );
        }

        const history = eventBus.getHistory();
        expect(history.length).toBe(100);
      });

      test('should maintain performance with many subscriptions', () => {
        // Add many subscriptions
        for (let i = 0; i < 50; i++) {
          eventBus.subscribe(UniverseEventType.TICK_UPDATE, () => {
            // Minimal work
          });
        }

        const start = performance.now();

        eventBus.emitSync(
          UniverseEventType.TICK_UPDATE,
          { deltaTime: 16.67 },
          { source: 'GameLoop', priority: EventPriority.NORMAL }
        );

        const elapsed = performance.now() - start;

        console.log(`Event with 50 subscriptions: ${elapsed.toFixed(3)}ms`);
        expect(elapsed).toBeLessThan(5.0); // Should still be reasonably fast
      });
    });

    describe('Configuration', () => {
      test('should set and respect max history size', () => {
        eventBus.setMaxHistorySize(10);

        for (let i = 0; i < 20; i++) {
          eventBus.emit(
            UniverseEventType.TICK_UPDATE,
            {},
            { source: 'GameLoop', priority: EventPriority.LOW }
          );
        }

        expect(eventBus.getHistory().length).toBe(10);
      });

      test('should enable/disable performance mode', () => {
        eventBus.setPerformanceMode(true);
        expect(() => {
          eventBus.emit(
            UniverseEventType.TICK_UPDATE,
            {},
            { source: 'GameLoop', priority: EventPriority.LOW }
          );
        }).not.toThrow();

        eventBus.setPerformanceMode(false);
        expect(() => {
          eventBus.emit(
            UniverseEventType.TICK_UPDATE,
            {},
            { source: 'GameLoop', priority: EventPriority.LOW }
          );
        }).not.toThrow();
      });
    });

    describe('Reset', () => {
      test('should reset event bus state', () => {
        eventBus.subscribe(UniverseEventType.TRADE_COMPLETED, () => {});

        eventBus.emit(
          UniverseEventType.TRADE_COMPLETED,
          {},
          { source: 'EconomySystem', priority: EventPriority.LOW }
        );

        eventBus.reset();

        const stats = eventBus.getStats();
        expect(stats.totalEventsEmitted).toBe(0);
        expect(stats.subscriptionCount).toBe(0);
        expect(eventBus.getHistory().length).toBe(0);
      });
    });
  });

  describe('EventLogger', () => {
    let eventBus: EventBus;
    let logger: EventLogger;

    beforeEach(() => {
      eventBus = new EventBus();
      logger = new EventLogger(eventBus);
    });

    test('should log events', () => {
      logger.setConsoleLogging(false); // Disable console for test
      logger.start();

      eventBus.emit(
        UniverseEventType.TRADE_COMPLETED,
        {},
        { source: 'EconomySystem', priority: EventPriority.LOW }
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = logger.getLogs();
          expect(logs.length).toBeGreaterThan(0);
          resolve(undefined);
        }, 10);
      });
    });

    test('should filter by log level', () => {
      logger.setConsoleLogging(false);
      logger.setLogLevel('HIGH');
      logger.start();

      eventBus.emit(
        UniverseEventType.TRADE_COMPLETED,
        {},
        { source: 'EconomySystem', priority: EventPriority.LOW }
      );

      eventBus.emit(
        UniverseEventType.FACTION_WAR_DECLARED,
        {},
        { source: 'FactionSystem', priority: EventPriority.HIGH }
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = logger.getLogs();
          // Only HIGH priority event should be logged
          expect(logs.length).toBe(1);
          expect(logs[0]).toContain('FACTION_WAR_DECLARED');
          resolve(undefined);
        }, 10);
      });
    });

    test('should export logs', () => {
      logger.setConsoleLogging(false);
      logger.start();

      eventBus.emit(
        UniverseEventType.COMBAT_STARTED,
        {},
        { source: 'CombatSystem', priority: EventPriority.URGENT }
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          const exported = logger.exportLogs();
          expect(exported).toContain('COMBAT_STARTED');
          resolve(undefined);
        }, 10);
      });
    });

    test('should clear logs', () => {
      logger.setConsoleLogging(false);
      logger.start();

      eventBus.emit(
        UniverseEventType.TRADE_COMPLETED,
        {},
        { source: 'EconomySystem', priority: EventPriority.LOW }
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          logger.clearLogs();
          expect(logger.getLogs().length).toBe(0);
          resolve(undefined);
        }, 10);
      });
    });

    test('should stop logging', () => {
      logger.setConsoleLogging(false);
      logger.start();
      logger.stop();

      eventBus.emit(
        UniverseEventType.TRADE_COMPLETED,
        {},
        { source: 'EconomySystem', priority: EventPriority.LOW }
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(logger.getLogs().length).toBe(0);
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('Global Event Bus', () => {
    beforeEach(() => {
      resetGlobalEventBus();
    });

    test('should return singleton instance', () => {
      const bus1 = getGlobalEventBus();
      const bus2 = getGlobalEventBus();

      expect(bus1).toBe(bus2);
    });

    test('should share state across calls', () => {
      const bus1 = getGlobalEventBus();
      const bus2 = getGlobalEventBus();

      bus1.emit(
        UniverseEventType.SYSTEM_INITIALIZED,
        { system: 'Test' },
        { source: 'TestSystem', priority: EventPriority.NORMAL }
      );

      const history = bus2.getHistory();
      expect(history.length).toBe(1);
    });

    test('should reset global instance', () => {
      const bus1 = getGlobalEventBus();

      bus1.emit(
        UniverseEventType.TRADE_COMPLETED,
        {},
        { source: 'EconomySystem', priority: EventPriority.LOW }
      );

      resetGlobalEventBus();

      const bus2 = getGlobalEventBus();
      expect(bus2.getHistory().length).toBe(0);
    });
  });

  describe('Event Cascades', () => {
    test('should support event cascade chains', () => {
      const eventBus = new EventBus();

      const parentId = eventBus.emit(
        UniverseEventType.SIEGE_ENDED,
        { outcome: 'VICTORY' },
        { source: 'ConquestSystem', priority: EventPriority.HIGH }
      );

      const childId = eventBus.emit(
        UniverseEventType.TERRITORY_CAPTURED,
        { territoryId: 'sector_7' },
        {
          source: 'ConquestSystem',
          priority: EventPriority.HIGH,
          parentEventId: parentId,
        }
      );

      const grandchildId = eventBus.emit(
        UniverseEventType.POPULATION_MIGRATED,
        { count: 5000 },
        {
          source: 'PopulationSystem',
          priority: EventPriority.NORMAL,
          parentEventId: childId,
        }
      );

      const parent = eventBus.getEventById(parentId);
      const child = eventBus.getEventById(childId);
      const grandchild = eventBus.getEventById(grandchildId);

      expect(parent).toBeDefined();
      expect(child!.parentEventId).toBe(parentId);
      expect(grandchild!.parentEventId).toBe(childId);

      const directChildren = eventBus.getEventsByParent(parentId);
      expect(directChildren.length).toBe(1);
      expect(directChildren[0].id).toBe(childId);
    });
  });

  describe('Type Safety', () => {
    test('should handle typed event data', () => {
      const eventBus = new EventBus();

      interface TradeData {
        buyer: string;
        seller: string;
        goods: string[];
        value: number;
      }

      const tradeData: TradeData = {
        buyer: 'player',
        seller: 'merchant',
        goods: ['food', 'minerals'],
        value: 5000,
      };

      eventBus.subscribe(UniverseEventType.TRADE_COMPLETED, (event: UniverseEvent<TradeData>) => {
        expect(event.data.buyer).toBe('player');
        expect(event.data.value).toBe(5000);
        expect(event.data.goods).toEqual(['food', 'minerals']);
      });

      eventBus.emitSync(UniverseEventType.TRADE_COMPLETED, tradeData, {
        source: 'EconomySystem',
        priority: EventPriority.NORMAL,
      });
    });
  });
});
