import { ID, ApiKey } from './protocol/protocol';
import { UserConfig, load, getDefaultConfig } from './config/config';
import { Session } from './session/session';
import { PlatformSupport } from './utils/platform-support';
import { LoggerFactory } from './logger/logger-factory';
import { SessionFactory } from './session/session-factory';
import { LoggerService } from './logger/logger-service';
import { Email, Password } from './spinner/protocol';
import { GuestSession } from './session/guest-session';
import { AdditionalHeadersOptions } from './http/api-headers';

export class CloserSDK {

    public static init(userConfig?: UserConfig): CloserSDK {
        if (!CloserSDK.isChatSupported()) {
            throw new Error('Platform is not supported');
        }

        const config = typeof userConfig !== 'undefined' ? load(userConfig) : getDefaultConfig();
        const loggerFactory = new LoggerFactory(config.logLevel);
        const logger = loggerFactory.create(`CloserSDK`);

        logger.debug(`Received user configuration: ${JSON.stringify(userConfig)}`);
        logger.debug(`Initializing with configuration: ${JSON.stringify(config)}`);

        return new CloserSDK(
            new SessionFactory(config, loggerFactory),
            loggerFactory.create('CloserSDK'),
        );
    }

    public static isChatSupported(): boolean {
        return PlatformSupport.isChatSupported();
    }

    public static isMediaSupported(): boolean {
        return PlatformSupport.isMediaSupported();
    }

    public async createGuestSession(
        orgId: ID,
        options: AdditionalHeadersOptions = {}
    ): Promise<GuestSession> {
        this.logger.debug(`Creating guest session for orgId(${orgId})`);

        return this.sessionFactory.createWithNewGuest(orgId, options);
    }

    public async getGuestSession(
        orgId: ID,
        sessionId: ID,
        apiKey: ApiKey,
        options: AdditionalHeadersOptions = {}
    ): Promise<GuestSession> {
        this.logger.debug(`Getting guest session(${sessionId}) for orgId(${orgId})`);

        return this.sessionFactory.createWithExistingGuest(orgId, sessionId, apiKey, options);
    }

    public withSession(sessionId: ID, apiKey: ApiKey, options: AdditionalHeadersOptions = {}): Session {
        this.logger.debug(`Initializing with Session(${sessionId})`);

        return this.sessionFactory.create(sessionId, apiKey, options);
    }

    public async loginAsAgent(email: Email, password: Password): Promise<Session> {
        this.logger.debug(`Logging as agent with email(${email})`);

        return this.sessionFactory.createAsAgent(email, password);
    }

    private constructor(
        private sessionFactory: SessionFactory,
        private logger: LoggerService,
    ) {
    }
}
