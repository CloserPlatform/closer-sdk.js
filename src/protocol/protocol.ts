// // Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// // Datatypes:
// FIXME
// tslint:disable-next-line:no-any
export type Context = any;

// // REST API:
export interface CreateCall {
  users: ReadonlyArray<ID>;
  // tslint:disable-next-line:no-any
  metadata?: any;
}

export interface CreateDirectEntity {
  user: ID;
}

export interface CreateDirectCall extends CreateDirectEntity {
  timeout?: number;
  // tslint:disable-next-line:no-any
  metadata?: any;
}

export interface CreateDirectRoom extends CreateDirectEntity {
  context?: Context;
}

export interface CreateRoom {
  name: string;
}

export interface LeaveReason {
  reason: string;
}

export interface Invite {
  user: ID;
}

export interface PushRegistration {
  pushId: ID;
}

// tslint:disable-next-line:no-any
export const createCall = (users: ReadonlyArray<ID>, metadata?: any): CreateCall =>
  ({
    users,
    metadata
  });

// tslint:disable-next-line:no-any
export const createDirectCall = (user: ID, timeout?: number, metadata?: any): CreateDirectCall =>
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
  filter: ReadonlyArray<string>;
  customFilter: ReadonlyArray<string>;
}

export interface Paginated<T> {
  items: ReadonlyArray<T>;
  offset: number;
  limit: number;
}
