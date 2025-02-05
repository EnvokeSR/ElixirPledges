import { Button } from "@/components/ui/button";
import { useState } from "react";
import PledgeModal from "@/components/pledge-modal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Take The Pledge
        </h1>
        <p className="text-lg text-muted-foreground">
          Join your fellow students in making a commitment to digital citizenship
          and online responsibility.
        </p>
        <Button
          size="lg"
          className="text-lg px-8"
          onClick={() => setIsModalOpen(true)}
        >
          Record Your Pledge
        </Button>
      </div>

      <PledgeModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
