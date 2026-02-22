import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MovieRow {
  id: number;
  title: string;
  release_date: string;
  release_type: string;
}

interface OttReleaseRow {
  movie_id: number;
  ott_release_date: string;
  movies: { id: number; title: string };
  platforms: { name: string };
}

interface UserRow {
  id: string;
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Get upcoming theatrical releases this week
    const { data: theatricalMovies } = await supabase
      .from('movies')
      .select('id, title, release_date, release_type')
      .gte('release_date', todayStr)
      .lte('release_date', nextWeekStr)
      .neq('status', 'cancelled')
      .order('release_date', { ascending: true });

    // Get upcoming OTT releases this week
    const { data: ottReleases } = await supabase
      .from('ott_releases')
      .select('movie_id, ott_release_date, movies(id, title), platforms(name)')
      .gte('ott_release_date', todayStr)
      .lte('ott_release_date', nextWeekStr);

    const movies = (theatricalMovies ?? []) as MovieRow[];
    const otts = (ottReleases ?? []) as unknown as OttReleaseRow[];

    // Skip if no releases this week
    if (movies.length === 0 && otts.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No releases this week' }), {
        status: 200,
      });
    }

    // Build digest body
    let body = '';
    if (movies.length > 0) {
      body += 'Theatrical: ' + movies.map((m) => m.title).join(', ');
    }
    if (otts.length > 0) {
      if (body) body += ' | ';
      body += 'OTT: ' + otts.map((o) => `${o.movies.title} on ${o.platforms.name}`).join(', ');
    }

    const title = `This Week in Telugu Cinema (${movies.length + otts.length} releases)`;

    // Get all users with notify_digest = true
    const { data: users } = await supabase.from('profiles').select('id').eq('notify_digest', true);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No digest subscribers' }), {
        status: 200,
      });
    }

    // Insert notifications for each user
    const notifications = (users as UserRow[]).map((u) => ({
      user_id: u.id,
      movie_id: null,
      type: 'weekly_digest' as const,
      title,
      body,
      data: null,
      scheduled_for: new Date().toISOString(),
      status: 'pending' as const,
    }));

    const { error } = await supabase.from('notification_queue').insert(notifications);
    if (error) throw error;

    return new Response(
      JSON.stringify({ sent_to: users.length, releases: movies.length + otts.length }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
