// import { ArtichokeAPI } from "./api";
// import { Callback, EventHandler } from "./events";
// import { Logger } from "./logger";
// import { roomEvents } from "./protocol/events/room-events";
// import * as proto from "./protocol/protocol";
// import * as wireEntities from "./protocol/wire-entities";
// import { randomUUID, UUID } from "./utils";
//
// export class Message implements wireEntities.Message {
//   private readonly uuid: UUID = randomUUID();
//
//   public type: proto.Type = "message";
//   public id?: proto.ID;
//   public userId: proto.ID ;
//   public channel: proto.ID;
//   public timestamp: proto.Timestamp;
//   public body?: string;
//   public tag: string;
//   public context?: proto.Context;
//   public delivered?: proto.Delivered;
//   public edited?: proto.Edited;
//
//   private log: Logger;
//   private events: EventHandler;
//   private api: ArtichokeAPI;
//
//   constructor(message: wireEntities.Message, log: Logger, events: EventHandler, api: ArtichokeAPI) {
//     this.id = message.id;
//     this.body = message.body;
//     this.context = message.context;
//     this.userId = message.userId;
//     this.channel = message.channel;
//     this.tag = message.tag;
//     this.timestamp = message.timestamp;
//     this.delivered = message.delivered;
//     this.edited = message.edited;
//
//     this.log = log;
//     this.events = events;
//     this.api = api;
//   }
//
//   markDelivered(): Promise<void> {
//     if (!this.delivered && this.id) {
//       let ts = Date.now();
//
//       this.delivered = {
//         user: "FIXME", // FIXME We don't currently have the sessionId here...
//         timestamp: ts
//       };
//       return this.api.setDelivered(this.channel, this.id, ts);
//     } else {
//       return Promise.resolve();
//     }
//   }
//
//   onDelivery(callback: Callback<Message>) {
//     this.events.onConcreteEvent(roomEvents.MessageDelivered.tag, this.id, this.uuid,
//       (msg: roomEvents.MessageDelivered) => {
//         this.delivered = {
//           user: msg.authorId,
//           timestamp: msg.timestamp
//         };
//         callback(this);
//       });
//   }
//
//   edit(body: string) {
//     this.body = body;
//     let ts = Date.now();
//     this.edited = {
//       user: "FIXME", // FIXME We don't currently have the sessionId here...
//       timestamp: ts
//     };
//     this.api.updateMessage(this, ts); // FIXME Actually use the promise.
//   }
//
//   // TODO: edit
//   // onEdit(callback: Callback<Message>) {
//   //   this.events.onConcreteEvent(eventTypes.CHAT_EDITED, this.id, this.uuid, (msg: ChatEdited) => {
//   //     this.body = msg.message.body;
//   //     this.edited = msg.message.edited;
//   //     callback(this);
//   //   });
//   // }
//
//   // TODO markRead, onRead
// }
//
// export function createMessage(messageSent: wireEntities.Message, log: Logger,
//                               events: EventHandler, api: ArtichokeAPI): Message {
//   const msg: wireEntities.Message = {
//     type: "message",
//     id: (messageSent as roomEvents.MessageSent | roomEvents.CustomMessageSent).messageId,
//     body: (messageSent as roomEvents.MessageSent | roomEvents.CustomMessageSent).message,
//     context: (messageSent as roomEvents.CustomMessageSent).context,
//     userId: messageSent.authorId,
//     channel: messageSent.roomId,
//     tag: messageSent.tag,
//     timestamp: messageSent.timestamp,
//   };
//
//   return new Message(msg, log, events, api);
// }
