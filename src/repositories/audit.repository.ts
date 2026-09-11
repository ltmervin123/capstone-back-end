import { prisma } from '../lib/prisma.js';

export async function listAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
