import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { colors } from '../../defaults';

export const Spinner = (): JSX.Element => {
  return (
    <ActivityIndicator size='large' color={colors.primary} style={styles.spinner}/>
  );
};

const styles = StyleSheet.create({
  spinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
