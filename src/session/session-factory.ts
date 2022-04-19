import { Session } from './session';
import { Artichoke } from '../artichoke/artichoke';
import { ArtichokeApi } from '../artichoke/artichoke-api';
import { LoggerFactory } from '../logger/logger-factory';
import { ID, ApiKey } from '../protocol/protocol';
import { Config } from '../config/config';
import { HttpClient } from '../http/http-client';
import { WebsocketClient } from '../http/websocket-client';
import { ArtichokeMessage } from '../protocol/artichoke-message';
import { ReconnectableWebSocket } from '../http/reconnectable-websocket';
import { webSocket } from 'rxjs/webSocket';
import { UUIDGenerator } from '../utils/uuid-generator';
import { XMLHttpRequestFactory } from '../http/xml-http-request-factory';
import { AdditionalHeadersOptions, ApiHeaders } from '../http/api-headers';
import { RoomFactory } from '../rooms/room-factory';
import { CallFactory } from '../calls/call-factory';
import { WebRTCStats } from '../rtc/stats/webrtc-stats';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';
import { RTCPoolFactory } from '../rtc/rtc-pool-factory';
import { Spinner } from '../spinner/spinner';
import { SpinnerApi } from '../spinner/spinner-api';
import { Password, Email } from '../spinner/protocol';
import { GuestSession } from './guest-session';

export class SessionFactory {

    constructor(
        private readonly config: Config,
        private readonly loggerFactory: LoggerFactory,
    ) {
    }

    public async createWithNewGuest(orgId: ID, options: AdditionalHeadersOptions = {}): Promise<GuestSession> {
        const apiHeaders = new ApiHeaders('', options);
        const spinner = this.createSpinner(apiHeaders);
        const guest = await spinner.signUpGuest(orgId);

        apiHeaders.apiKey = guest.apiKey;

        return new GuestSession(
            guest.id,
            guest.apiKey,
            guest.roomId,
            guest.orgId,
            this.createArtichoke(guest.id, apiHeaders),
            this.createSpinner(apiHeaders),
        );
    }

    public async createWithExistingGuest(
        orgId: ID,
        sessionId: ID,
        apiKey: ApiKey,
        options: AdditionalHeadersOptions = {}
    ): Promise<GuestSession> {
        const apiHeaders = new ApiHeaders(apiKey, options);
        const spinner = this.createSpinner(apiHeaders);
        const guestProfile = await spinner.getGuestProfile(orgId, sessionId);

        return new GuestSession(
            guestProfile.id,
            apiKey,
            guestProfile.roomId,
            orgId,
            this.createArtichoke(guestProfile.id, apiHeaders),
            this.createSpinner(apiHeaders),
        );
    }

    public async createAsAgent(email: Email, password: Password): Promise<Session> {
        const apiHeaders = new ApiHeaders('');
        const spinner = this.createSpinner(apiHeaders);
        const session = await spinner.login({email, password});

        apiHeaders.apiKey = session.apiKey;

        return new Session(
            session.id,
            session.apiKey,
            this.createArtichoke(session.id, apiHeaders),
            this.createSpinner(apiHeaders),
        );
    }

    public create(sessionId: ID, apiKey: ApiKey, options: AdditionalHeadersOptions = {}): Session {
        const apiHeaders = new ApiHeaders(apiKey, options);

        return new Session(
            sessionId,
            apiKey,
            this.createArtichoke(sessionId, apiHeaders),
            this.createSpinner(apiHeaders),
        );
    }

    private createSpinner(apiHeaders: ApiHeaders): Spinner {
        return new Spinner(
            new SpinnerApi(
                new HttpClient(
                    this.loggerFactory.create('Spinner HttpClient'),
                    new URL(this.config.spinner.apiPath, this.config.spinner.server),
                    apiHeaders,
                    new XMLHttpRequestFactory(),
                )
            )
        );
    }

    private createArtichoke(sessionId: ID, apiHeaders: ApiHeaders): Artichoke {
        const artichokeApi = this.createArtichokeApi(sessionId, apiHeaders);

        return new Artichoke(
            artichokeApi,
            this.createCallFactory(artichokeApi),
            new RoomFactory(
                this.loggerFactory,
                artichokeApi
            ),
            this.loggerFactory.create('Artichoke'),
            this.config.artichoke.heartbeatTimeoutMultiplier,
            this.config.artichoke.fallbackReconnectDelayMs
        );
    }

    private createArtichokeApi(sessionId: ID, apiHeaders: ApiHeaders): ArtichokeApi {
        return new ArtichokeApi(
            sessionId,
            this.createWebsocketClient(apiHeaders.apiKey),
            this.createHttpClient(apiHeaders),
        );
    }

    private createHttpClient(apiHeaders: ApiHeaders): HttpClient {
        const httpClientLogger = this.loggerFactory.create('Artichoke HttpClient');
        const httpApiUrl = new URL(this.config.artichoke.apiPath, this.config.artichoke.server);

        const xmlHttpRequestFactory = new XMLHttpRequestFactory();

        return new HttpClient(httpClientLogger, httpApiUrl, apiHeaders, xmlHttpRequestFactory);
    }

    private createWebsocketClient(apiKey: ApiKey): WebsocketClient {
        const wsServerUrl = new URL(`${this.config.artichoke.wsPath}${apiKey}`, this.config.artichoke.server);
        wsServerUrl.protocol = wsServerUrl.protocol === 'https:' ? 'wss:' : 'ws:';

        const ws = webSocket<ArtichokeMessage>({
            url: wsServerUrl.href,
            WebSocketCtor: ReconnectableWebSocket
        });

        return new WebsocketClient(ws, new UUIDGenerator(), this.config.artichoke.askTimeoutMs);
    }

    private createCallFactory(artichokeApi: ArtichokeApi): CallFactory {
        const webrtcStats = new WebRTCStats();

        const rtcPoolFactory = new RTCPoolFactory(
            this.config.rtc,
            this.loggerFactory,
            this.loggerFactory.create('RTCPoolFactory'),
            artichokeApi,
            webrtcStats
        );

        const rtcPoolRepository = new RTCPoolRepository(
            this.loggerFactory.create('RTCPoolRepository'),
            rtcPoolFactory
        );

        return new CallFactory(
            this.loggerFactory,
            artichokeApi,
            rtcPoolRepository,
            new MediaTrackOptimizer(this.config.rtc, this.loggerFactory.create('MediaTrackOptimizer'))
        );
    }
}
