// // Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;
export type ApiKey = ID;
export type DeviceId = ID;

export type Signature = string;

export interface Payload {
  readonly orgId: ID;
  readonly externalId: ID;
  readonly timestamp: Timestamp;
}

export interface SessionData {
  readonly payload: Payload;
  readonly signature: Signature;
}

export interface AgentContext {
  readonly id: ID;
  readonly orgId: ID;
  readonly apiKey: ApiKey;
}

// // Datatypes:
// tslint:disable-next-line:no-any
export type Context = any;
// tslint:disable-next-line:no-any
export type Metadata = any;

export type VideoContentType = 'camera' | 'screen';

// // REST API:
export interface CreateCall {
  readonly users: ReadonlyArray<ID>;
  readonly metadata?: Metadata;
}

export interface CreateDirectEntity {
  readonly user: ID;
}

export interface CreateDirectCall extends CreateDirectEntity {
  readonly timeout?: number;
  readonly metadata?: Metadata;
}

export interface CreateDirectRoom extends CreateDirectEntity {
  readonly context?: Context;
}

export interface CreateRoom {
  readonly name: string;
}

export interface LeaveReason {
  readonly reason: string;
}

export interface Invite {
  readonly user: ID;
}

export interface PushRegistration {
  readonly pushId: ID;
}

export const createCall = (users: ReadonlyArray<ID>, metadata?: Metadata): CreateCall =>
  ({
    users,
    metadata
  });

export const createDirectCall = (user: ID, timeout?: number, metadata?: Metadata): CreateDirectCall =>
  ({
    user,
    timeout,
    metadata
  });

export const leaveReason = (reason: string): LeaveReason =>
  ({
    reason
  });

export const createRoom = (name: string): CreateRoom =>
  ({
    name
  });

export const createDirectRoom = (user: ID, context?: Context): CreateDirectRoom =>
  ({
    user,
    context
  });

export const invite = (user: ID): Invite =>
  ({
    user
  });

export const pushRegistration = (pushId: ID): PushRegistration =>
  ({
    pushId,
  });

export interface HistoryFilter {
  readonly filter: ReadonlyArray<string>;
  readonly customFilter: ReadonlyArray<string>;
}

export interface Paginated<T> {
  readonly items: ReadonlyArray<T>;
  readonly offset: number;
  readonly limit: number;
}
