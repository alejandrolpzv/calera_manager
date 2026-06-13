export const config = {
  // Netlify cron runs in UTC. This is Sunday 6:00 PM in Honduras (UTC-6).
  schedule: "0 0 * * 1",
};

export default async function handler() {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.WEEKLY_REPORT_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!secret) {
    return new Response("Missing CRON_SECRET", { status: 500 });
  }

  if (!siteUrl) {
    return new Response("Missing site URL", { status: 500 });
  }

  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/reports/weekly-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
}
