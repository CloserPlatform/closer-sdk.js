import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';

import { defaultStyles } from '../../defaults';
import { GuestBoardState } from './guestboard.service';
import { BaseNavigation, Components, ServerParams } from '../types';

import { Chat } from '../shared/chat';
import { Spinner } from '../shared/spinner';

export type ThisNavigation = BaseNavigation<Components.Guest>;
export interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

export const GuestBoard = ({ navigation, route }: Props): JSX.Element => {
  const [guestContext, session, onOrgInputChange, onOrgInputClick] = GuestBoardState({ navigation, route });

  const renderOrgInput = (): JSX.Element => (
    <View style={defaultStyles.container}>
      <Input
        label='Organization id:'
        value={guestContext?.orgId}
        onChangeText={onOrgInputChange}
        inputStyle={styles.input}
      />
      <Button
        title='Sign up as guest'
        buttonStyle={defaultStyles.button}
        onPress={onOrgInputClick}
        />
    </View>
  );

  const renderBoard = (): JSX.Element => {
    if (!session) {
      return <Spinner />;
    }
    else if (!guestContext?.roomId) {
      navigation.navigate(Components.Error, { reason: 'Unknown room id after getting guest session' });

      return <></>;
    }
    else if (guestContext.id) {
      return (
        <Chat roomId={guestContext.roomId} session={session} id={guestContext.id} navigation={navigation} />
      );
    }
    else {
      return <Spinner />;
    }
  };

  const render = (): JSX.Element => (
    (guestContext?.id && guestContext.apiKey && guestContext.orgId) ? renderBoard() : renderOrgInput()
  );

  return render();
};

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
  }
});
