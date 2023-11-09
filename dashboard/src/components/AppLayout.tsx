import { Navbar } from "./Navbar";
import { ReleasesModal } from "./ReleasesModal";
import { useState } from "react";
import { api } from "~/utils/api";
import { Toaster } from "./ui/toaster";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  const { data: releases } = api.releases.list.useQuery();
  const [isReleasesModalOpen, setIsReleasesModalOpen] = useState(false);

  // TODO: Show the current dataset
  return (
    <div className="min-h-screen h-0 flex flex-col">
      <Navbar />
      {children}
      <Toaster />
    </div>
  );
}
