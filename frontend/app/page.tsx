import Nav from "@/components/nav";
import Hero from "@/components/hero";
import Problem from "@/components/problem";
import Trinity from "@/components/trinity";
import Workflow from "@/components/workflow";
import Files from "@/components/files";
import Agents from "@/components/agents";
import Commands from "@/components/commands";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg">
      <Nav />
      <Hero />
      <Problem />
      <Trinity />
      <Workflow />
      <Files />
      <Agents />
      <Commands />
      <Footer />
    </main>
  );
}
