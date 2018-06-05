// tslint:disable:max-file-line-count
import * as wireEntities from '../protocol/wire-entities';
import { rtcCommands } from '../protocol/commands/rtc-commands';
import * as proto from '../protocol/protocol';
import { Logger } from '../logger';
import { ApiKey } from '../auth/auth';
import { ChatConfig } from '../config/config';
import { DomainEvent } from '../protocol/events/domain-event';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import { CallReason } from './call-reason';
import { chatEvents } from '../protocol/events/chat-events';
// tslint:disable-next-line:no-duplicate-imports
import { PushRegistration } from '../protocol/protocol';
import { ApiHeaders } from './api-headers';
import { callEvents } from '../protocol/events/call-events';
import { roomCommand } from '../protocol/commands/room-commands';
import { Callback } from '../events/event-handler';
import { APIWithWebsocket } from './api-with-websocket';

export class ArtichokeAPI extends APIWithWebsocket {
  public sessionId: proto.ID;

  protected url: string;

  private deviceId: proto.ID;
  private callPath = 'calls';
  private roomPath = 'rooms';
  private pushNotifsPath = 'push';

  private wsUrl: string;

  private apiHeaders: ApiHeaders = new ApiHeaders();

  constructor(sessionId: proto.ID, apiKey: ApiKey, config: ChatConfig, log: Logger) {
    super(log);

    this.sessionId = sessionId;
    this.apiHeaders.apiKey = apiKey;

    const pathname = config.pathname ? config.pathname : '';

    const host = config.hostname + (config.port === '' ? '' : `:${config.port}`);
    this.url = [config.protocol, '//', host, pathname, '/api'].join('');
    const wsProtocol = config.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = [wsProtocol, '//', host, pathname, '/ws/', apiKey].join('');
  }

  public onEvent(callback: Callback<DomainEvent>): void {
    super.onEvent((event: DomainEvent) => {
      // FIXME Apply this bandaid elsewhere.
      if (event.tag === serverEvents.Hello.tag) {
        this.deviceId = (event as serverEvents.Hello).deviceId;
        this.apiHeaders.deviceId = this.deviceId;
      }

      callback(event);
    });
  }

  public connect(): void {
    const url = this.deviceId ? [this.wsUrl, '/reconnect/', this.deviceId].join('') : this.wsUrl;
    super.connect(url);
  }

  // GroupCall API:
  public sendDescription(callId: proto.ID, sessionId: proto.ID, description: RTCSessionDescriptionInit): Promise<void> {
    return this.send(new rtcCommands.SendDescription(callId, sessionId, description));
  }

