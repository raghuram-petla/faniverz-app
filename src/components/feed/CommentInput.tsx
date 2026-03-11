import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { createPostDetailStyles } from '@/styles/postDetail.styles';

export interface CommentInputProps {
  isAuthenticated: boolean;
  onSubmit: (body: string) => void;
  onLoginPress?: () => void;
  bottomInset?: number;
}

export function CommentInput({
  isAuthenticated,
  onSubmit,
  onLoginPress,
  bottomInset = 0,
}: CommentInputProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createPostDetailStyles(theme);
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const handleSend = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <View style={[styles.inputBar, { paddingBottom: 8 + bottomInset }]}>
      {isAuthenticated ? (
        <>
          <TextInput
            style={styles.inputField}
            placeholder={t('feed.addComment')}
            placeholderTextColor={colors.gray500}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            accessibilityLabel="Comment input"
          />
          <TouchableOpacity
            style={[styles.sendButton, !trimmed && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!trimmed}
            accessibilityLabel="Send comment"
          >
            <Ionicons name="send" size={16} color={colors.white} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.loginPrompt} onPress={onLoginPress}>
          <Text style={styles.loginPromptText}>{t('auth.signInToComment')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
