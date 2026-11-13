import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '@root/keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

export type ToolEntry = Awaited<
  ReturnType<typeof reader.collections.tools.read>
>;
