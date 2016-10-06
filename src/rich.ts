import { Callback } from "./events";
import { Deliverable } from "./protocol";

export interface RichDeliverable extends Deliverable {
    markDelivered: () => void;
    onDelivery: (cb: Callback<Deliverable>) => void;
}
