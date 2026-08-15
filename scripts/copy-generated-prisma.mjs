import { cpSync, existsSync } from 'node:fs';

const source = 'src/generated/prisma';
const dest = 'dist/generated/prisma';

if (!existsSync(source)) {
  throw new Error(
    `Missing ${source}. Run "pnpm exec prisma generate" before "pnpm build".`,
  );
}

cpSync(source, dest, { recursive: true });
console.log(`Copied ${source} -> ${dest}`);
