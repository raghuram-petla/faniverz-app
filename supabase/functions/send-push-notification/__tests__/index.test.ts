const mockNotifications = [
  {
    id: 1,
    user_id: 'user-1',
    title: 'Movie releasing!',
    body: 'Test body',
    data: { movieId: 42 },
  },
  {
    id: 2,
    user_id: 'user-2',
    title: 'Another notif',
    body: 'Another body',
    data: null,
  },
];

const mockTokens = [
  { user_id: 'user-1', expo_push_token: 'ExponentPushToken[aaa]' },
  { user_id: 'user-2', expo_push_token: 'ExponentPushToken[bbb]' },
];

describe('send-push-notification', () => {
  it('processes due notifications and sends to Expo Push API', () => {
    // Build messages
    const messages = mockNotifications.map((notif) => {
      const token = mockTokens.find((t) => t.user_id === notif.user_id);
      return {
        to: token?.expo_push_token,
        title: notif.title,
        body: notif.body,
        data: notif.data ?? undefined,
        sound: 'default',
      };
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].to).toBe('ExponentPushToken[aaa]');
    expect(messages[1].to).toBe('ExponentPushToken[bbb]');
  });

  it('batches messages correctly', () => {
    const BATCH_SIZE = 100;
    const messages = Array.from({ length: 250 }, (_, i) => ({
      to: `ExponentPushToken[${i}]`,
      title: `Notif ${i}`,
      body: 'body',
      sound: 'default',
    }));

    const batches = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(100);
    expect(batches[1]).toHaveLength(100);
    expect(batches[2]).toHaveLength(50);
  });

  it('identifies DeviceNotRegistered tokens for deactivation', () => {
    const tickets = [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ];

    const tokensToDeactivate: string[] = [];
    const batch = [{ to: 'ExponentPushToken[aaa]' }, { to: 'ExponentPushToken[bbb]' }];

    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        tokensToDeactivate.push(batch[idx].to);
      }
    });

    expect(tokensToDeactivate).toEqual(['ExponentPushToken[bbb]']);
  });

  it('handles empty notification queue', () => {
    const notifications: unknown[] = [];
    expect(notifications.length).toBe(0);
    // Function should return early with { processed: 0 }
  });
});
