// tslint:disable:max-file-line-count
import * as wireEntities from '../protocol/wire-entities';
import { rtcCommands } from '../protocol/commands/rtc-commands';
import * as proto from '../protocol/protocol';
import { DomainEvent } from '../protocol/events/domain-event';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import { CallReason } from '../calls/call-reason';
import { chatEvents } from '../protocol/events/chat-events';
import { callEvents } from '../protocol/events/call-events';
import { roomCommand } from '../protocol/commands/room-commands';
import { Observable, Subject } from 'rxjs';
import { callCommand } from '../protocol/commands/call-commands';
import { WebsocketClient } from '../http/websocket-client';
import { HttpClient } from '../http/http-client';
import { tap, share } from 'rxjs/operators';
import { serverCommands } from '../protocol/commands/server-command';

export class ArtichokeApi {

  private readonly callPath = 'calls';
  private readonly roomPath = 'rooms';
  private readonly pushNotificationsPath = 'push';

  private readonly domainEvent = new Subject<DomainEvent>();
  private readonly connectionEvent: Observable<serverEvents.ServerEvent>;

  constructor(
    public sessionId: proto.ID,
    private websocketClient: WebsocketClient,
    private httpClient: HttpClient,
  ) {
    this.connectionEvent = this.websocketClient.connection$.pipe(
      tap(event => this.handleDomainEvent(event)),
      share()
    );
  }

  public get connection$(): Observable<serverEvents.ServerEvent> {
    return this.connectionEvent;
  }

  public get domainEvent$(): Observable<DomainEvent> {
    return this.domainEvent.asObservable();
  }

  // GroupCall API:
  public sendDescription(callId: proto.ID, sessionId: proto.ID, description: RTCSessionDescriptionInit): void {
    return this.websocketClient.send(new rtcCommands.SendDescription(callId, sessionId, description));
  }

