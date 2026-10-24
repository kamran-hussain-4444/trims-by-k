import "server-only";
import { promises as dns } from "node:dns";

// Does this email's domain exist and accept mail? Catches typos like "gmail.con" that would
// otherwise bounce every booking email. Only says "no" when DNS clearly answers "no such
// domain"; timeouts and DNS hiccups count as "yes" so a slow lookup never blocks a booking.
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const lookup = async () => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length > 0) return true;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "ENOTFOUND" && code !== "ENODATA") return true;
    }
    // No MX record: mail can still go to the domain's A record, if it has one.
    try {
      return (await dns.resolve4(domain)).length > 0;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      return code !== "ENOTFOUND" && code !== "ENODATA";
    }
  };
  return Promise.race([lookup(), new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000))]);
}
