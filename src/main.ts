/// <reference types="es6-shim" />

// Main entry points:
export * from "./auth";

// Some useful types:
export { Artichoke as Chat } from "./artichoke";
export { GroupCall, DirectCall, callType } from "./call";
export { Config } from "./config";
export { Media } from "./media";
export { Message } from "./message";
export { Archivable, CallAction, CallArchivable, Metadata, RoomAction, RoomArchivable} from "./protocol/protocol";
export { BusinessRoom, DirectRoom, GroupRoom, Room, roomType } from "./room";
export { Session } from "./session";

// Other useful crap:
export { isBrowserSupported } from "./utils";

import * as api from "./api";
import * as logger from "./logger";
import * as events from "./protocol/events";
import * as protocol from "./protocol/protocol";

export { api, events, logger, protocol };
