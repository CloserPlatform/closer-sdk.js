import { StyleSheet } from 'react-native';

export const defaultServers = {
  artichoke: 'https://artichoke.stage.closer.app',
  spinner: 'https://spinner.stage.closer.app'
};

export const defaultOrg = '510ae455-69a3-4b16-b1cc-6e2b72c70e90';

export const notificationTime = 2500;

export const colors = {
  primary: '#00ab8e',
  secondary: '#107377',
  lightGray: '#adadad',
  error: '#781e14'
};

export const defaultStyles = StyleSheet.create({
  button: {
    margin: 10,
    backgroundColor: colors.primary
  },
  container: {
    padding: 20
  }
});
