const INVITATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-invitation`;

export async function callOnboardingInvitation(payload: Record<string, unknown>, accessToken?: string) {
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(INVITATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey,
      Authorization: `Bearer ${accessToken || apikey}`,
    },
    body: JSON.stringify({ base_url: window.location.origin, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Une erreur est survenue. Veuillez réessayer.");
  return data as any;
}
