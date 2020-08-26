import { StackNavigationProp } from '@react-navigation/stack';

export enum Components {
  Agent = 'AgentBoard',
  Guest = 'GuestBoard',
  Login = 'Login',
  Welcome = 'Welcome',
  Error = 'ErrorPage'
}

export interface ServerParams {
  artichoke: string;
  spinner: string;
}

export interface ErrorParams {
  reason: string;
}

// This is necessary because of createStackNavigation in App.tsx
// tslint:disable-next-line: interface-over-type-literal
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  GuestBoard: ServerParams;
  AgentBoard: ServerParams;
  ErrorPage: ErrorParams;
};

export type BaseNavigation<T extends Components> = StackNavigationProp<RootStackParamList, T>;
