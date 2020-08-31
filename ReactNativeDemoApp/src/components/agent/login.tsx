import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { AgentContext } from './agentboard';

interface Props {
  readonly setAgentContext: React.Dispatch<React.SetStateAction<AgentContext>>;
  readonly agentContext: AgentContext;
  readonly artichoke: string;
  readonly spinner: string;
  readonly spinnerClient: SpinnerClient;
}

export const Login = ({ agentContext, setAgentContext, spinner, artichoke, spinnerClient }: Props): JSX.Element => {
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();

  return (
    <View style={styles.container}>
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
        style={styles.button}
        title='Sign in'
        onPress={async () => {
          if (email && password) {
            const agentCtx = await signIn(email, password, spinnerClient);
            console.log(agentCtx);
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
  },
  button: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  container: {
    padding: 25,
  },
});

const signIn = async (email: string, password: string, spinnerClient: SpinnerClient): Promise<AgentCtx> => {
  return spinnerClient.login({ email, password });
};
