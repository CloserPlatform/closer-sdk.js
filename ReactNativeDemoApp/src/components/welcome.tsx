import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Login } from './login';
import { BaseNavigation, Components } from './types';

interface Props {
  navigation: BaseNavigation<Components.Welcome>;
}

export const Welcome = ({ navigation }: Props) => (
  <>
    <Text style={styles.text}>
      Continue as an organization's guest or sign into your existing agent profile.
    </Text>
    <Login navigation={navigation} />
  </>
);

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    padding: 10,
    textAlign: 'center'
  }
});
