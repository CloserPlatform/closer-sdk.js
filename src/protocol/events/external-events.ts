// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
// tslint:disable:max-file-line-count
import { DomainEvent } from './domain-event';

export namespace externalEvents {

  export abstract class ExternalEvent implements DomainEvent {
    public readonly tag: string;
    public readonly timestamp: number;
    public readonly __discriminator__: 'domainEvent';

    protected constructor(tag: string) {
      this.tag = tag;
    }
  }

  export class AllFollowersRemoved extends ExternalEvent {
    public static readonly tag = 'all_followers_removed';

    public readonly roomId: string;

    constructor(roomId: string) {
      super(AllFollowersRemoved.tag);
      this.roomId = roomId;
    }

    public static isAllFollowersRemoved = (e: DomainEvent): e is AllFollowersRemoved =>
    e.tag === AllFollowersRemoved.tag
  }

  export class AssigneeChanged extends ExternalEvent {
    public static readonly tag = 'assignee_changed';

    public readonly adviserId: string;
    public readonly roomId: string;

    constructor(adviserId: string, roomId: string) {
      super(AssigneeChanged.tag);
      this.adviserId = adviserId;
      this.roomId = roomId;
    }

    public static isAssigneeChanged = (e: DomainEvent): e is AssigneeChanged =>
    e.tag === AssigneeChanged.tag
  }

  export class AssigneeRemoved extends ExternalEvent {
    public static readonly tag = 'assignee_removed';

    public readonly adviserId: string;
    public readonly roomId: string;

    constructor(adviserId: string, roomId: string) {
      super(AssigneeRemoved.tag);
      this.adviserId = adviserId;
      this.roomId = roomId;
    }

    public static isAssigneeRemoved = (e: DomainEvent): e is AssigneeRemoved =>
    e.tag === AssigneeRemoved.tag
  }

  export enum ConversationStatus {
    Waiting = 'waiting',
    InProgress = 'inProgress',
    Solved = 'solved',
    Unsolved = 'unsolved'
  }

  export class ConversationStatusChanged extends ExternalEvent {
    public static readonly tag = 'conversation_status_changed';

    public readonly roomId: string;
    public readonly status: ConversationStatus;

    public readonly adviserId?: string;

    constructor(roomId: string, status: ConversationStatus, adviserId?: string) {
      super(ConversationStatusChanged.tag);
      this.roomId = roomId;
      this.status = status;
      this.adviserId = adviserId;
    }

    public static isConversationStatusChanged = (e: DomainEvent): e is ConversationStatusChanged =>
    e.tag === ConversationStatusChanged.tag
  }

  export class FollowerAdded extends ExternalEvent {
    public static readonly tag = 'follower_added';

    public readonly adviserId: string;
    public readonly roomId: string;

    constructor(adviserId: string, roomId: string) {
      super(FollowerAdded.tag);
      this.adviserId = adviserId;
      this.roomId = roomId;
    }

    public static isFollowerAdded = (e: DomainEvent): e is FollowerAdded =>
    e.tag === FollowerAdded.tag
  }

  export class FollowerRemoved extends ExternalEvent {
    public static readonly tag = 'follower_removed';

    public readonly adviserId: string;
    public readonly roomId: string;

    constructor(adviserId: string, roomId: string) {
      super(FollowerRemoved.tag);
      this.adviserId = adviserId;
      this.roomId = roomId;
    }

    public static isFollowerRemoved = (e: DomainEvent): e is FollowerRemoved =>
    e.tag === FollowerRemoved.tag
  }

  export class BackOfficeField {
    public readonly key: string;
    public readonly value: string;

    constructor(key: string, value: string) {
      this.key = key;
      this.value = value;
    }
  }

  export class Phone {
    public readonly region: string;
    public readonly number: string;

    constructor(region: string, n: string) {
      this.region = region;
      this.number = n;
    }
  }

  export class GuestProfileUpdated extends ExternalEvent {
    public static readonly tag = 'guest_profile_updated';

    public readonly backOfficeData: ReadonlyArray<BackOfficeField>;
    public readonly customerId: string;
    public readonly locale: string;
    public readonly roomId: string;
    public readonly timestamp: number;
    public readonly zoneId: string;

    public readonly email?: string;
    public readonly firstName?: string;
    public readonly lastName?: string;
    public readonly phone?: Phone;

    constructor(backOfficeData: ReadonlyArray<BackOfficeField>, customerId: string, locale: string, timestamp: number,
      roomId: string, zoneId: string, email?: string, firstName?: string, lastName?: string, phone?: Phone) {
        super(GuestProfileUpdated.tag);
        this.backOfficeData = backOfficeData;
        this.customerId = customerId;
        this.locale = locale;
        this.roomId = roomId;
        this.timestamp = timestamp;
        this.zoneId = zoneId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
      }

    public static isGuestProfileUpdated = (e: DomainEvent): e is GuestProfileUpdated =>
      e.tag === GuestProfileUpdated.tag
  }

  export enum InboxEntryType {
    Message = 'MESSAGE',
    Note = 'NOTE',
    Files = 'FILES'
  }

  export class LastMessageUpdated extends ExternalEvent {
    public static readonly tag = 'last_message_updated';

    public readonly body: string;
    public readonly roomId: string;
    public readonly userId: string;
    public readonly timestamp: number;
    public readonly type: InboxEntryType;

    constructor(body: string, roomId: string, timestamp: number, userId: string, type: InboxEntryType) {
      super(LastMessageUpdated.tag);
      this.body = body;
      this.roomId = roomId;
      this.timestamp = timestamp;
      this.userId = userId;
      this.type = type;
    }

