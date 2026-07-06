// CODM V7.6 - compatibility wrapper database-only.
// Mantiene i vecchi import senza reintrodurre eventi locali/PWA.
export { saveCodmEvent as saveCodmEventPwa, retryPendingCodmEvents } from './codmEventRepository.js';
