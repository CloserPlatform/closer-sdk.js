import { Callback } from "../events";
// Common types:
import { actionTypes } from "./wire-events";
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// Datatypes:
export interface RoomAction extends RoomArchivable {
  action: actionTypes.JOINED | actionTypes.LEFT | actionTypes.INVITED;
  reason?: string;
  invitee?: ID;
}

export interface Archivable {
  type: Type;
  id: ID;
  user: ID;
  timestamp: Timestamp;
}

export interface RoomArchivable extends Archivable {
    room: ID;
}

export interface CallAction extends CallArchivable {
  action: actionTypes.JOINED | actionTypes.TRANSFERRED | actionTypes.LEFT| actionTypes.INVITED
    | actionTypes.REJECTED | actionTypes.ANSWERED;
  reason?: string;
  invitee?: ID;
}

export interface CallArchivable extends Archivable {
  call: ID;
}

export interface Deliverable {
  delivered?: Delivered;
}

export interface RichDeliverable extends Deliverable {
  markDelivered: () => void;
  onDelivery: (cb: Callback<Deliverable>) => void;
}

export interface Delivered extends UserTimestamp {}

export interface Editable {
  edited?: Edited;
}

export interface RichEditable<T> extends Editable {
  edit: (arg: T) => void;
  onEdit: (cb: Callback<Editable>) => void;
}

export interface Edited extends UserTimestamp {}

export interface MediaItem {
  mimeType: string;
  content: string;
  description: string;
}

export interface Context {
  type: Type;
  payload: any;
}

export interface Metadata extends RoomArchivable {
  payload: any;
}

export interface UserTimestamp {
  user: ID;
  timestamp: Timestamp;
}

// REST API:
export interface CreateCall {
  users: Array<ID>;
}

export interface CreateDirectCall extends CreateDirectEntity {
  timeout?: number;
}

export interface CreateDirectEntity {
  user: ID;
}

export interface CreateDirectRoom extends CreateDirectEntity {}

export interface CreateRoom {
  name: string;
}

export interface LeaveReason {
  reason: string;
}

export interface Invite {
  user: ID;
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

export function createDirectRoom(user: ID): CreateDirectRoom {
  return {
    user
  };
}

export function invite(user): Invite {
  return {
    user
  };
}
