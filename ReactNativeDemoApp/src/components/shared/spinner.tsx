import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

export const Spinner = (): JSX.Element => {
  return (
    <ActivityIndicator size='large' color='#00ab8e' style={styles.spinner}/>
  );
};

const styles = StyleSheet.create({
  spinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
