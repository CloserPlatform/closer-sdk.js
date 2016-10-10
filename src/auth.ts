import {API, PromiseReject, PromiseResolve, Thunk} from "./api";
import {Config, load} from "./config";
import {Timestamp} from "./protocol";
import {Session} from "./session";

export type ApiKey = string;
export type Signature = string;
export type RatelID = number;

export interface Payload {
    organizationId: RatelID;
    sessionId: RatelID;
    timestamp: Timestamp;
}

export interface SessionData {
    payload: Payload;
    signature: Signature;
}

export function withApiKey(sessionId: RatelID, apiKey: ApiKey, config: Config): Promise<Session> {
    return new Promise<Session>(function (resolve, reject) {
        config.sessionId = sessionId.toString();
        config.apiKey = apiKey;

        resolve(new Session(load(config)));
    });
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {

    console.log(sessionData);
    console.log(config);

    let ratelHost = config.ratel.hostname + ":" + config.ratel.port;
    let ratelUrl = [config.ratel.protocol, "//", ratelHost].join("");

    function callBack(xhttp: XMLHttpRequest, resolve: PromiseResolve<Session>, reject: PromiseReject): Thunk {
        return function () {
            if (xhttp.readyState === 4) {
                switch (xhttp.status) {
                    case 200:
                        let apiKey: ApiKey = xhttp.responseText;
                        withApiKey(sessionData.payload.sessionId, apiKey, config).then(resolve).catch(reject);
                        break;
                    default:
                        reject(JSON.parse(xhttp.responseText));
                }
            }
        };
    }

    return API.getApiKeyPostRequest(callBack)([ratelUrl, "session/verifySig"], sessionData);
}
