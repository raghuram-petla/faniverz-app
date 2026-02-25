// Static map of platform ID → local PNG asset
// Metro bundler requires static require() calls (no dynamic expressions)
const platformLogos: Record<string, ReturnType<typeof require>> = {
  aha: require('../../assets/platforms/aha.png'),
  netflix: require('../../assets/platforms/netflix.png'),
  prime: require('../../assets/platforms/prime.png'),
  hotstar: require('../../assets/platforms/hotstar.png'),
  zee5: require('../../assets/platforms/zee5.png'),
  sunnxt: require('../../assets/platforms/sunnxt.png'),
  sonyliv: require('../../assets/platforms/sonyliv.png'),
  etvwin: require('../../assets/platforms/etvwin.png'),
};

export function getPlatformLogo(platformId: string): ReturnType<typeof require> | null {
  return platformLogos[platformId] ?? null;
}
