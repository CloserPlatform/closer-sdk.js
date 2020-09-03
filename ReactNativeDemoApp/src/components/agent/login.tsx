import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { SpinnerClient, AgentCtx } from '@swagger/spinner';

import { Storage, StorageNames } from '../../storage';
import { defaultStyles } from '../../defaults';

import { AgentContext } from './agentboard.service';

interface Props {
  readonly setAgentContext: React.Dispatch<React.SetStateAction<AgentContext | undefined>>;
  readonly agentContext: AgentContext;
  readonly artichoke: string;
  readonly spinner: string;
  readonly spinnerClient: SpinnerClient;
}

export const Login = ({ agentContext, setAgentContext, spinner, spinnerClient }: Props): JSX.Element => {
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  return (
    <View style={defaultStyles.container}>
      <Text style={styles.text}>
        {`Sign in to your account at: \n${spinner}`}
      </Text>
      <Input
        placeholder='Your email...'
        autoCapitalize='none'
        value={email}
        onChangeText={setEmail}
      />
      <Input
        placeholder='Password...'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        buttonStyle={defaultStyles.button}
        title='Sign in'
        onPress={async () => {
          if (email && password) {
            const agentCtx = await signIn(email, password, spinnerClient);
            setAgentContext({ ...agentContext, apiKey: agentCtx.apiKey, id: agentCtx.id, orgId: agentCtx.orgId });
          }
          else {
            // TODO: forms verification
            console.error('No email or password');
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    padding: 10,
    marginBottom: 25,
    textAlign: 'center'
  }
});

/*  tslint:disable: no-floating-promises */
const signIn = async (email: string, password: string, spinnerClient: SpinnerClient): Promise<AgentCtx> => {
  const agentCtx = await spinnerClient.login({ email, password });

  Storage.saveAgent(StorageNames.ApiKey, agentCtx.apiKey);
  Storage.saveAgent(StorageNames.Id, agentCtx.id);
  Storage.saveAgent(StorageNames.OrgId, agentCtx.orgId);

  return agentCtx;
};
/*  tslint:enable: no-floating-promises */
