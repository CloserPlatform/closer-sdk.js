import React from 'react';
import { Button, Input } from 'react-native-elements';
import { View } from 'react-native';

const loginAsGuest = () => {
  console.log('Login as guest');
}

export const Login = () => {
  return (
    <View>
      <Input
        placeholder='Spinner server'
        label='Spinner server'
      />
      <Input
        placeholder='Artichoke server'
        label='Artichoke server'
      />
      <Button title="Continue as guest" onPress={loginAsGuest} />
    </View>
  );
}
