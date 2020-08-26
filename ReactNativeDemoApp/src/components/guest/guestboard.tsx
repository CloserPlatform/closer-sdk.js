import React from 'react';
import { Text } from 'react-native';
import { BaseNavigation, Components, ServerParams } from '../types';
import { Button } from 'react-native-elements';

type ThisNavigation = BaseNavigation<Components.Guest>;

interface Props {
  navigation: ThisNavigation;
  route: {
    params: ServerParams;
  };
}

export const GuestBoard = ({ navigation, route}: Props) => (
  <>
    <Text>Guestboard</Text>
    <Button
        title='Continue'
        onPress={() => navigation.navigate(Components.Error, { reason: 'Guest board not working yet'})}
    />
  </>
);
