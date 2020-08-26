import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { servers } from '../defaults';
import { Components, BaseNavigation, ServerParams } from './types';

type ThisNavigation = BaseNavigation<Components.Login>;
interface Props {
  navigation: ThisNavigation;
}

export const Login = ({ navigation }: Props) => {
  const [artichoke, setArtichoke] = useState(servers.artichoke);
  const [spinner, setSpinner] = useState(servers.spinner);

  return (
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
    </View>
  );
};

const styles = StyleSheet.create({
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
