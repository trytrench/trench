import { Button, Icon } from "@chakra-ui/react";
import { Navbar } from "./Navbar";
import { Tag } from "lucide-react";
import { ReleasesModal } from "./ReleasesModal";
import { useState } from "react";
import { api } from "~/utils/api";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  const { data: releases } = api.releases.list.useQuery();
  const [isReleasesModalOpen, setIsReleasesModalOpen] = useState(false);

  // TODO: Show the current dataset
  return (
    <div className="min-h-screen h-0 flex flex-col">
      <ReleasesModal
        isOpen={isReleasesModalOpen}
        onClose={() => setIsReleasesModalOpen(false)}
        releases={releases ?? []}
      />
      <Navbar />
      {children}
      <div className="fixed bottom-0 bg-white left-0 right-0">
        <Button colorScheme="blue" size="xs" rounded="none">
          Production
        </Button>
        <Button
          leftIcon={<Icon as={Tag} />}
          size="xs"
          rounded="none"
          onClick={() => setIsReleasesModalOpen(true)}
        >
          v0.0.0
        </Button>
      </div>
    </div>
  );
}
