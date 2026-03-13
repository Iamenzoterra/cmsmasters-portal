/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Modules not reachable from any entry point',
      from: { orphan: true, pathNot: [String.raw`\.d\.ts$`, '__tests__', String.raw`\.test\.`] },
      to: {},
    },
    {
      name: 'no-dev-deps-in-prod',
      severity: 'error',
      comment: 'Production code should not depend on devDependencies',
      from: { pathNot: [String.raw`\.test\.`, '__tests__', String.raw`\.config\.`, 'cli/'] },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', '.next', 'dist'],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
