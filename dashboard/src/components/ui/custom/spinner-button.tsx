import { Loader2 } from "lucide-react";
import { Button } from "../button";

interface SpinnerButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

function SpinnerButton({ loading, ...props }: SpinnerButtonProps) {
  return (
    <Button {...props}>
      <Loader2
        className={`${
          loading ? "w-4 mr-2" : "w-0 mr-0"
        } h-4 animate-spin transition-all`}
      />
      {props.children}
    </Button>
  );
}

export { SpinnerButton };
