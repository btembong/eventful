// Runtime path alias resolver for compiled output.
// Maps @/* → dist/* so tsconfig-paths works without needing the source files.
const { register } = require('tsconfig-paths');
register({
  baseUrl: __dirname,
  paths: { '@/*': ['./dist/*'] },
});
