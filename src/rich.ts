import { Callback } from "./events";
import { ArchivableWithType, Deliverable, Editable, Media, Message } from "./protocol";

export interface RichDeliverable extends Deliverable {
    markDelivered: () => void;
    onDelivery: (cb: Callback<Deliverable>) => void;
}

export interface RichEditable<T> extends Editable {
    edit: (arg: T) => void;
    onEdit: (cb: Callback<Editable>) => void;
}

export interface RichMessage extends Message, ArchivableWithType, RichDeliverable, RichEditable<string> {}

export interface RichMedia extends Media, ArchivableWithType, RichEditable<string> {}
