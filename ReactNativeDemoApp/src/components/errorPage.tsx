import React from 'react';
import { Text } from 'react-native';
import { BaseNavigation, Components, ErrorParams } from './types';
import { Button } from 'react-native-elements';

type ThisNavigation = BaseNavigation<Components.Agent>;

interface Props {
  navigation: ThisNavigation;
  route: {
    params: ErrorParams;
  };
}

export const ErrorPage = ({ navigation, route}: Props) => (
  <>
    <Text>Something went wrong: {route.params.reason}</Text>
    <Button
        title='Go back to Home Page'
        onPress={() => navigation.navigate(Components.Welcome)}
    />
  </>
);
