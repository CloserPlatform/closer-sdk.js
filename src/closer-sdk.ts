import { ID, ApiKey } from './protocol/protocol';
import { UserConfig, load, getDefaultConfig } from './config/config';
import { Session } from './session/session';
import { BrowserUtils } from './utils/browser-utils';
import { LoggerFactory } from './logger/logger-factory';
import { SessionFactory } from './session/session-factory';
import { LoggerService } from './logger/logger-service';
import { Email, Password } from './spinner/protocol';
import { GuestSession } from './session/guest-session';

export class CloserSDK {

    public static init(userConfig?: UserConfig): CloserSDK {
        if (!CloserSDK.isSupported()) {
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

    public static isSupported(): boolean {
        return BrowserUtils.isBrowserSupported();
    }

    public async createGuestSession(orgId: ID): Promise<GuestSession> {
        this.logger.debug(`Creating guest session for orgId(${orgId})`);

        return this.sessionFactory.createWithNewGuest(orgId);
    }

    public async getGuestSession(orgId: ID, sessionId: ID, apiKey: ApiKey): Promise<GuestSession> {
        this.logger.debug(`Getting guest session(${sessionId}) for orgId(${orgId})`);

        return this.sessionFactory.createWithExistingGuest(orgId, sessionId, apiKey);
    }

    public withSession(sessionId: ID, apiKey: ApiKey): Session {
        this.logger.debug(`Initializing with Session(${sessionId})`);

        return this.sessionFactory.create(sessionId, apiKey);
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
