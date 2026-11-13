import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '@root/keystatic.config';

export const { GET, POST } = makeRouteHandler({
  config,
});
