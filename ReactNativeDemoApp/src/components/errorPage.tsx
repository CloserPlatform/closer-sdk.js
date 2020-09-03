import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Button } from 'react-native-elements';

import { BaseNavigation, Components, ErrorParams } from './types';
import { defaultStyles, colors } from '../defaults';

type ThisNavigation = BaseNavigation<Components.Agent>;

interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ErrorParams;
  };
}

export const ErrorPage = ({ navigation, route }: Props): JSX.Element => (
  <View style={[defaultStyles.container, styles.container]}>
    <View>
      <Text style={[styles.text, styles.errorText]}>{route.params.reason}</Text>
    </View>
    <Button
        title='Go back to Home Page'
        buttonStyle={defaultStyles.button}
        onPress={() => navigation.navigate(Components.Welcome)}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 10
  },
  errorText: {
    color: colors.error,
  },
  infoText: {
    fontSize: 24
  }
});
