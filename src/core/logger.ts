/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.info(`[SoulDolls Info] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[SoulDolls Warning] ${msg}`, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[SoulDolls Error] ${msg}`, ...args);
  },
};
