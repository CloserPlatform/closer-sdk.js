import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { BaseNavigation, Components, ErrorParams } from './types';
import { Button } from 'react-native-elements';

type ThisNavigation = BaseNavigation<Components.Agent>;

interface Props {
  navigation: ThisNavigation;
  route: {
    params: ErrorParams;
  };
}

export const ErrorPage = ({ navigation, route}: Props): JSX.Element => (
  <View style={styles.container}>
    <View>
      <Text style={[styles.text, styles.infoText]}>An error occured :(</Text>
      <Text style={[styles.text, styles.errorText]}>{route.params.reason}</Text>
    </View>
    <Button
        title='Go back to Home Page'
        style={styles.button}
        onPress={() => navigation.navigate(Components.Welcome)}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 40,
    flex: 1,
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 10
  },
  errorText: {
    color: '#781e14',
  },
  infoText: {
    fontSize: 24
  },
  button: {
    margin: 30
  }
});
