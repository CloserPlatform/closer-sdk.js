import { Context, Delivered, Edited, ID, Timestamp, Type } from "./protocol";

export interface Message {
  type: Type;
  id: ID;
  userId: ID;
  channel: ID;
  timestamp: Timestamp;
  body: string;
  tag: string;
  context?: Context;
  delivered?: Delivered;
  edited?: Edited;
}

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  creator: ID;
  users: Array<ID>;
  direct: boolean;
  orgId?: ID;
}

export interface Room {
  id: ID;
  name: string;
  created: Timestamp;
  direct: boolean;
  orgId?: ID;
  users: Array<ID>;
  marks: { [type: string]: number };
}
