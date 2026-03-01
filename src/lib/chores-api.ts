import type { ChoresData, Kid, Chore, ChoreLog, Reward, RewardClaim, KidBadge, ChoreSettings, ChoreSubmission } from "./chores-types";

const BASE = "/api/chores";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export const choresApi = {
  // Full data
  getData: () => get<ChoresData>(""),

  // Kids
  addKid: (kid: Omit<Kid, "id">) => post<Kid>("/kids", kid),
  updateKid: (id: string, kid: Partial<Kid>) => put<Kid>(`/kids/${id}`, kid),
  deleteKid: (id: string) => del(`/kids/${id}`),

  // Chores
  addChore: (chore: Omit<Chore, "id" | "createdAt">) => post<Chore>("/chores", chore),
  updateChore: (id: string, chore: Partial<Chore>) => put<Chore>(`/chores/${id}`, chore),
  deleteChore: (id: string) => del(`/chores/${id}`),

  // Logs
  completeChore: (choreId: string, kidId: string, photoUrl?: string) =>
    post<ChoreLog>("/logs", { choreId, kidId, photoUrl }),
  undoChore: (logId: string) => put<ChoreLog>(`/logs/${logId}/undo`, {}),
  deleteLog: (logId: string) => del(`/logs/${logId}`),
  approveChore: (logId: string) => put<ChoreLog>(`/logs/${logId}/approve`, {}),

  // Rewards
  addReward: (reward: Omit<Reward, "id">) => post<Reward>("/rewards", reward),
  updateReward: (id: string, reward: Partial<Reward>) => put<Reward>(`/rewards/${id}`, reward),
  deleteReward: (id: string) => del(`/rewards/${id}`),
  claimReward: (rewardId: string, kidId: string) =>
    post<RewardClaim>("/rewards/claim", { rewardId, kidId }),

  // Settings
  updateSettings: (settings: Partial<ChoreSettings>) => put<ChoreSettings>("/settings", settings),


  // Submissions
  submitChore: (submission: { kidId: string; title: string; note?: string; photoUrl?: string; points: number }) =>
    post<ChoreSubmission>("/submissions", submission),
  approveSubmission: (id: string) => put<ChoreSubmission>(`/submissions/${id}/approve`, {}),
  rejectSubmission: (id: string, reason?: string) => put<ChoreSubmission>(`/submissions/${id}/reject`, { reason }),

  // Upload chore photo
  uploadPhoto: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/photos/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: [{ name: `chore_${Date.now()}.jpg`, data: reader.result }],
            }),
          });
          const data = await res.json();
          resolve(data.uploaded?.[0]?.url ?? "");
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsDataURL(file);
    });
  },
};