  public sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: RTCIceCandidate): void {
    return this.websocketClient.send(new rtcCommands.SendCandidate(callId, sessionId, candidate));
  }

  public createCall(sessionIds: ReadonlyArray<proto.ID>, metadata?: proto.Metadata): Promise<wireEntities.Call> {
    return this.httpClient.post(this.callPath, proto.createCall(sessionIds, metadata));
  }

  public createDirectCall(
    sessionId: proto.ID, timeout?: number, metadata?: proto.Metadata
  ): Promise<wireEntities.Call> {
    return this.httpClient.post(this.callPath, proto.createDirectCall(sessionId, timeout, metadata));
  }

  public getCall(callId: proto.ID): Promise<wireEntities.Call> {
    return this.httpClient.get(`${this.callPath}/${callId}`);
  }

  public getCalls(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.httpClient.get(this.callPath);
  }

  public getActiveCalls(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.httpClient.get(`${this.callPath}/active`);
  }

  public getCallsWithPendingInvitations(): Promise<ReadonlyArray<wireEntities.Call>> {
    return this.httpClient.get(`${this.callPath}/pending-invitation`);
  }

  public getCallHistory(callId: proto.ID): Promise<ReadonlyArray<callEvents.CallEvent>> {
    return this.httpClient.get(`${this.callPath}/${callId}/history`);
  }

  public getCallUsers(callId: proto.ID): Promise<ReadonlyArray<proto.ID>> {
    return this.httpClient.get(`${this.callPath}/${callId}/users`);
  }

  public answerCall(callId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/answer`);
  }

  public rejectCall(callId: proto.ID, reason: CallReason): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/reject`, proto.leaveReason(reason));
  }

  public joinCall(callId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/join`);
  }

  public pullCall(callId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/pull`);
  }

  public leaveCall(callId: proto.ID, reason: CallReason): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/leave`, proto.leaveReason(reason));
  }

  public inviteToCall(callId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.callPath}/${callId}/invite/${sessionId}`);
  }

  // Room API:
  public createRoom(name: string): Promise<wireEntities.Room> {
    return this.httpClient.post(this.roomPath, proto.createRoom(name));
  }

  public createDirectRoom(sessionId: proto.ID, context?: proto.Context): Promise<wireEntities.Room> {
    return this.httpClient.post(this.roomPath, proto.createDirectRoom(sessionId, context));
  }

  public getRoom(roomId: proto.ID): Promise<wireEntities.Room> {
    return this.httpClient.get(`${this.roomPath}/${roomId}`);
  }

  public getRooms(): Promise<ReadonlyArray<wireEntities.Room>> {
    return this.httpClient.get(this.roomPath);
  }

  public getRoster(): Promise<ReadonlyArray<wireEntities.Room>> {
    return this.httpClient.get(`${this.roomPath}/roster`);
  }

  public getRoomUsers(roomId: proto.ID): Promise<ReadonlyArray<proto.ID>> {
    return this.httpClient.get(`${this.roomPath}/${roomId}/users`);
  }

  public getRoomHistoryLast(
    roomId: proto.ID,
    count: number,
    filter?: proto.HistoryFilter
  ): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    const filters = filter ?
      filter.filter.map(tag => `&filter=${tag}`).join('') +
      filter.customFilter.map(tag => `&customFilter=${tag}`).join('') : '';

    const endpoint = `history/last?count=${count}${filters}`;

    return this.httpClient.getPaginated(`${this.roomPath}/${roomId}/${endpoint}`);
  }

  public getRoomHistoryPage(
    roomId: proto.ID,
    offset: number,
    limit: number,
    filter?: proto.HistoryFilter
  ): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    const filters = filter ?
      filter.filter.map(tag => `&filter=${tag}`).join('') +
      filter.customFilter.map((tag) => `&customFilter=${tag}`).join('') : '';

    const endpoint = `history/page?offset=${offset}&limit=${limit}${filters}`;

    return this.httpClient.getPaginated(`${this.roomPath}/${roomId}/${endpoint}`);
  }

  public joinRoom(roomId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.roomPath}/${roomId}/join`);
  }

  public leaveRoom(roomId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.roomPath}/${roomId}/leave`);
  }

  public inviteToRoom(roomId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.roomPath}/${roomId}/invite`, proto.invite(sessionId));
  }

  public sendMessage(roomId: proto.ID, body: string, context?: proto.Context): Observable<chatEvents.Received> {
    return this.websocketClient.ask(new roomCommand.SendMessage(roomId, body, context || {}));
  }

  public sendCustom(roomId: proto.ID, body: string, subtag: string,
                    context: proto.Context): Observable<chatEvents.Received> {
    return this.websocketClient.ask(new roomCommand.SendCustomMessage(roomId, body, subtag, context));
  }

  public sendTyping(roomId: proto.ID): void {
    return this.websocketClient.send(new roomCommand.SendTyping(roomId));
  }

  public setMark(roomId: proto.ID, timestamp: proto.Timestamp): void {
    return this.websocketClient.send(new roomCommand.SendMark(roomId, timestamp));
  }

  public setAudioToggle(callId: proto.ID, enabled: boolean, timestamp: proto.Timestamp): void {
    return this.websocketClient.send(new callCommand.AudioStreamToggle(callId, enabled, timestamp));
  }

  public setVideoToggle(
    callId: proto.ID,
    enabled: boolean,
    timestamp: proto.Timestamp,
    content?: proto.VideoContentType
  ): void {
    return this.websocketClient.send(new callCommand.VideoStreamToggle(callId, enabled, timestamp, content));
  }

  // Archive API:
  public setDelivered(roomId: proto.ID, messageId: proto.ID, timestamp: proto.Timestamp): void {
    return this.websocketClient.send(new roomCommand.ConfirmMessageDelivery(roomId, messageId, timestamp));
  }

  // Push Notifications API:
  public registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.httpClient.post(`${this.pushNotificationsPath}/register`, proto.pushRegistration(pushId));
  }

  public unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.httpClient.delete(`${this.pushNotificationsPath}/unregister/${pushId}`);
  }

  // SERVER API
  public sendHeartbeat(timestamp: number): void {
    return this.websocketClient.send(new serverCommands.InputHeartbeat(timestamp));
  }

  private handleDomainEvent(event: DomainEvent): void {
    if (serverEvents.Hello.is(event)) {
      this.httpClient.setDeviceId(event.deviceId);
    }
    this.domainEvent.next(event);
  }
}
