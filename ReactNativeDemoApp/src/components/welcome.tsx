import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Input, Button } from 'react-native-elements';

import { BaseNavigation, Components } from './types';
import { defaultServers, colors, defaultStyles } from '../defaults';
import { Storage } from '../storage';

type ThisNavigation = BaseNavigation<Components.Welcome>;
interface Props {
  readonly navigation: ThisNavigation;
}

export const Welcome = ({ navigation }: Props): JSX.Element => {
  const [spinner, setSpinner] = useState(defaultServers.spinner);
  const [artichoke, setArtichoke] = useState(defaultServers.artichoke);

  return (
    <View style={[defaultStyles.container, styles.container]}>
      <View>
        <Input
          placeholder='Artichoke server...'
          label='Artichoke server'
          value={artichoke}
          onChangeText={setArtichoke}
        />
        <Input
          placeholder='Spinner server...'
          label='Spinner server'
          value={spinner}
          onChangeText={setSpinner}
        />
        <Button
          title='Continue as guest'
          buttonStyle={defaultStyles.button}
          onPress={() => navigation.navigate(Components.Guest, { artichoke, spinner })}
        />
        <Button
          title='Continue as existing user'
          buttonStyle={defaultStyles.button}
          onPress={() => navigation.navigate(Components.Agent, { artichoke, spinner })}
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
    flex: 1,
    marginVertical: 20,
    justifyContent: 'space-between'
  },
});
