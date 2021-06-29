import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { servers } from '../defaults';

const loginAsGuest = () => {
  console.log('Login as guest');
};

export const Login = () => (
  <View style={styles.container}>
    <Input
      placeholder='Artichoke server'
      defaultValue={servers.artichoke}
      label='Artichoke server'
    />
    <Input
      defaultValue={servers.spinner}
      placeholder='Spinner server'
      label='Spinner server'
    />
    <Button title='Continue as guest' onPress={loginAsGuest} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 25,
  },
});
