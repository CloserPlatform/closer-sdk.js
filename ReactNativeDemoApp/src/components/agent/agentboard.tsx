import React from 'react';
import { Text } from 'react-native';
import { BaseNavigation, Components, GuestOrAgentScreenParams } from '../types';
import { Button } from 'react-native-elements';

type ThisNavigation = BaseNavigation<Components.Agent>;

interface Props {
  navigation: ThisNavigation;
  route: {
    params: GuestOrAgentScreenParams;
  };
}

export const AgentBoard = ({ navigation, route}: Props): JSX.Element => (
  <>
    <Text>{route.params.artichoke}</Text>
    <Button
        title='Continue'
        onPress={() => navigation.navigate(Components.Error, { reason: 'Agent board not working yet'})}
    />
  </>
);
