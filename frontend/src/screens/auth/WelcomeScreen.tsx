import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';

import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { GOOGLE_WEB_CLIENT_ID } from '../../config/google.config';
import { api } from '../../services/api';
import AuthService from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import type { WelcomeScreenProps } from '../../navigation/types';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

const { height } = Dimensions.get('window');
const PRIVACY_POLICY_URL = `${api.defaults.baseURL}/privacy`;

type Props = WelcomeScreenProps;

export default function WelcomeScreen({ navigation }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  const confirmGoogleAccount = (email?: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        'Continue with this account?',
        email || 'Selected Google account',
        [
          { text: 'Choose Another', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

  const handleAuthSuccess = async (response: any) => {
    setToken(response.accessToken);
    setUser(response.user);

    // Register device for push
    await AuthService.registerDevice();

    if (response.isNewUser || response.user.profileStage === 0) {
      navigation.replace('Stage1');
    } else if (response.user.profileStage === 1) {
      navigation.replace('Stage2');
    } else {
      navigation.replace('Main');
    }
  };

  // ─── Google Sign In ───────────────────────────────────────────────────────
  const handleGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const previousUser = await GoogleSignin.getCurrentUser();
      if (previousUser) {
        await GoogleSignin.signOut();
      }

      const signInResult: any = await GoogleSignin.signIn();
      if (signInResult?.type === 'cancelled') {
        return;
      }

      const user = signInResult?.data?.user ?? signInResult?.user;
      const email = user?.email;

      const shouldContinue = await confirmGoogleAccount(email);
      if (!shouldContinue) {
        await GoogleSignin.signOut();
        return;
      }

      let idToken =
        signInResult?.data?.idToken ?? signInResult?.idToken ?? user?.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error('Google did not return an ID token. Check webClientId in google.config.ts');
      }

      const res = await AuthService.socialAuth('google', idToken);
      await handleAuthSuccess(res);
    } catch (err: any) {
      console.error('[Google] Auth failed:', err?.code, err?.message, err?.response?.data);
      Alert.alert(
        'Google sign in failed',
        err?.response?.data?.message || err?.message || 'Please try again.',
      );
    }
  };

  // ─── Facebook Sign In ─────────────────────────────────────────────────────
  const handleFacebook = async () => {
    try {
      Settings.initializeSDK();
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) return;
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) return;
      const res = await AuthService.socialAuth('facebook', data.accessToken);
      await handleAuthSuccess(res);
    } catch (err: any) {
      console.error('[Facebook] Auth failed:', err.message);
      Alert.alert('Facebook sign in failed', err?.response?.data?.message || err?.message || 'Please try again.');
    }
  };

  // ─── Apple Sign In ────────────────────────────────────────────────────────
  const handleApple = async () => {
    try {
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      const { identityToken } = appleAuthResponse;
      if (!identityToken) return;
      const res = await AuthService.socialAuth('apple', identityToken);
      await handleAuthSuccess(res);
    } catch (err: any) {
      if (err.code !== appleAuth.Error.CANCELED) {
        console.error('[Apple] Auth failed:', err.message);
        Alert.alert('Apple sign in failed', err?.response?.data?.message || err?.message || 'Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero gradient background */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      {/* Logo & tagline */}
      <View style={styles.heroSection}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} />
        <Text style={styles.logo}>NRI Friends</Text>
        <Text style={styles.tagline}>Find your people, wherever you are</Text>
        <Text style={styles.subtitle}>
          Discover and connect with NRIs near you
        </Text>
      </View>

      {/* Auth buttons */}
      <View style={styles.buttonsContainer}>
        {/* Phone OTP */}
        <TouchableOpacity
          style={[styles.button, styles.phoneButton]}
          onPress={() => navigation.navigate('PhoneEntry')}
          activeOpacity={0.85}
        >
          <Text style={styles.phoneIcon}>📱</Text>
          <Text style={styles.buttonText}>Continue with Phone</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Google */}
        <TouchableOpacity
          style={[styles.button, styles.socialButton]}
          onPress={handleGoogle}
          activeOpacity={0.85}
        >
          <Text style={styles.socialIcon}>G</Text>
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Facebook */}
        <TouchableOpacity
          style={[styles.button, styles.socialButton]}
          onPress={handleFacebook}
          activeOpacity={0.85}
        >
          <Text style={[styles.socialIcon, { color: '#1877F2' }]}>f</Text>
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        {/* Apple (iOS only) */}
        {appleAuth.isSupported && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleApple}
            activeOpacity={0.85}
          >
            <Text style={[styles.socialIcon, { color: '#fff' }]}></Text>
            <Text style={[styles.socialButtonText, { color: '#fff' }]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
          <Text
            style={styles.termsLink}
            accessibilityRole="link"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { ...StyleSheet.absoluteFillObject },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  logoImage: {
    width: 112, height: 112, borderRadius: 28, marginBottom: Spacing.md,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
  },
  logo: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: '#fff',
    fontWeight: '600',
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: Spacing.xs,
  },
  buttonsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  phoneButton: {
    backgroundColor: Colors.primaryDark,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  phoneIcon: { fontSize: 18 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.5)' },
  dividerText: { color: '#fff', fontSize: FontSize.sm },
  socialButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fff',
  },
  appleButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    width: 22,
    textAlign: 'center',
  },
  socialButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  terms: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  termsLink: { color: '#fff', fontWeight: '700', textDecorationLine: 'underline' },
});
