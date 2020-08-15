import { WebRTCFunctions } from './callstats.interface';

export interface WebRTCStatsCollector {
  reportError(webRTCFunction: WebRTCFunctions, domError?: DOMError): void;
}
