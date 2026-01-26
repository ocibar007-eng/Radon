import type { BanlistResult } from '../utils/banlist';
import type { BlacklistResult } from '../utils/blacklist';

export interface QAResult {
  passed: boolean;
  banlist: BanlistResult;
  blacklist: BlacklistResult;
  structure: {
    passed: boolean;
    missing_sections: string[];
  };
  issues: string[];
}
