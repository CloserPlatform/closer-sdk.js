import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';

// tslint:disable:no-console

export class CommunicatorReconnectionService {

  private isReconnectionEnabled = false;
  private reconnect?: () => void;
  private errorSubscription?: Subscription;

  constructor(private reconnectTimeout: number,
              connectionEstablishedEvent$: Observable<void>,
              connectionLostEvent$: Observable<void>,
              connectionErrorEvent$: Observable<void>) {
    connectionEstablishedEvent$.subscribe(() => {
      if (this.errorSubscription) {
        console.debug('Reconnection Successful');
        this.errorSubscription.unsubscribe();
        this.errorSubscription = undefined;
      }
    });

    connectionLostEvent$.subscribe(() => {
      console.debug('Connection lost');
      this.handleConnectionLost(connectionErrorEvent$);
    });
  }

  public disableReconnection = (): void => {
    console.debug('Reconnection disabled');
    this.isReconnectionEnabled = false;
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
    this.errorSubscription = undefined;
  }

  public enableReconnection(reconnect: () => void): void {
    console.debug('Reconnection enabled');
    this.isReconnectionEnabled = true;
    this.reconnect = reconnect;
  }

  private handleConnectionLost = (connectionErrorEvent$: Observable<void>): void => {
    if (this.isReconnectionEnabled) {
      if (!this.reconnect) {
        console.error('Reconnect method not set');
      } else {
        console.debug('Reconnecting');
        this.errorSubscription = connectionErrorEvent$.pipe(first()).subscribe(() => {
          console.debug('Reconnection failed');
          console.debug(`Trying to reconnect in ${this.reconnectTimeout}ms`);
          window.setTimeout(() =>
            this.handleConnectionLost(connectionErrorEvent$), this.reconnectTimeout);
        });
        this.reconnect();
      }

    } else {
      console.debug('Do not reconnecting, reconnection disabled');
    }
  }

}
