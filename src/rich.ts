import { Callback } from "./events";
import { Deliverable, Editable } from "./protocol";

export interface RichDeliverable extends Deliverable {
    markDelivered: () => void;
    onDelivery: (cb: Callback<Deliverable>) => void;
}

export interface RichEditable<T> extends Editable {
    edit: (arg: T) => void;
    onEdit: (cb: Callback<Editable>) => void;
}
