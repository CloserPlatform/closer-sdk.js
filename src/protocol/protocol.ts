// Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// Datatypes:
export interface RoomAction extends RoomArchivable {
  action: "joined" | "left" | "invited";
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

export interface Bot {
  id: ID;
  name: string;
  creator: ID;
  callback?: string;
}

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  users: Array<ID>;
  direct: boolean;
}

export interface CallAction extends CallArchivable {
  action: "joined" | "left" | "invited" | "rejected" | "answered" | "audio_muted"
    | "audio_unmuted" | "video_paused" | "video_unpaused";
  reason?: string;
  invitee?: ID;
}

export interface CallArchivable extends Archivable {
  call: ID;
}

export interface Deliverable {
  delivered?: Delivered;
}

export interface Delivered extends UserTimestamp {}

export interface Editable {
  edited?: Edited;
}

export interface Edited extends UserTimestamp {}

export interface Media extends RoomArchivable, MediaItem, Editable {}

export interface MediaItem {
  mimeType: string;
  content: string;
  description: string;
}

export interface Message extends RoomArchivable, Deliverable, Editable {
  body: string;
}

export interface Metadata extends RoomArchivable {
  payload: any;
}

export interface Room {
  id: ID;
  name: string;
  created: Timestamp;
  users: Array<ID>;
  direct: boolean;
  orgId?: ID;
  externalId?: string;
  mark?: number;
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

export interface CreateBot {
  name: string;
  callback?: string;
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

export function createBot(name: string, callback?: string): CreateBot {
  return {
    name,
    callback
  };
}
