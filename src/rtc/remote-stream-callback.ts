import { ID } from '../protocol/protocol';

export interface RemoteStreamCallback {
    (peer: ID, stream: MediaStream): void;
}
