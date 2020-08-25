import { ID, Metadata } from '../protocol';
import { CallReason } from '../../calls/call-reason';

// tslint:disable-next-line:no-namespace
export namespace customEvents {

  export enum Subtag {
    ASSIGNEE_CHANGED = 'ASSIGNEE_CHANGED',
    ASSIGNEE_REMOVED = 'ASSIGNEE_REMOVED',
    CALL_ANSWERED = 'CALL_ANSWERED',
    CALL_ENDED = 'CALL_ENDED',
    FOLLOWER_ADDED = 'FOLLOWER_ADDED',
    FOLLOWER_REMOVED = 'FOLLOWER_REMOVED',
    ALL_FOLLOWERS_REMOVED = 'ALL_FOLLOWERS_REMOVED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    MEETING_SCHEDULED = 'MEETING_SCHEDULED',
    MEETING_RESCHEDULED = 'MEETING_RESCHEDULED',
    MEETING_CANCELLED = 'MEETING_CANCELLED',
    MESSAGE_WITH_ATTACHMENTS = 'MESSAGE_WITH_ATTACHMENTS',
    LEKTA_MESSAGE = 'LEKTA_MESSAGE',
    NOTE = 'NOTE',
  }

  export interface Context {
    readonly [Subtag.ASSIGNEE_CHANGED]: {
      readonly room: ID;
      readonly assignee: ID;
      readonly requesterId?: ID;
    };
    readonly [Subtag.ASSIGNEE_REMOVED]: {
      readonly assignee: ID;
    };
    readonly [Subtag.CALL_ANSWERED]: {
      readonly timestamp: number;
    };
    readonly [Subtag.CALL_ENDED]: {
      readonly duration: number;
      readonly userId: string;
      readonly reason: CallReason;
    };
    readonly [Subtag.FOLLOWER_ADDED]: {
      readonly user: ID;
      readonly requesterId?: ID;
    };
    readonly [Subtag.FOLLOWER_REMOVED]: {
      readonly user: ID;
      readonly requesterId?: ID;
    };
    readonly [Subtag.ALL_FOLLOWERS_REMOVED]: {};
    readonly [Subtag.STATUS_CHANGED]: {
      readonly status: 'waiting' | 'inProgress' | 'solved' | 'unsolved';
      readonly agent?: ID;
    };
    readonly [Subtag.MEETING_SCHEDULED]: {
      readonly id: ID;
      readonly agent: ID;
      readonly start: number;
      readonly duration: number;
    };
    readonly [Subtag.MEETING_RESCHEDULED]: {
      readonly id: ID;
      readonly agent: ID;
      readonly start: number;
      readonly duration: number;
    };
    readonly [Subtag.MEETING_CANCELLED]: {
      readonly id: ID;
      readonly agent: ID;
      readonly start: number;
      readonly duration: number;
    };
    readonly [Subtag.MESSAGE_WITH_ATTACHMENTS]: {
      readonly message?: string;
      readonly attachments: ReadonlyArray<{
        readonly id: string;
        readonly url: string;
        readonly contentType?: string;
        readonly fileName?: string;
        readonly previews: ReadonlyArray<string>;
        readonly size?: number;
        readonly metadata?: Metadata;
      }>;
    };
    readonly [Subtag.LEKTA_MESSAGE]: {};
    readonly [Subtag.NOTE]: {
      readonly user: ID;
      readonly body: string;
    };
  }

}
