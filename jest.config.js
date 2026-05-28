/**
 * Jest config — inner loop unit tests.
 * Uses Oracle's official SuiteCloud Jest preset which ships N/* module stubs
 * and the AMD (define([...])) -> CommonJS transform, so you don't hand-roll it.
 *
 * @author Wichit Wongta
 */
const SuiteCloudJestConfiguration = require('@oracle/suitecloud-unit-testing/jest-configuration/SuiteCloudJestConfiguration');

module.exports = SuiteCloudJestConfiguration.build({
  projectFolder: 'src',
  // ACP = customizing your own account/SDF project. Use SUITEAPP if shipping a SuiteApp.
  projectType: SuiteCloudJestConfiguration.ProjectType.ACP,
});

// Extra knobs merged on top of the preset:
module.exports.collectCoverageFrom = ['src/FileCabinet/SuiteScripts/**/*.js'];
module.exports.coverageThreshold = {
  global: { branches: 50, functions: 60, lines: 60, statements: 60 },
};
module.exports.testMatch = ['**/tests/unit/**/*.test.js'];
