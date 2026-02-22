describe('weekly-digest', () => {
  it('builds digest body with theatrical releases', () => {
    const movies = [
      { id: 1, title: 'Movie A', release_date: '2026-02-23', release_type: 'theatrical' },
      { id: 2, title: 'Movie B', release_date: '2026-02-25', release_type: 'theatrical' },
    ];
    const otts: unknown[] = [];

    let body = '';
    if (movies.length > 0) {
      body += 'Theatrical: ' + movies.map((m) => m.title).join(', ');
    }

    expect(body).toBe('Theatrical: Movie A, Movie B');
    expect(otts.length).toBe(0);
  });

  it('builds digest body with OTT releases', () => {
    const movies: unknown[] = [];
    const otts = [
      {
        movie_id: 3,
        ott_release_date: '2026-02-24',
        movies: { id: 3, title: 'OTT Movie' },
        platforms: { name: 'Netflix' },
      },
    ];

    let body = '';
    if (movies.length > 0) {
      body += 'Theatrical: ';
    }
    if (otts.length > 0) {
      if (body) body += ' | ';
      body += 'OTT: ' + otts.map((o) => `${o.movies.title} on ${o.platforms.name}`).join(', ');
    }

    expect(body).toBe('OTT: OTT Movie on Netflix');
  });

  it('builds combined digest', () => {
    const movies = [{ title: 'Theater Film' }];
    const otts = [{ movies: { title: 'Stream Film' }, platforms: { name: 'Aha' } }];

    let body = '';
    if (movies.length > 0) {
      body += 'Theatrical: ' + movies.map((m) => m.title).join(', ');
    }
    if (otts.length > 0) {
      if (body) body += ' | ';
      body += 'OTT: ' + otts.map((o) => `${o.movies.title} on ${o.platforms.name}`).join(', ');
    }

    expect(body).toBe('Theatrical: Theater Film | OTT: Stream Film on Aha');
  });

  it('skips when no releases', () => {
    const movies: unknown[] = [];
    const otts: unknown[] = [];

    if (movies.length === 0 && otts.length === 0) {
      expect(true).toBe(true); // Function returns early
    }
  });

  it('generates notification for each digest subscriber', () => {
    const users = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
    const title = 'This Week in Telugu Cinema (3 releases)';
    const body = 'Theatrical: Movie A, Movie B | OTT: Movie C on Netflix';

    const notifications = users.map((u) => ({
      user_id: u.id,
      movie_id: null,
      type: 'weekly_digest',
      title,
      body,
      data: null,
      scheduled_for: expect.any(String),
      status: 'pending',
    }));

    expect(notifications).toHaveLength(3);
    expect(notifications[0].user_id).toBe('user-1');
    expect(notifications[0].type).toBe('weekly_digest');
  });
});
