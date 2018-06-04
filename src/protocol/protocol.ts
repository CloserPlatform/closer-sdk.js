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
  users: Array<ID>;
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

export function createCall(users: Array<ID>): CreateCall {
  return {
    users
  };
}

export function createDirectCall(user: ID, timeout?: number): CreateDirectCall {
  return {
    user,
    timeout
  };
}

export function leaveReason(reason: string): LeaveReason {
  return {
    reason
  };
}

export function createRoom(name: string): CreateRoom {
  return {
    name
  };
}

export function createDirectRoom(user: ID, context?: Context): CreateDirectRoom {
  return {
    user,
    context
  };
}

export function invite(user): Invite {
  return {
    user
  };
}

export function pushRegistration(pushId: ID): PushRegistration {
  return {
    pushId,
  };
}

export interface HistoryFilter {
  filter: Array<string>;
  customFilter: Array<string>;
}

export interface Paginated<T> {
  items: Array<T>;
  offset: number;
  limit: number;
}
