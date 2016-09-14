import { Config, load } from "./config";
import { Timestamp } from "./protocol";
import { Session } from "./session";

export type ApiKey = string;
export type Signature = string;
export type RatelID = number;
export type SecretKey = string;

export interface Payload {
    organizationId: RatelID;
    sessionId: RatelID;
    timestamp: Timestamp;
}

export interface SessionData {
    payload: Payload;
    signature: Signature;
}

function post(url: string, obj) {
    let json = JSON.stringify(obj);
    let xhttp = new XMLHttpRequest();

        xhttp.open("POST", url, false);
    xhttp.setRequestHeader("Content-Type", "application/json");
    try {
        xhttp.send(json);
    } catch (e) {
        console.log(e);
    }

    return xhttp;
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {
    console.log(sessionData);
    console.log(config);
    let response = post("http://localhost:8080/session/verifySig", sessionData); // TODO: can't be hardcoded
    let apiKey: ApiKey;

    switch (response.status) {
        case 200:
            apiKey = response.responseText;
            break;
        case 401:
            console.log("Unauthorized");
            return Promise.reject<Session>(new Error());
        case 404:
            console.log("Not Found");
            return Promise.reject<Session>(new Error());
        default:
            console.log("Unknown error" + response.status);
            return Promise.reject<Session>(new Error());
    }

    console.log(apiKey);
    return withApiKey(sessionData.payload.sessionId, apiKey, config);
}

export function withApiKey(sessionId: RatelID, apiKey: ApiKey, config: Config): Promise<Session> {
    return new Promise(function (resolve, reject) {
        // TODO Check supplied apiKey.
        config.sessionId = sessionId.toString();
        config.apiKey = apiKey;

        resolve(new Session(load(config)));
    });
}