  public sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: RTCIceCandidate): Promise<void> {
    return this.send(new rtcCommands.SendCandidate(callId, sessionId, candidate));
  }

  public createCall(sessionIds: ReadonlyArray<proto.ID>): Promise<wireEntities.Call> {
    return this.postAuth<proto.CreateCall, wireEntities.Call>(
      [this.url, this.callPath], proto.createCall(sessionIds));
  }

  public createDirectCall(sessionId: proto.ID, timeout?: number): Promise<wireEntities.Call> {
    return this.postAuth<proto.CreateDirectCall, wireEntities.Call>([this.url, this.callPath],
      proto.createDirectCall(sessionId, timeout));
  }

  public getCall(callId: proto.ID): Promise<wireEntities.Call> {
    return this.getAuth<wireEntities.Call>([this.url, this.callPath, callId]);
  }

  public getCalls(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.getAuth<ReadonlyArray<wireEntities.Call>>([this.url, this.callPath]);
  }

  public getActiveCalls(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.getAuth<ReadonlyArray<wireEntities.Call>>([this.url, this.callPath, 'active']);
  }

  public getCallsWithPendingInvitations(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.getAuth<ReadonlyArray<wireEntities.Call>>([this.url, this.callPath, 'pending-invitation']);
  }

  public getCallHistory(callId: proto.ID): Promise<ReadonlyArray<callEvents.CallEvent>> {
    return this.getAuth<ReadonlyArray<callEvents.CallEvent>>([this.url, this.callPath, callId, 'history']);
  }

  public getCallUsers(callId: proto.ID): Promise<ReadonlyArray<proto.ID>> {
    return this.getAuth<ReadonlyArray<proto.ID>>([this.url, this.callPath, callId, 'users']);
  }

  public answerCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, 'answer']);
  }

  public rejectCall(callId: proto.ID, reason: CallReason): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, 'reject'],
      proto.leaveReason(reason));
  }

  public joinCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, 'join']);
  }

  public pullCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, 'pull']);
  }

  public leaveCall(callId: proto.ID, reason: CallReason): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, 'leave'],
      proto.leaveReason(reason));
  }

  public inviteToCall(callId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, 'invite', sessionId]);
  }

  // GroupRoom API:
  public createRoom(name: string): Promise<wireEntities.Room> {
    return this.postAuth<proto.CreateRoom, wireEntities.Room>([this.url, this.roomPath], proto.createRoom(name));
  }

  public createDirectRoom(sessionId: proto.ID, context?: proto.Context): Promise<wireEntities.Room> {
    return this.postAuth<proto.CreateDirectRoom, wireEntities.Room>(
      [this.url, this.roomPath],
      proto.createDirectRoom(sessionId, context)
    );
  }

  public getRoom(roomId: proto.ID): Promise<wireEntities.Room> {
    return this.getAuth<wireEntities.Room>([this.url, this.roomPath, roomId]);
  }

  public getRooms(): Promise<ReadonlyArray<wireEntities.Room>> {
    return this.getAuth<ReadonlyArray<wireEntities.Room>>([this.url, this.roomPath]);
  }

  public getRoster(): Promise<ReadonlyArray<wireEntities.Room>> {
    return this.getAuth<ReadonlyArray<wireEntities.Room>>([this.url, this.roomPath, 'roster']);
  }

  public getRoomUsers(roomId: proto.ID): Promise<ReadonlyArray<proto.ID>> {
    return this.getAuth<ReadonlyArray<proto.ID>>([this.url, this.roomPath, roomId, 'users']);
  }

  public getRoomHistoryLast(roomId: proto.ID,
                            count: number,
                            filter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    const filters = filter ?
      filter.filter.map(tag => `&filter=${tag}`).join('') +
      filter.customFilter.map(tag => `&customFilter=${tag}`).join('') : '';

    const endpoint = `history/last?count=${count}${filters}`;

    return this.getAuthPaginated<roomEvents.RoomEvent>([this.url, this.roomPath, roomId, endpoint]);
  }

  public getRoomHistoryPage(roomId: proto.ID,
                            offset: number,
                            limit: number,
                            filter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    const filters = filter ?
      filter.filter.map(tag => `&filter=${tag}`).join('') +
      filter.customFilter.map((tag) => `&customFilter=${tag}`).join('') : '';

    const endpoint = `history/page?offset=${offset}&limit=${limit}${filters}`;

    return this.getAuthPaginated<roomEvents.RoomEvent>([this.url, this.roomPath, roomId, endpoint]);
  }

  public joinRoom(roomId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.roomPath, roomId, 'join']);
  }

  public leaveRoom(roomId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.roomPath, roomId, 'leave']);
  }

  public inviteToRoom(roomId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.postAuth<proto.Invite, void>([this.url, this.roomPath, roomId, 'invite'], proto.invite(sessionId));
  }

  // tslint:disable-next-line:ban-types
  public sendMessage(roomId: proto.ID, body: string, context?: Object): Promise<chatEvents.Received> {
    return this.ask<chatEvents.Received>(new roomCommand.SendMessage(roomId, body, context || {}));
  }

  public sendCustom(roomId: proto.ID, body: string, subtag: string,
                    context: proto.Context): Promise<chatEvents.Received> {
    return this.ask<chatEvents.Received>(new roomCommand.SendCustomMessage(roomId, body, subtag, context));
  }

  public sendTyping(roomId: proto.ID): Promise<void> {
    return this.send(new roomCommand.SendTyping(roomId));
  }

  public setMark(roomId: proto.ID, timestamp: proto.Timestamp): Promise<void> {
    return this.send(new roomCommand.SendMark(roomId, timestamp));
  }

  // Archive API:
  public setDelivered(roomId: proto.ID, messageId: proto.ID, timestamp: proto.Timestamp): Promise<void> {
    return this.send(new roomCommand.ConfirmMessageDelivery(roomId, messageId, timestamp));
  }

  // Push Notifications API:
  public registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.postAuth<PushRegistration, void>([this.url, this.pushNotifsPath, 'register'],
      proto.pushRegistration(pushId));
  }

  public unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.deleteAuth([this.url, this.pushNotifsPath, 'unregister', pushId]);
  }

  private postAuth<Body, Response>(path: ReadonlyArray<string>, body?: Body): Promise<Response> {
    return this.post<Body, Response>(path, this.apiHeaders.getHeaders(), body);
  }

  private deleteAuth<Body, Response>(path: ReadonlyArray<string>, body?: Body): Promise<Response> {
    return this.delete<Body, Response>(path, this.apiHeaders.getHeaders(), body);
  }

  private getAuth<Response>(path: ReadonlyArray<string>): Promise<Response> {
    return this.get<Response>(path, this.apiHeaders.getHeaders());
  }

  private getAuthPaginated<Item>(path: ReadonlyArray<string>): Promise<proto.Paginated<Item>> {
    return this.getRaw(path, this.apiHeaders.getHeaders())
      .then((resp) => {
        try {
          const items = JSON.parse(resp.responseText) as ReadonlyArray<Item>;
          const offset = parseInt(resp.getResponseHeader('X-Paging-Offset') || '0', 10);
          const limit = parseInt(resp.getResponseHeader('X-Paging-Limit') || '0', 10);

          return {
            items,
            offset,
            limit
          };
        } catch (err) {
          this.log.debug(
            `Api - getAuthPaginated: Cannot parse response: ${err}\n Tried to parse:  ${resp.responseText}`);
          throw new Error('Api - getAuthPaginated: Cannot parse response');
        }
      });
  }
}
