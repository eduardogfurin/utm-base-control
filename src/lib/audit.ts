import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface AuditParams {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  vehicleId?: string;
  campaignId?: string;
  linkId?: string;
}

export async function createAuditLog(params: AuditParams) {
  return prisma.auditLog.create({ data: params });
}

export async function diffAndAudit<T extends Record<string, unknown>>(
  userId: string,
  entityType: string,
  entityId: string,
  before: T,
  after: T,
  relatedIds?: { vehicleId?: string; campaignId?: string; linkId?: string }
) {
  const promises: Promise<unknown>[] = [];
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      promises.push(
        createAuditLog({
          userId,
          action: AuditAction.UPDATED,
          entityType,
          entityId,
          field: key,
          oldValue: String(before[key] ?? ""),
          newValue: String(after[key] ?? ""),
          ...relatedIds,
        })
      );
    }
  }
  await Promise.all(promises);
}
