import type { Flag } from '@/data/schema';
import { message } from '@/i18n/messages';
import { getLocale } from '@/i18n/store';

export const FLAG_LABELS: Record<Flag, string> = {
  'Delisting candidate': 'Meets count screen',
  'Still exceeding': 'Outside criterion',
  'Under-sampled': 'Needs more samples',
};

export const FLAG_SUBLINES: Record<Flag, string> = {
  'Delisting candidate': 'Count threshold met; official status unchanged',
  'Still exceeding': 'Recent samples remain outside criterion',
  'Under-sampled': 'Below the adopted sample minimum',
};

const flagKey: Record<Flag, 'flagCandidate' | 'flagExceeding' | 'flagUnder'> = {
  'Delisting candidate': 'flagCandidate',
  'Still exceeding': 'flagExceeding',
  'Under-sampled': 'flagUnder',
};
const sublineKey: Record<Flag, 'subCandidate' | 'subExceeding' | 'subUnder'> = {
  'Delisting candidate': 'subCandidate',
  'Still exceeding': 'subExceeding',
  'Under-sampled': 'subUnder',
};
export const flagLabel = (flag: Flag) => getLocale() === 'en' ? FLAG_LABELS[flag] : message(flagKey[flag]);
export const flagSubline = (flag: Flag) => getLocale() === 'en' ? FLAG_SUBLINES[flag] : message(sublineKey[flag]);
const officialFlagKey: Record<Flag, 'officialFlagCandidate' | 'officialFlagExceeding' | 'officialFlagUnder'> = {
  'Delisting candidate': 'officialFlagCandidate',
  'Still exceeding': 'officialFlagExceeding',
  'Under-sampled': 'officialFlagUnder',
};

export const flagWithOfficialTerm = (flag: Flag) =>
  `${flagLabel(flag)} (${message(officialFlagKey[flag])})`;
