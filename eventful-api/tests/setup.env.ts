// Runs before any test module is imported (via setupFiles in jest.config.ts).
// Sets test env vars so that import 'dotenv/config' in env.ts
// finds them already set and does not overwrite them.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
