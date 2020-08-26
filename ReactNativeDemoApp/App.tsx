import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Components, RootStackParamList } from './src/components/types';
import { Welcome } from './src/components/welcome';
import { GuestBoard } from './src/components/guest/guestboard';
import { AgentBoard } from './src/components/agent/agentboard';
import { ErrorPage } from './src/components/errorPage';

const Stack = createStackNavigator<RootStackParamList>();

export const App = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName={Components.Welcome}>
        <Stack.Screen name={Components.Welcome} component={Welcome} options={{ title: 'Demo app for Closer SDK'}} />
        <Stack.Screen name={Components.Guest} component={GuestBoard} />
        <Stack.Screen name={Components.Agent} component={AgentBoard} />
        <Stack.Screen name={Components.Error} component={ErrorPage} />
    </Stack.Navigator>
  </NavigationContainer>
);
