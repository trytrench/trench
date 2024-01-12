import React, { useContext } from "react";

type EntityContextType = {
  entityId: string;
  entityType: string;
};

const EntityContext = React.createContext<EntityContextType>({
  entityId: "",
  entityType: "",
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
  return (
    <EntityContext.Provider value={{ entityId, entityType }}>
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
