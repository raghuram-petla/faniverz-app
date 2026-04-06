import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { useTranslation } from 'react-i18next';

// @contract renders agree/disagree poll with counts and percentage bars
export interface AgreeDisagreePollProps {
  agreeCount: number;
  disagreeCount: number;
  userVote: 'agree' | 'disagree' | null;
  onVote: (vote: 'agree' | 'disagree') => void;
}

// @coupling used by EditorialReviewSection — wrapped with gate() for auth
export function AgreeDisagreePoll({
  agreeCount,
  disagreeCount,
  userVote,
  onVote,
}: AgreeDisagreePollProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const total = agreeCount + disagreeCount;
  const agreePercent = total > 0 ? Math.round((agreeCount / total) * 100) : 0;
  const disagreePercent = total > 0 ? 100 - agreePercent : 0;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>
        {t('editorial.doYouAgree', 'Do you agree with this review?')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Agree button */}
        <Pressable
          onPress={() => onVote('agree')}
          style={{
            flex: 1,
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: userVote === 'agree' ? 2 : 1,
            borderColor: userVote === 'agree' ? colors.green500 : theme.borderSubtle,
          }}
        >
          {/* Percentage bar background */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${agreePercent}%`,
              backgroundColor:
                userVote === 'agree' ? colors.green500 + '20' : theme.surfaceElevated,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              gap: 6,
            }}
          >
            <Ionicons
              name={userVote === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={userVote === 'agree' ? colors.green500 : theme.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: userVote === 'agree' ? colors.green500 : theme.textSecondary,
              }}
            >
              {t('editorial.agree', 'Agree')}
            </Text>
            {total > 0 && (
              <Text style={{ fontSize: 11, color: theme.textTertiary }}>{agreePercent}%</Text>
            )}
          </View>
        </Pressable>

        {/* Disagree button */}
        <Pressable
          onPress={() => onVote('disagree')}
          style={{
            flex: 1,
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: userVote === 'disagree' ? 2 : 1,
            borderColor: userVote === 'disagree' ? colors.red600 : theme.borderSubtle,
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${disagreePercent}%`,
              backgroundColor:
                userVote === 'disagree' ? colors.red600 + '20' : theme.surfaceElevated,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              gap: 6,
            }}
          >
            <Ionicons
              name={userVote === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={16}
              color={userVote === 'disagree' ? colors.red600 : theme.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: userVote === 'disagree' ? colors.red600 : theme.textSecondary,
              }}
            >
              {t('editorial.disagree', 'Disagree')}
            </Text>
            {total > 0 && (
              <Text style={{ fontSize: 11, color: theme.textTertiary }}>{disagreePercent}%</Text>
            )}
          </View>
        </Pressable>
      </View>

      {total > 0 && (
        <Text style={{ fontSize: 11, color: theme.textTertiary, textAlign: 'center' }}>
          {t('editorial.voteCount', '{{count}} votes', { count: total })}
        </Text>
      )}
    </View>
  );
}
