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

function post(url: string, obj): XMLHttpRequest {
    let json = JSON.stringify(obj);
    let xhttp = new XMLHttpRequest();

    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(json);

    return xhttp;
}

export function withApiKey(sessionId: RatelID, apiKey: ApiKey, config: Config): Promise<Session> {
    return new Promise<Session>(function (resolve, reject) {
        config.sessionId = sessionId.toString();
        config.apiKey = apiKey;

        resolve(new Session(load(config)));
    });
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {

    let apiKeyRequest = new Promise<Session>(function (resolve, reject) {

        console.log(sessionData);
        console.log(config);

        let ratelHost = config.ratel.hostname + ":" + config.ratel.port;
        let ratelUrl = [config.ratel.protocol, "//", ratelHost, "/session/verifySig"].join("");
        let request = post(ratelUrl, sessionData);

        request.onload = function () {
            let apiKey: ApiKey;

            switch (request.status) {
                case 200:
                    apiKey = request.responseText;
                    withApiKey(sessionData.payload.sessionId, apiKey, config).then(resolve).catch(reject);
                    break;
                default:
                    reject(request.status);
            }
        };

    });

    return apiKeyRequest;
}
