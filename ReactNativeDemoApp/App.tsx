import React from 'react';
import { StyleSheet } from 'react-native';
import { Header, ThemeProvider } from 'react-native-elements';
import { Login } from './src/components/login';

const App = () => (
  <ThemeProvider>
      <Header
        centerComponent={{ text: 'Closer SDK demo app', style: styles.header }}
      />
    <Login />
  </ThemeProvider>
);

const styles = StyleSheet.create({
  header: {
    color: '#fff',
    fontSize: 20,
  }
});

export default App;
