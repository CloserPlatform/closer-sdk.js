import { ID } from '../protocol';
import { CallReason } from '../../apis/call-reason';

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
    [Subtag.ASSIGNEE_CHANGED]: {
      room: ID;
      assignee: ID;
    };
    [Subtag.ASSIGNEE_REMOVED]: {
      assignee: ID;
    };
    [Subtag.CALL_ANSWERED]: {
      timestamp: number;
    };
    [Subtag.CALL_ENDED]: {
      duration: number;
      userId: string;
      reason: CallReason;
    };
    [Subtag.FOLLOWER_ADDED]: {
      user: ID;
    };
    [Subtag.FOLLOWER_REMOVED]: {
      user: ID;
    };
    [Subtag.ALL_FOLLOWERS_REMOVED]: {};
    [Subtag.STATUS_CHANGED]: {
      status: 'waiting' | 'inProgress' | 'solved' | 'unsolved';
      agent?: ID;
    };
    [Subtag.MEETING_SCHEDULED]: {
      id: ID;
      agent: ID;
      start: number;
      duration: number;
    };
    [Subtag.MEETING_RESCHEDULED]: {
      id: ID;
      agent: ID;
      start: number;
      duration: number;
    };
    [Subtag.MEETING_CANCELLED]: {
      id: ID;
      agent: ID;
      start: number;
      duration: number;
    };
    [Subtag.MESSAGE_WITH_ATTACHMENTS]: {
      message?: string;
      attachments: ReadonlyArray<{
        id: string;
        url: string;
        contentType?: string;
        fileName?: string;
        previews: ReadonlyArray<string>;
        size?: number;
        // tslint:disable-next-line:no-any
        metadata?: any;
      }>;
    };
    [Subtag.LEKTA_MESSAGE]: {};
    [Subtag.NOTE]: {
      user: ID;
      body: string;
    };
  }

}
