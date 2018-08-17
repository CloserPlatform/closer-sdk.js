import { ID } from '../protocol/protocol';
import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';

export class PeerCandidateQueue {

  private peerCandidatesQueue: ReadonlyArray<RTCIceCandidate> = [];

  private logger: LoggerService;

  constructor(peerId: ID, loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create(`PeerCandidateQueue Peer(${peerId})`);
  }

  public addCandidate = (candidate: RTCIceCandidate): void => {
    this.logger.debug(`Saving candidate`);
    this.peerCandidatesQueue = [...this.peerCandidatesQueue, candidate];
  }

  public drainCandidates = (): ReadonlyArray<RTCIceCandidate> => {
    const candidates = this.peerCandidatesQueue;
    this.peerCandidatesQueue = [];
    this.logger.debug(`Draining candidates queue of ${candidates.length} candidates`);

    return candidates;
  }
}
