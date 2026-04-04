const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @sideeffect Prevents worktree file changes from triggering Metro re-bundles
config.watcher = {
  ...config.watcher,
  additionalExts: config.watcher?.additionalExts || [],
};
config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
        ? [config.resolver.blockList]
        : []),
    new RegExp(path.resolve(__dirname, '.claude/worktrees').replace(/[/\\]/g, '[/\\\\]') + '.*'),
  ],
};

module.exports = config;
