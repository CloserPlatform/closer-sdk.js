import { Callback } from "./events";
import { Deliverable, Editable } from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";

export interface RichDeliverable extends Deliverable {
  markDelivered: () => void;
  onDelivery: (cb: Callback<Deliverable>) => void;
}

export interface RichEditable<T> extends Editable {
  edit: (arg: T) => void;
  onEdit: (cb: Callback<Editable>) => void;
}

export interface RichMessage extends wireEntities.Message, RichDeliverable, RichEditable<string> {}

export interface RichMedia extends wireEntities.Media, RichEditable<string> {}
