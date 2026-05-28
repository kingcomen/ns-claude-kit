/**
 * SuiteCloud CLI project configuration.
 * `defaultProjectFolder` must match `projectFolder` in jest.config.js.
 */
module.exports = {
  defaultProjectFolder: 'src',
  commands: {
    'project:validate': { authid: 'teibto-sb2' },
    'project:deploy':   { authid: 'teibto-sb2' },
  },
};
