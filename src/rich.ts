import { Callback } from "./events";
import { Deliverable, Editable, Media, Message } from "./protocol/protocol";

export interface RichDeliverable extends Deliverable {
  markDelivered: () => void;
  onDelivery: (cb: Callback<Deliverable>) => void;
}

export interface RichEditable<T> extends Editable {
  edit: (arg: T) => void;
  onEdit: (cb: Callback<Editable>) => void;
}

export interface RichMessage extends Message, RichDeliverable, RichEditable<string> {}

export interface RichMedia extends Media, RichEditable<string> {}
