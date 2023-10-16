import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { DialogClose } from "@radix-ui/react-dialog";

interface Props {
  onPublish: (version: string, description?: string) => void;
  initialVersion: string;
  button: React.ReactNode;
}

function updateSemver(version: string, type: "major" | "minor" | "patch") {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Invalid semver format");
  }

  const [major, minor, patch] = version.split(".").map((x) => parseInt(x, 10));

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

export const PublishModal = ({ onPublish, initialVersion, button }: Props) => {
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState<"major" | "minor" | "patch">("patch");

  return (
    <Dialog>
      <DialogTrigger asChild>{button}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>

          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div>
          <div className="grid w-full max-w-sm items-center gap-1.5 mb-4">
            <Label htmlFor="description">Description</Label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              id="description"
            />
          </div>

          <RadioGroup
            defaultValue="minor"
            value={version}
            onValueChange={setVersion}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="major" id="major" />
              <Label htmlFor="major">
                Major ({updateSemver(initialVersion, "major")})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="minor" id="minor" />
              <Label htmlFor="minor">
                Minor ({updateSemver(initialVersion, "minor")})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patch" id="patch" />
              <Label htmlFor="patch">
                Patch ({updateSemver(initialVersion, "patch")})
              </Label>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={onPublish}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
