import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { BaseNavigation, Components, ServerParams } from './types';
import { defaultServers, colors, defaultStyles } from '../defaults';
import { Storage } from '../storage';

type ThisNavigation = BaseNavigation<Components.Welcome>;
interface Props {
  readonly navigation: ThisNavigation;
}

export const Welcome = ({ navigation }: Props): JSX.Element => {
  const [artichoke, setArtichoke] = useState(defaultServers.artichoke);
  const [spinner, setSpinner] = useState(defaultServers.spinner);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        You can continue as an organization's guest or sign into your existing agent profile.
      </Text>
      <View>
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
          buttonStyle={defaultStyles.button}
          onPress={() => loginAsGuest(navigation, { artichoke, spinner })}
        />
        <Button
          title='Continue as existing user'
          buttonStyle={defaultStyles.button}
          onPress={() => loginExisting(navigation, { artichoke, spinner })}
        />
      </View>
      <Button
        title='Clear saved data'
        buttonStyle={[defaultStyles.button, styles.buttonSecondary]}
        onPress={() => Storage.clearAll()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
    textAlign: 'center'
  },
  buttonSecondary: {
    backgroundColor: colors.secondary
  },
  container: {
    padding: 20,
    marginVertical: 20,
    flex: 1,
    justifyContent: 'space-between'
  },
});

const loginAsGuest = (navigation: ThisNavigation, params: ServerParams) => {
  navigation.navigate(Components.Guest, params);
};

const loginExisting = (navigation: ThisNavigation, params: ServerParams) => {
  navigation.navigate(Components.Agent, params);
};
