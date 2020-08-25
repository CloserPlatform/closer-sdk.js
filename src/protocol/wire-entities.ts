import { ID, Timestamp } from './protocol';

export interface Call {
  readonly id: ID;
  readonly created: Timestamp;
  readonly ended?: Timestamp;
  readonly invitees: ReadonlyArray<ID>;
  readonly creator: ID;
  readonly users: ReadonlyArray<ID>;
  readonly direct: boolean;
  readonly orgId?: ID;
}

export interface Room {
  readonly id: ID;
  readonly name: string;
  readonly created: Timestamp;
  readonly direct: boolean;
  readonly orgId?: ID;
  readonly users: ReadonlyArray<ID>;
  readonly marks: { readonly [type: string]: number };
}
