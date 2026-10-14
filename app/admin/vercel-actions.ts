'use server';

import { getLatestVercelDeployments, triggerVercelRedeploy, VercelStatusResponse } from '@/lib/vercel';

/**
 * Server action untuk mendapatkan status deploy Vercel terkini
 */
export async function getVercelDeployStatusAction(): Promise<VercelStatusResponse> {
  return await getLatestVercelDeployments(4);
}

/**
 * Server action untuk memicu deploy ulang Vercel
 */
export async function triggerVercelRedeployAction(): Promise<{
  success: boolean;
  newDeploymentId?: string;
  error?: string;
}> {
  return await triggerVercelRedeploy();
}
