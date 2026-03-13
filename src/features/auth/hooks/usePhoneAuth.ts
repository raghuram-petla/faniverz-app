import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePhoneAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @boundary: phone number format is not validated here — Supabase expects E.164 format (e.g., +91XXXXXXXXXX).
  // If caller passes a local format (0XXXXXXXXXX), Supabase returns a vague "Invalid phone number" error
  // that this hook surfaces as-is without explaining the expected format.
  // @assumes: Supabase project has SMS provider (Twilio/MessageBird) configured. If not configured,
  // signInWithOtp returns a misleading "Phone provider is not enabled" error, not an SMS delivery failure.
  const sendOtp = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ phone });
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // @sideeffect: verifyOtp with type 'sms' creates a new auth.users row if the phone number is new (implicit signup).
  // This fires handle_new_user trigger, but since phone-based signup has no email, the profile's email field will be null
  // and display_name falls through to COALESCE's last value (also null → stored as null, not the phone number).
  const verifyOtp = async (phone: string, token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendOtp, verifyOtp, isLoading, error };
}
