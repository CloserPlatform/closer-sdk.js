/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import { Login } from './src/components/login';
import { Header, ThemeProvider } from 'react-native-elements';

const App = () => {
  return (
    <ThemeProvider>
      <Header
        centerComponent={{ text: 'Closer SDK demo app', style: { color: '#fff', fontSize: 20 } }}
      />
      <Login />
    </ThemeProvider>
  );
};

export default App;
