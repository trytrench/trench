import { toast } from "../components/ui/use-toast";

export const handleError = (error: any) => {
  toast({
    title: "Error",
    description: error.message,
  });
  console.error(error);
};
