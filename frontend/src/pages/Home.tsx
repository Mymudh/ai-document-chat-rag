import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Overview from "../components/Overview";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import RagIntelligence from "../components/RagIntelligence";
import Technology from "../components/Technology";
import UseCases from "../components/UseCases";
import VideoShowcase from "../components/VideoShowcase";
import FinalCTA from "../components/FinalCTA";
import Footer from "../components/Footer";

function Home() {
  return (
    <div className="app">
      <Navbar />

      <main>
        <section id="home">
          <Hero />
        </section>

        <section id="overview">
          <Overview />
        </section>

        <section id="features">
          <Features />
        </section>

        <section id="how-it-works">
          <HowItWorks />
        </section>

        <section id="rag">
          <RagIntelligence />
        </section>

        <section id="technology">
          <Technology />
        </section>

        <section id="use-cases">
          <UseCases />
        </section>

        <section id="showcase">
          <VideoShowcase />
        </section>

        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

export default Home;