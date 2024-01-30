import { useToast } from "../../ui/use-toast";
import { api } from "../../../utils/api";
import { FnDefAny, NodeDefAny } from "event-processing";
import { EntityType, Feature, Rule } from "@prisma/client";

export function useMutationToasts() {
  const { toast } = useToast();

  const handleCreateNodeSuccess = (newDef: NodeDefAny) => {
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

  const handleUpdateNodeSuccess = (updatedDef: NodeDefAny) => {
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

  const handleCreateFunctionSuccess = (newDef: FnDefAny) => {
    toast({
      title: "Function created",
      description: `Function "${newDef.name}" created successfully`,
      duration: 5000,
    });
    return newDef;
  };

  const handleUpdateFunctionSuccess = (updatedDef: FnDefAny) => {
    toast({
      title: "Function updated",
      description: `Function "${updatedDef.name}" updated successfully`,
      duration: 5000,
    });
    return updatedDef;
  };

  const handleUpdateFunctionError = (err: Error) => {
    toast({
      title: "Error updating function",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleCreateEntityTypeSuccess = (entityType: EntityType) => {
    toast({
      title: "Entity type created",
      description: `Entity type "${entityType.type}" created successfully`,
      duration: 5000,
    });
  };

  const handleCreateEntityTypeError = (err: Error) => {
    toast({
      title: "Error creating entity type",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleCreateFeatureSuccess = (feature: Feature) => {
    toast({
      title: "Property created",
      description: `Property "${feature.name}" created successfully`,
      duration: 5000,
    });
  };

  const handleCreateFeatureError = (err: Error) => {
    toast({
      title: "Error creating property",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleCreateRuleSuccess = (rule: Rule & { feature: Feature }) => {
    toast({
      title: "Rule created",
      description: `Rule "${rule.feature.name}" created successfully`,
      duration: 5000,
    });
  };

  const handleCreateRuleError = (err: Error) => {
    toast({
      title: "Error creating rule",
      description: err.message,
      duration: 5000,
    });
    throw err;
  };

  const handleCreateEventFeatureSuccess = (feature: Feature) => {
    toast({
      title: "Event property created",
      description: `${feature.name}`,
    });
  };

  const handleCreateEventFeatureError = (err: Error) => {
    toast({
      variant: "destructive",
      title: "Failed to create event property",
    });
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
      onSuccess: handleCreateFunctionSuccess,
    },
    updateFunction: {
      onError: handleUpdateFunctionError,
      onSuccess: handleUpdateFunctionSuccess,
    },
    createEntityType: {
      onError: handleCreateEntityTypeError,
      onSuccess: handleCreateEntityTypeSuccess,
    },
    createFeature: {
      onError: handleCreateFeatureError,
      onSuccess: handleCreateFeatureSuccess,
    },
    createRule: {
      onError: handleCreateRuleError,
      onSuccess: handleCreateRuleSuccess,
    },
    createEventFeature: {
      onError: handleCreateEventFeatureError,
      onSuccess: handleCreateEventFeatureSuccess,
    },
  };
}
