/**
 * communications/index.ts
 * Communications System - Exports
 */

export {
  SignalPropagation,
  SignalTransmission,
  SignalReception,
  SignalObstacle,
  FrequencyBand,
  getFrequencyForBand,
  AntennaPresets
} from './signal-propagation';

export {
  RelayNetwork,
  NetworkNode,
  NetworkLink,
  RouteEntry,
  MessageRoute
} from './relay-network';

export {
  CommunicationsManager,
  Message,
  MessageType,
  MessagePriority
} from './communications-manager';
