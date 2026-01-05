import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useHome } from '@presentation/context/HomeContext';
import colors from '@presentation/styles/colors';

export default function LoginScreen() {
  const { t, signIn, authStatus, authError } = useHome();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    await signIn(email.trim(), password);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <TextInput
          label={t('login.email')}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        <TextInput
          label={t('login.password')}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />

        {authError ? <Text style={styles.error}>{authError}</Text> : null}

        <Button mode="contained" onPress={handleSignIn} disabled={authStatus === 'loading'}>
          {authStatus === 'loading' ? t('login.loading') : t('login.submit')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    gap: 12,
    padding: 20,
    width: '100%',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: colors.primary,
  },
  subtitle: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
});
