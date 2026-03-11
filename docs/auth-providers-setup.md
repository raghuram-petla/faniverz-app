# Auth Providers Setup

This guide covers enabling Google, Apple, and Phone (SMS OTP) authentication providers in Supabase.

## Prerequisites

- Supabase project with Auth enabled
- Access to Supabase Dashboard → Authentication → Providers

## Google Sign-In

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services → Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application type)
5. Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
6. Note the **Client ID** and **Client Secret**

### 2. Supabase Dashboard

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google**
3. Enter the **Client ID** and **Client Secret** from step 1

### 3. Mobile App

1. Create an additional OAuth Client ID with type **iOS** or **Android** as needed
2. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in your `.env` to the **Web** Client ID
3. The `@react-native-google-signin/google-signin` package uses this for `GoogleSignin.configure()`

## Apple Sign-In

### 1. Apple Developer Console

1. Go to [Apple Developer](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles → Identifiers**
3. Enable **Sign In with Apple** for your App ID
4. Create a **Services ID** for web-based sign-in
5. Configure the return URL: `https://<your-project>.supabase.co/auth/v1/callback`

### 2. Supabase Dashboard

1. Go to **Authentication → Providers → Apple**
2. Toggle **Enable Sign in with Apple**
3. Enter your **Services ID**, **Team ID**, **Key ID**, and upload the **private key** (.p8 file)

### 3. Mobile App

- The `expo-apple-authentication` package handles native Apple Sign-In on iOS
- No additional environment variables needed — uses the app's bundle identifier
- Apple Sign-In is iOS-only; the button is hidden on Android via `Platform.OS` check

## Phone (SMS OTP)

### 1. Supabase Dashboard

1. Go to **Authentication → Providers → Phone**
2. Toggle **Enable Phone provider**
3. Choose an SMS provider:
   - **Twilio**: Enter Account SID, Auth Token, and Messaging Service SID (or sender phone number)
   - **MessageBird**: Enter Access Key and Originator
   - **Vonage**: Enter API Key and API Secret

### 2. Configuration

- Set OTP expiry (default: 60 seconds)
- Set OTP length (default: 6 digits)
- Enable/disable **Confirm phone** to require verification before allowing sign-in

### 3. Mobile App

- No additional environment variables needed
- The `usePhoneAuth` hook calls `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`

## Environment Variables

```env
# Required for Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

# Supabase (already configured)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

- **Google**: Use a real Google account; Google Sign-In does not work in Expo Go (requires dev build)
- **Apple**: Test on a physical iOS device with an Apple ID
- **Phone**: Use Supabase's test phone numbers in development, or configure a real SMS provider for production
