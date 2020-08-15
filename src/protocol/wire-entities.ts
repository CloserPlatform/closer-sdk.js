import { ID, Timestamp } from './protocol';

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  invitees: ReadonlyArray<ID>;
  creator: ID;
  users: ReadonlyArray<ID>;
  direct: boolean;
  orgId?: ID;
}

export interface Room {
  id: ID;
  name: string;
  created: Timestamp;
  direct: boolean;
  orgId?: ID;
  users: ReadonlyArray<ID>;
  marks: { [type: string]: number };
}
