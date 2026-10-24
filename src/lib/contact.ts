// Contact-detail checks shared by the booking form (instant feedback) and the server (the real check).
// Kept free of server-only imports so the browser can use it too.

// UK numbers only: mobiles 07xxx xxxxxx and landlines 01/02/03. Accepts spaces, dashes,
// brackets and +44 / 0044, and returns the number in 07... form, or null if it isn't valid.
export function normaliseUkPhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+44")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0044")) digits = `0${digits.slice(4)}`;
  if (!/^0(7\d{9}|[123]\d{8,9})$/.test(digits)) return null;
  // Reject obvious fakes like 07000000000 or 07777777777.
  if (/^0\d(\d)\1+$/.test(digits)) return null;
  return digits;
}

const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "live.co.uk", "btinternet.com"];

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// "ryan@gmail.con" -> "ryan@gmail.com". Returns null when the domain looks fine.
export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;
  const close = COMMON_DOMAINS.find((d) => editDistance(d, domain) <= 2);
  return close ? `${email.slice(0, at)}@${close}` : null;
}
