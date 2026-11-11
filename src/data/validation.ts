/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LUMINADEX_ENTRIES } from './mobs';
import { logger } from '../core/logger';

export function validateDataDefinitions() {
  const ids = new Set<string>();
  
  LUMINADEX_ENTRIES.forEach(entry => {
    if (ids.has(entry.num)) {
      logger.error(`Duplicate definition ID found: ${entry.num}`);
    }
    ids.add(entry.num);
  });
  
  logger.info('Data definitions validated successfully.');
}
