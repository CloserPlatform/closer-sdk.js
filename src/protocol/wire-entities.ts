import { ID, Timestamp } from './protocol';

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  creator: ID;
  users: ID[];
  direct: boolean;
  orgId?: ID;
}

export interface Room {
  id: ID;
  name: string;
  created: Timestamp;
  direct: boolean;
  orgId?: ID;
  users: ID[];
  marks: { [type: string]: number };
}
