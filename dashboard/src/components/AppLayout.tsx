import { Navbar } from "./Navbar";
import { Toaster } from "./ui/toaster";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="h-0 min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
