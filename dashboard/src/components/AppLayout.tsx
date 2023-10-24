import { Navbar } from "./Navbar";
import { Toaster } from "./ui/toaster";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen h-0 flex flex-col">
      <Navbar />
      {children}
      <Toaster />
    </div>
  );
}
