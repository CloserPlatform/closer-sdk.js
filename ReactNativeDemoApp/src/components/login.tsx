import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { defaultServers } from '../defaults';
import { Components, BaseNavigation, ServerParams } from './types';

type ThisNavigation = BaseNavigation<Components.Login>;
interface Props {
  navigation: ThisNavigation;
}

export const Login = ({ navigation }: Props): JSX.Element => {
  return (
    <>
    </>
  );
};
