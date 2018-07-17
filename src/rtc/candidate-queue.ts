import { ID } from '../protocol/protocol';
import { Logger } from '../logger';

export class CandidateQueue {

  private peerCandidatesQueue: { [peerId: string]: ReadonlyArray<RTCIceCandidate> | undefined} = {};

  constructor(private logger: Logger) {}

  public addCandidate = (peerId: ID, candidate: RTCIceCandidate): void => {
    this.logger.debug(`Saving candidate for peer ${peerId}`);
    const candidates = this.peerCandidatesQueue[peerId] || [];
    this.peerCandidatesQueue[peerId] = [...candidates, candidate];
  }

  public drainCandidates = (peerId: ID): ReadonlyArray<RTCIceCandidate> => {
    const candidates = this.peerCandidatesQueue[peerId] || [];
    this.peerCandidatesQueue[peerId] = undefined;
    this.logger.debug(`Draining candidates queue of ${candidates.length} candidates`);

    return candidates;
  }
}
