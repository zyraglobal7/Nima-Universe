module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['lib/**/*.{ts,tsx}', 'components/ui/**/*.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
