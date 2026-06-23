import Community from "../Community";
import { Nav } from "@/components/ds/Nav";

export default function CommunityDashboardPage() {
  return (
    <>
      <Nav />
      <div style={{ paddingTop: 70 }}>
        <Community initialPage="dashboard" />
      </div>
    </>
  );
}
