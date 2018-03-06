// See https://facebook.github.io/jest/docs/en/configuration.html
module.exports = {
  cacheDirectory: '<rootDir>/.basys/.jest',
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/assets/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.basys/'],
  testRegex: '/tests/unit/.*\\.(test|spec)\\.js$',
  transform: {
    '^.+\\.js$': 'basys/lib/webpack/jest-transform',
  },
};
