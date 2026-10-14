export interface VercelCommitMeta {
  message: string;
  author: string;
  sha: string;
  branch: string;
}

export interface VercelDeployment {
  id: string;
  name: string;
  url: string;
  state: 'READY' | 'BUILDING' | 'INITIALIZING' | 'ERROR' | 'QUEUED' | 'CANCELED' | string;
  target: 'production' | 'preview' | string;
  createdAt: number;
  creator: string;
  inspectorUrl: string;
  commit?: VercelCommitMeta;
}

export interface VercelStatusResponse {
  configured: boolean;
  deployments: VercelDeployment[];
  latest: VercelDeployment | null;
  error?: string;
}

/**
 * Mengambil daftar deployment terbaru dari Vercel REST API
 */
export async function getLatestVercelDeployments(limit = 4): Promise<VercelStatusResponse> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamSlug = process.env.VERCEL_TEAM_SLUG || 'hakims-projects-fb1f8856';

  if (!token || !projectId) {
    return {
      configured: false,
      deployments: [],
      latest: null,
      error: 'VERCEL_API_TOKEN atau VERCEL_PROJECT_ID belum dikonfigurasi di .env.local',
    };
  }

  try {
    const url = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 }, // no-store realtime
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        configured: true,
        deployments: [],
        latest: null,
        error: errJson.error?.message || `Gagal mengambil deployment (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    const rawDeployments: any[] = data.deployments || [];

    const deployments: VercelDeployment[] = rawDeployments.map((d) => {
      const cleanId = (d.uid || d.id || '').replace(/^dpl_/, '');
      const inspectorUrl = `https://vercel.com/${teamSlug}/${d.name}/${cleanId}`;
      const state = (d.state || d.readyState || 'QUEUED').toUpperCase();

      const commit: VercelCommitMeta = {
        message: d.meta?.githubCommitMessage || 'Manual / Instant Deploy',
        author: d.meta?.githubCommitAuthorName || d.creator?.username || 'Redaksi',
        sha: (d.meta?.githubCommitSha || '').substring(0, 7) || '-',
        branch: d.meta?.githubCommitRef || 'main',
      };

      return {
        id: d.uid || d.id,
        name: d.name,
        url: d.url ? `https://${d.url}` : 'https://naratif.web.id',
        state,
        target: d.target || 'production',
        createdAt: d.created || Date.now(),
        creator: d.creator?.username || 'Redaksi',
        inspectorUrl,
        commit,
      };
    });

    return {
      configured: true,
      deployments,
      latest: deployments.length > 0 ? deployments[0] : null,
    };
  } catch (err: any) {
    return {
      configured: true,
      deployments: [],
      latest: null,
      error: err.message || 'Gagal menghubungi Vercel API',
    };
  }
}

/**
 * Memicu Deploy Ulang (Trigger Redeploy) di Vercel
 */
export async function triggerVercelRedeploy(): Promise<{
  success: boolean;
  newDeploymentId?: string;
  error?: string;
}> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return { success: false, error: 'Kredensial Vercel belum lengkap di .env.local' };
  }

  try {
    // 1. Dapatkan deployment terakhir untuk dijadikan basis redeploy
    const current = await getLatestVercelDeployments(1);
    if (!current.latest) {
      return { success: false, error: 'Tidak ditemukan deployment sebelumnya untuk di-redeploy' };
    }

    // 2. Trigger Redeploy via POST /v13/deployments
    const res = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: current.latest.name,
        deploymentId: current.latest.id,
        target: 'production',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `Gagal trigger redeploy (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      newDeploymentId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan jaringan saat trigger redeploy',
    };
  }
}
