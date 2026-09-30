import { createSourceHost, sourceHost } from './network';
import { createXifan } from './xifan';
import { createAnime7, createTvt } from './sources';
import { createOmofun, omofunPlayerOrigin } from './omofun';
export const defaultAdapters = () => [
  createXifan(sourceHost),
  createAnime7(sourceHost),
  createOmofun(sourceHost, createSourceHost([omofunPlayerOrigin])),
  ...(process.env.HANA_ENABLE_TVTFUN === '1' ? [createTvt(sourceHost)] : []),
];
