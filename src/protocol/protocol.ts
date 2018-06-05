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
  users: ID[];
}

export interface CreateDirectCall extends CreateDirectEntity {
  timeout?: number;
}

export interface CreateDirectEntity {
  user: ID;
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

export const createCall = (users: ID[]): CreateCall =>
  ({
    users
  });

export const createDirectCall = (user: ID, timeout?: number): CreateDirectCall =>
  ({
    user,
    timeout
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
  filter: string[];
  customFilter: string[];
}

export interface Paginated<T> {
  items: T[];
  offset: number;
  limit: number;
}
