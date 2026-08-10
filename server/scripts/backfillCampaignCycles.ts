import prisma from '../lib/prisma.js';
import { createRolloverNotification, monthEnd, monthStart } from '../lib/campaignCycles.js';

function profileKey(campaign: { clientId: number; name: string; platform: string; googleAdsType: string | null; activeDays: string | null }) {
  return [campaign.clientId, campaign.name.trim(), campaign.platform, campaign.googleAdsType || '', campaign.activeDays || ''].join('|');
}

async function main() {
  const legacyCampaigns = await prisma.campaign.findMany({
    where: { clientId: { not: null } },
    include: { client: true },
    orderBy: { id: 'asc' },
  });

  const profileCache = new Map<string, number[]>();
  let migrated = 0;
  let skipped = 0;

  for (const legacy of legacyCampaigns) {
    if (!legacy.clientId || !legacy.client) {
      skipped++;
      continue;
    }

    const existingPeriod = await prisma.campaignPeriod.findUnique({ where: { legacyCampaignId: legacy.id } });
    if (existingPeriod) {
      skipped++;
      continue;
    }

    const cycleMonth = monthStart(legacy.isArchived ? legacy.endDate : new Date());
    const budgetPeriod = await prisma.clientBudgetPeriod.upsert({
      where: { clientId_month: { clientId: legacy.clientId, month: cycleMonth } },
      create: {
        clientId: legacy.clientId,
        month: cycleMonth,
        baseBudget: legacy.isArchived ? 0 : legacy.client.totalBudget,
        carryIn: legacy.isArchived ? 0 : legacy.client.carryOver,
        status: legacy.isArchived ? 'CLOSED' : 'OPEN',
        startsOn: cycleMonth,
        endsOn: monthEnd(cycleMonth),
        closedAt: legacy.isArchived ? (legacy.archivedAt || legacy.endDate) : null,
      },
      update: {},
    });

    const key = profileKey({
      clientId: legacy.clientId,
      name: legacy.name,
      platform: legacy.platform,
      googleAdsType: legacy.googleAdsType,
      activeDays: legacy.activeDays,
    });
    let profileIds = profileCache.get(key);
    if (!profileIds) {
      const matches = await prisma.campaignProfile.findMany({
        where: {
          clientId: legacy.clientId,
          name: legacy.name.trim(),
          platform: legacy.platform,
          googleAdsType: legacy.googleAdsType,
          activeDays: legacy.activeDays,
        },
        select: { id: true },
      });
      profileIds = matches.map(match => match.id);
      profileCache.set(key, profileIds);
    }

    let profileId = profileIds[0];
    if (profileId) {
      const conflict = await prisma.campaignPeriod.findFirst({
        where: { campaignProfileId: profileId, clientBudgetPeriodId: budgetPeriod.id },
      });
      if (conflict) profileId = undefined;
    }

    if (!profileId) {
      const profile = await prisma.campaignProfile.create({
        data: {
          clientId: legacy.clientId,
          name: legacy.name.trim(),
          platform: legacy.platform,
          googleAdsType: legacy.googleAdsType,
          activeDays: legacy.activeDays,
          isActive: !legacy.isArchived,
        },
      });
      profileId = profile.id;
      profileIds.push(profileId);
    }

    await prisma.campaignPeriod.create({
      data: {
        campaignProfileId: profileId,
        clientBudgetPeriodId: budgetPeriod.id,
        legacyCampaignId: legacy.id,
        budget: legacy.budget,
        spent: legacy.spent,
        startsOn: legacy.createdAt,
        endDate: legacy.endDate,
        status: legacy.isArchived ? 'CLOSED' : 'OPEN',
        closedAt: legacy.isArchived ? (legacy.archivedAt || legacy.endDate) : null,
      },
    });

    if (!legacy.isArchived) {
      await createRolloverNotification(legacy.client.userId, budgetPeriod);
    }
    migrated++;
  }

  console.log(JSON.stringify({ migrated, skipped, legacyTotal: legacyCampaigns.length }));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
