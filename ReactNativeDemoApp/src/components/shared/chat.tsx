import React from 'react';
import { View, Text } from 'react-native';
import { protocol } from '@closerplatform/closer-sdk';

interface Props {
  readonly roomId: protocol.ID;
}

export const Chat = (props: Props): JSX.Element => {
  return (
    <View>
      <Text>Chat</Text>
    </View>
  );
};
