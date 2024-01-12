const path = require("path");
const common = require('../../.jest/common');

module.exports = {
  ...common,
  displayName: path.basename(__dirname),
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
}
