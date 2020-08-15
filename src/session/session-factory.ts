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
import { ApiHeaders } from '../http/api-headers';
import { RoomFactory } from '../rooms/room-factory';
import { CallFactory } from '../calls/call-factory';
import { WebRTCStats } from '../rtc/stats/webrtc-stats';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { MediaTrackOptimizer } from '../rtc/media-track-optimizer';
import { RTCPoolFactory } from '../rtc/rtc-pool-factory';

export class SessionFactory {

    constructor(
        private readonly sessionId: ID,
        private readonly apiKey: ApiKey,
        private readonly config: Config,
        private readonly loggerFactory: LoggerFactory,
    ) {
    }

    public create(): Session {

        const logger = this.loggerFactory.create(`Session(${this.sessionId})`);

        logger.debug(`Configuration: ${JSON.stringify(this.config)}`);

        return new Session(this.sessionId, this.createArtichoke());
    }

    private createArtichoke(): Artichoke {
        const artichokeApi = this.createArtichokeApi();

        return new Artichoke(
            artichokeApi,
          this.createCallFactory(artichokeApi),
          new RoomFactory(
            this.loggerFactory,
            artichokeApi
          ),
          this.loggerFactory.create('Artichoke'),
          this.config.artichoke.reconnectDelayMs,
          this.config.artichoke.heartbeatTimeoutMultiplier,
        );
    }

    private createArtichokeApi(): ArtichokeApi {
        return new ArtichokeApi(
            this.sessionId,
            this.createWebsocketClient(),
            this.createHttpClient(),
        );
    }

    private createHttpClient(): HttpClient {
        const httpClientLogger = this.loggerFactory.create('HttpClient');
        const httpApiUrl = new URL(this.config.artichoke.apiPath, this.config.artichoke.server);
        const apiHeaders = new ApiHeaders(this.apiKey);
        const xmlHttpRequestFactory = new XMLHttpRequestFactory();

        return new HttpClient(httpClientLogger, httpApiUrl, apiHeaders, xmlHttpRequestFactory);
    }

    private createWebsocketClient(): WebsocketClient {
        const wsServerUrl = new URL(`${this.config.artichoke.wsPath}${this.apiKey}`, this.config.artichoke.server);
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
