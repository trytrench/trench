import React, { useContext } from "react";
import { AnnotatedFeature } from "../../../shared/types";
import { api } from "../../../utils/api";

type EntityContextType = {
  entityId: string;
  entityType: string;
  features: AnnotatedFeature[];
};

const EntityContext = React.createContext<EntityContextType>({
  entityId: "",
  entityType: "",
  features: [],
});

export const EntityProvider = ({
  children,
  entityId,
  entityType,
}: {
  children: React.ReactNode;
  entityId: string;
  entityType: string;
}) => {
  const { data: features } = api.lists.getEntitiesList.useQuery({
    entityFilters: { entityId, entityType },
  });

  return (
    <EntityContext.Provider
      value={{
        entityId,
        entityType,
        features: features?.rows[0]?.features ?? [],
      }}
    >
      {children}
    </EntityContext.Provider>
  );
};

export const useEntity = () => {
  const context = useContext(EntityContext);

  if (!context) {
    throw new Error("useEntity must be used within an EntityProvider");
  }

  return context;
};
