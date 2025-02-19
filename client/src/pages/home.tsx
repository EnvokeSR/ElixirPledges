import { Button } from "@/components/ui/button";
import { useState } from "react";
import PledgeModal from "@/components/pledge-modal";
import Sponsor1 from "@/assets/sponsor1.jpg";
import Sponsor2 from "@/assets/sponsor2.png";
import Sponsor3 from "@/assets/sponsor3.png";
import Sponsor4 from "@/assets/sponsor4.png";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-between p-4">
      <div className="max-w-3xl text-center space-y-6 animate-fade-in-down">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-pulse">
          Take The Pledge
        </h1>
        <p className="text-lg text-muted-foreground animate-fade-in">
          Join your fellow students in making a commitment to social
          responsibility.
        </p>
        <Button
          size="lg"
          className="text-lg px-8 animate-bounce"
          onClick={() => setIsModalOpen(true)}
        >
          Record Your Pledge
        </Button>
      </div>

      <div className="mt-12 w-full max-w-4xl">
        <h2 className="text-2xl font-semibold text-center mb-8 animate-fade-in">
          Our Partners
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
          {/* Replace these with actual sponsor logos */}
          <div className="w-32 h-32 bg-white rounded-lg shadow-lg flex items-center justify-center animate-fade-in p-4">
            <img
              src={Sponsor1}
              alt="EnvokeSR"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="w-32 h-32 bg-white rounded-lg shadow-lg flex items-center justify-center animate-fade-in p-4">
            <img
              src={Sponsor3}
              alt="NexusConsulting"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="w-32 h-32 bg-white rounded-lg shadow-lg flex items-center justify-center animate-fade-in p-4">
            <img
              src={Sponsor2}
              alt="SecondChanceSanctuary"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="w-32 h-32 bg-white rounded-lg shadow-lg flex items-center justify-center animate-fade-in p-4">
            <img
              src={Sponsor4}
              alt="Elixir International"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </div>

      <PledgeModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
