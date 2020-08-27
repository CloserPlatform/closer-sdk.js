import { StackNavigationProp } from '@react-navigation/stack';
import { SpinnerClient } from '@swagger/spinner';

export enum Components {
  Agent = 'AgentBoard',
  Guest = 'GuestBoard',
  Login = 'Login',
  Welcome = 'Welcome',
  Error = 'ErrorPage'
}

export interface ServerParams {
  readonly artichoke: string;
  readonly spinner: string;
}
export interface ErrorParams {
  readonly reason: string;
}

// This is necessary because of createStackNavigation in App.tsx
// tslint:disable-next-line: interface-over-type-literal
export type RootStackParamList = {
  readonly Welcome: undefined;
  readonly Login: undefined;
  readonly GuestBoard: ServerParams;
  readonly AgentBoard: ServerParams;
  readonly ErrorPage: ErrorParams;
};

export type BaseNavigation<T extends Components> = StackNavigationProp<RootStackParamList, T>;
