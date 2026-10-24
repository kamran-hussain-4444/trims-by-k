import { deleteTestData } from "./helpers";

export default async function teardown() {
  const n = await deleteTestData();
  console.log(`\nTeardown: deleted ${n} test clients and their bookings.`);
}
