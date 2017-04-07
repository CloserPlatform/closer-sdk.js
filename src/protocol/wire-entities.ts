import { Deliverable, Editable, ID, MediaItem, RoomArchivable, Timestamp } from "./protocol";

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  users: Array<ID>;
  direct: boolean;
}

export interface Media extends RoomArchivable, MediaItem, Editable {}

export interface Message extends RoomArchivable, Deliverable, Editable {
  body: string;
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
