const { readSettings } = require('./adminSettings');
const { readCatalogMeta } = require('./catalogMeta');
const activityLog = require('./activityLog');
const publicTraffic = require('./publicTraffic');

/**
 * @param {{ remainingCredits: number, creditsSource: string, activityStartYmd: string, activityEndYmd: string, activityPreset: string }} opts
 */
function buildStatsPayload({
  remainingCredits,
  creditsSource,
  activityStartYmd,
  activityEndYmd,
  activityPreset,
}) {
  const meta = readCatalogMeta();
  const s = readSettings();
  const disV2 = s.disabled?.v2?.length || 0;
  const disLeg = s.disabled?.legacy?.length || 0;
  const activeV2 = Math.max(0, meta.v2PlatformCount - disV2);
  const activeLegacy = Math.max(0, meta.legacyCount - disLeg);

  const log = activityLog.readLog();
  const okCount = log.filter((r) => r.ok).length;
  const failCount = log.filter((r) => !r.ok).length;

  const activityByDay = activityLog.aggregateByDayRange(
    activityStartYmd,
    activityEndYmd
  );
  const mostUsedApi = activityLog.topEndpointsInRange(
    activityStartYmd,
    activityEndYmd,
    14
  );

  const visitsByDay = publicTraffic.visitsByDayRange(
    activityStartYmd,
    activityEndYmd
  );
  const trafficSummary = publicTraffic.summaryInRange(
    activityStartYmd,
    activityEndYmd
  );
  const ipBreakdown = publicTraffic.ipBreakdownInRange(
    activityStartYmd,
    activityEndYmd,
    60
  );

  return {
    remainingCredits,
    creditsSource,
    totalScrapesDone: okCount,
    totalScrapeAttempts: log.length,
    scrapeFailures: failCount,
    activeScrapers: activeV2 + activeLegacy,
    activeV2,
    activeLegacy,
    totalV2Platforms: meta.v2PlatformCount,
    totalLegacyModules: meta.legacyCount,
    endpointCount: meta.endpointCount,
    activityByDay,
    activityWindow: {
      preset: activityPreset,
      start: activityStartYmd,
      end: activityEndYmd,
    },
    mostUsedApi,
    visitsByDay,
    trafficSummary,
    ipBreakdown,
    recentActivity: activityLog.recent(20),
  };
}

module.exports = { buildStatsPayload };
