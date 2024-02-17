import { Navbar } from "./Navbar";
import { Toaster } from "./ui/toaster";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow w-full min-h-0">{children}</div>
    </div>
  );
}
