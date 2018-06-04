import { ID } from '../protocol/protocol';

export type RemoteStreamCallback = (peer: ID, stream: MediaStream) => void;
