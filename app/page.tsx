import { JobHunt } from "@/components/job-hunt";
import { loadWorkspace } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspace = await loadWorkspace();

  return <JobHunt initialWorkspace={workspace} />;
}
