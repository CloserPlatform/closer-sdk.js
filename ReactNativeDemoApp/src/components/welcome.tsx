import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { BaseNavigation, Components, ServerParams } from './types';
import { defaultServers } from '../defaults';
import { Storage } from '../storage';

type ThisNavigation = BaseNavigation<Components.Welcome>;
interface Props {
  readonly navigation: ThisNavigation;
}

export const Welcome = ({ navigation }: Props): JSX.Element => {
  const [artichoke, setArtichoke] = useState(defaultServers.artichoke);
  const [spinner, setSpinner] = useState(defaultServers.spinner);

  return (
    <>
      <Text style={styles.text}>
        Continue as an organization's guest or sign into your existing agent profile.
      </Text>
      <View style={styles.container}>
        <Input
          placeholder='Artichoke server'
          label='Artichoke server'
          value={artichoke}
          onChangeText={setArtichoke}
        />
        <Input
          placeholder='Spinner server'
          label='Spinner server'
          value={spinner}
          onChangeText={setSpinner}
        />
        <Button
          title='Continue as guest'
          style={styles.button}
          onPress={() => loginAsGuest(navigation, { artichoke, spinner })}
        />
        <Button
          title='Continue as existing user'
          style={styles.button}
          onPress={() => loginExisting(navigation, { artichoke, spinner })}
        />
        <Button
          title='Clear saved data'
          style={styles.button}
          onPress={() => Storage.clearAll()}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    padding: 10,
    textAlign: 'center'
  },
  button: {
    marginHorizontal: 30,
    marginVertical: 10,
  },
  container: {
    paddingTop: 25,
  },
});

const loginAsGuest = (navigation: ThisNavigation, params: ServerParams) => {
  navigation.navigate(Components.Guest, params);
};

const loginExisting = (navigation: ThisNavigation, params: ServerParams) => {
  navigation.navigate(Components.Agent, params);
};
