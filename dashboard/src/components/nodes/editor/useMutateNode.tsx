import { useToast } from "../../ui/use-toast";
import { api } from "../../../utils/api";

export function useMutateNode() {
  const { toast } = useToast();

  const { mutateAsync: _createNodeDef } = api.nodeDefs.create.useMutation();
  const { mutateAsync: _updateNodeDef } = api.nodeDefs.update.useMutation();

  const createNodeDef: typeof _createNodeDef = async (data) => {
    return _createNodeDef(data)
      .then((newDef) => {
        toast({
          title: "Node created",
          description: `Node "${newDef.name}" created successfully`,
          duration: 5000,
        });
        return newDef;
      })
      .catch((err) => {
        toast({
          title: "Error creating node def",
          description: err.message,
          duration: 5000,
        });
        throw err;
      });
  };

  const updateNodeDef: typeof _updateNodeDef = async (data) => {
    return _updateNodeDef(data)
      .then((updatedDef) => {
        toast({
          title: "Node updated",
          description: `Node "${updatedDef.name}" updated successfully`,
          duration: 5000,
        });
        return updatedDef;
      })
      .catch((err) => {
        toast({
          title: "Error updating node def",
          description: err.message,
          duration: 5000,
        });
        throw err;
      });
  };

  return {
    createNodeDef,
    updateNodeDef,
  };
}
