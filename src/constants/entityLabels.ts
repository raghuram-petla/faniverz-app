// @contract i18n key maps for entity types — used in profile activity and following sections
// @sync keys must match translation entries in i18n locale files

/** Maps entity type to the i18n key used in activity action labels (e.g. "Followed a movie") */
// @coupling used by ActivityItem to build follow/unfollow action descriptions
export const ENTITY_ACTION_LABEL_KEYS: Record<string, string> = {
  movie: 'profile.entityMovie',
  actor: 'profile.entityActor',
  production_house: 'profile.entityStudio',
  feed_item: 'profile.entityPost',
};

/** Maps entity type to the i18n key used in following category chips (e.g. "1 Movies") */
// @coupling used by FollowingSection to render grouped entity type counts
export const ENTITY_FOLLOWING_LABEL_KEYS: Record<string, string> = {
  movie: 'profile.followingMovies',
  actor: 'profile.followingActors',
  production_house: 'profile.followingStudios',
  user: 'profile.followingUsers',
};
