import { ID, ApiKey, SessionData, AgentContext } from './protocol/protocol';
import { UserConfig, load, getDefaultConfig } from './config/config';
import { Session } from './session/session';
import { BrowserUtils } from './utils/browser-utils';
import { LoggerFactory } from './logger/logger-factory';
import { SessionFactory } from './session/session-factory';
import { SpinnerApi } from './spinner/spinner-api';
import { HttpClient } from './http/http-client';
import { ApiHeaders } from './http/api-headers';
import { XMLHttpRequestFactory } from './http/xml-http-request-factory';

export class CloserSDK {

    public static init(sessionId: ID, apiKey: ApiKey, userConfig?: UserConfig): Session {
        if (!CloserSDK.isSupported()) {
            throw new Error('Platform is not supported');
        }

        const config = typeof userConfig !== 'undefined' ? load(userConfig) : getDefaultConfig();

        const loggerFactory = new LoggerFactory(config.logLevel);

        const logger = loggerFactory.create(`CloserSDK`);
        logger.debug(`Initializing with Session(${sessionId}) ApiKey(${apiKey})`);
        logger.debug(`Loading configuration: ${JSON.stringify(config)}`);

        const sessionFactory = new SessionFactory(sessionId, apiKey, config, loggerFactory);

        return sessionFactory.create();
    }

    public static initWithSignedAuth(sessionData: SessionData, userConfig: UserConfig): Promise<Session> {
        if (!CloserSDK.isSupported()) {
            throw new Error('Platform is not supported');
        }

        const config = typeof userConfig !== 'undefined' ? load(userConfig) : getDefaultConfig();

        const loggerFactory = new LoggerFactory(config.logLevel);

        const spinnerHttpClient = new HttpClient(
            loggerFactory.create('HttpClient(Spinner)'),
            new URL(config.spinner.server), new ApiHeaders(''), new XMLHttpRequestFactory());

        const api = new SpinnerApi(spinnerHttpClient);

        return api.verifySignature(sessionData).then((context: AgentContext) =>
        CloserSDK.init(context.id, context.apiKey, config));
      }

    public static isSupported(): boolean {
        return BrowserUtils.isBrowserSupported();
    }

    private constructor() {
    }
}
