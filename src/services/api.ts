
/**
 * API service for interacting with the Phish.net API
 * This file re-exports functionality from the refactored modules
 */

export { fetchShowByDate } from './shows-api';
export { formatShowDate } from './date-utils';
export { transformShowData, extractShowTags } from './show-processor';
export type { 
  ShowData, 
  Show, 
  Tour, 
  Tag, 
  Tierset, 
  Tier, 
  Song, 
  SongItem, 
  Set 
} from '../types/show';