    public static isLastMessageUpdated = (e: DomainEvent): e is LastMessageUpdated =>
      e.tag === LastMessageUpdated.tag
  }

  export class MeetingCancelled extends ExternalEvent {
    public static readonly tag = 'meeting_cancelled';

    public readonly adviserId: string;
    public readonly duration: number;
    public readonly meetingId: string;
    public readonly roomId: string;
    public readonly start: number;

    constructor(adviserId: string, duration: number, meetingId: string, roomId: string, start: number) {
      super(MeetingCancelled.tag);
      this.adviserId = adviserId;
      this.duration = duration;
      this.meetingId = meetingId;
      this.roomId = roomId;
      this.start = start;
    }

    public static isMeetingCancelled = (e: DomainEvent): e is MeetingCancelled =>
    e.tag === MeetingCancelled.tag
  }

  export class MeetingRescheduled extends ExternalEvent {
    public static readonly tag = 'meeting_rescheduled';

    public readonly adviserId: string;
    public readonly duration: number;
    public readonly meetingId: string;
    public readonly roomId: string;
    public readonly start: number;

    constructor(adviserId: string, duration: number, meetingId: string, roomId: string, start: number) {
      super(MeetingRescheduled.tag);
      this.adviserId = adviserId;
      this.duration = duration;
      this.meetingId = meetingId;
      this.roomId = roomId;
      this.start = start;
    }

    public static isMeetingRescheduled = (e: DomainEvent): e is MeetingRescheduled =>
    e.tag === MeetingRescheduled.tag
  }

  export class MeetingScheduled extends ExternalEvent {
    public static readonly tag = 'meeting_scheduled';

    public readonly adviserId: string;
    public readonly duration: number;
    public readonly meetingId: string;
    public readonly roomId: string;
    public readonly start: number;

    constructor(adviserId: string, duration: number, meetingId: string, roomId: string, start: number) {
      super(MeetingScheduled.tag);
      this.adviserId = adviserId;
      this.duration = duration;
      this.meetingId = meetingId;
      this.roomId = roomId;
      this.start = start;
    }

    public static isMeetingScheduled = (e: DomainEvent): e is MeetingScheduled =>
    e.tag === MeetingScheduled.tag
  }

  export class UpcomingMeeting {
    public readonly duration: number;
    public readonly guestName: string;
    public readonly langTag: string;
    public readonly meetingId: string;
    public readonly minutesToMeeting: number;
    public readonly roomId: string;
    public readonly start: number;

    constructor(duration: number, guestName: string, langTag: string, meetingId: string, minutesToMeeting: number,
      roomId: string, start: number) {
        this.duration = duration;
        this.guestName = guestName;
        this.langTag = langTag;
        this.meetingId = meetingId;
        this.minutesToMeeting = minutesToMeeting;
        this.roomId = roomId;
        this.start = start;
      }
  }

  export class NotificationUpcomingMeeting extends ExternalEvent {
    public static readonly tag = 'notification_upcoming_meeting';

    public readonly notification: UpcomingMeeting;

    constructor(notification: UpcomingMeeting) {
      super(NotificationUpcomingMeeting.tag);
      this.notification = notification;
    }

    public static isNotificationUpcomingMeeting = (e: DomainEvent): e is NotificationUpcomingMeeting =>
      e.tag === NotificationUpcomingMeeting.tag
  }

  export enum Presence {
    Available = 'available',
    Away = 'away',
    Unavailable = 'unavailable'
  }

  export class PresenceUpdated extends ExternalEvent {
    public static readonly tag = 'presence_updated';

    public readonly presence: Presence;
    public readonly timestamp: number;
    public readonly userId: string;

    constructor(presence: Presence, timestamp: number, userId: string) {
      super(PresenceUpdated.tag);
      this.presence = presence;
      this.timestamp = timestamp;
      this.userId = userId;
    }

    public static isPresenceUpdated = (e: DomainEvent): e is PresenceUpdated =>
      e.tag === PresenceUpdated.tag
  }

  export class TypingSent extends ExternalEvent {
    public static readonly tag = 'typing_sent';

    public readonly roomId: string;
    public readonly timestamp: number;
    public readonly userId: string;

    constructor(roomId: string, timestamp: number, userId: string) {
      super(TypingSent.tag);
      this.roomId = roomId;
      this.timestamp = timestamp;
      this.userId = userId;
    }

    public static isTypingSent = (e: DomainEvent): e is TypingSent =>
      e.tag === TypingSent.tag
  }

  export class UnreadCountUpdated extends ExternalEvent {
    public static readonly tag = 'unread_count_updated';

    public readonly roomId: string;
    public readonly unreadCount: number;

    constructor(roomId: string, unreadCount: number) {
      super(UnreadCountUpdated.tag);
      this.roomId = roomId;
      this.unreadCount = unreadCount;
    }

    public static isUnreadCountUpdated = (e: DomainEvent): e is UnreadCountUpdated =>
    e.tag === UnreadCountUpdated.tag
  }

  export enum ConversationTab {
    Waiting = 'waiting',
    Yours = 'yours',
    Followed = 'followed',
    InProgress = 'inProgress',
    Closed = 'closed'
  }

  export class UnreadTotalUpdated extends ExternalEvent {
    public static readonly tag = 'unread_total_updated';

    public readonly tab: ConversationTab;
    public readonly unreadCount: number;

    constructor(tab: ConversationTab, unreadCount: number) {
      super(UnreadCountUpdated.tag);
      this.tab = tab;
      this.unreadCount = unreadCount;
    }

    public static isUnreadTotalUpdated = (e: DomainEvent): e is UnreadTotalUpdated =>
    e.tag === UnreadTotalUpdated.tag
  }

}
