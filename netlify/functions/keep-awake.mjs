// Supabase pauses free projects after a week without activity.
// This tiny daily query keeps the booking database awake.
export default async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/availability_blocks?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log("keep-awake", res.status);
};

export const config = { schedule: "@daily" };
