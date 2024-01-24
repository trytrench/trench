import { useToast } from "../../ui/use-toast";
import { api } from "../../../utils/api";
import { FnDef, NodeDef } from "event-processing";

export function useMutationToasts() {
  const { toast } = useToast();

  const handleCreateNodeSuccess = (newDef: NodeDef) => {
    toast({
      title: "Node created",
      description: `Node "${newDef.name}" created successfully`,
      duration: 5000,
    });
    return newDef;
  };

  const handleCreateNodeError = (err: Error) => {
    toast({
      title: "Error creating node def",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleUpdateNodeSuccess = (updatedDef: NodeDef) => {
    toast({
      title: "Node updated",
      description: `Node "${updatedDef.name}" updated successfully`,
      duration: 5000,
    });
    return updatedDef;
  };

  const handleUpdateNodeError = (err: Error) => {
    toast({
      title: "Error updating node def",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleCreateFunctionError = (err: Error) => {
    toast({
      title: "Error creating function",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  return {
    createNode: {
      onSuccess: handleCreateNodeSuccess,
      onError: handleCreateNodeError,
    },
    updateNode: {
      onSuccess: handleUpdateNodeSuccess,
      onError: handleUpdateNodeError,
    },
    createFunction: {
      onError: handleCreateFunctionError,
    },
  };
}
