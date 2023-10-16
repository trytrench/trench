/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import { ensureArray } from "sqrl-common";
import {
  Context,
  Execution,
  Instance,
  Manipulator,
  WhenCause,
  SqrlEntity,
  AT,
} from "sqrl";

export interface LabelService {
  addLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause | null
  );
  removeLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause | null
  );
  hasLabel(ctx: Context, entity: SqrlEntity, label: string): Promise<boolean>;
}

export function registerLabelFunctions(
  instance: Instance,
  service: LabelService
) {
  instance.registerStatement(
    "SqrlLabelStatements",
    async function addLabel(
      state: Execution,
      cause: WhenCause,
      entities: SqrlEntity | SqrlEntity[],
      label: string
    ) {
      ensureArray(entities).forEach((entity) => {
        if (entity !== null) {
          service.addLabel(state.manipulator, entity, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenCause,
        AT.any.sqrlEntityOrEntities,
        AT.constant.string,
      ],
      allowNull: true,
      allowSqrlObjects: true,
      argstring: "entity | entity list, label",
      docstring: "Adds the provided label to the specified entities",
    }
  );

  instance.registerStatement(
    "SqrlLabelStatements",
    async function removeLabel(
      state: Execution,
      cause: WhenCause,
      entities: SqrlEntity | SqrlEntity[],
      label: string
    ) {
      ensureArray(entities).forEach((entity) => {
        if (entity !== null) {
          service.removeLabel(state.manipulator, entity, label, cause);
        }
      });
    },
    {
      args: [
        AT.state,
        AT.whenCause,
        AT.any.sqrlEntityOrEntities,
        AT.constant.string,
      ],
      allowNull: true,
      allowSqrlObjects: true,
      argstring: "entity | entity list, label",
      docstring: "Removes the provided label to the specified entities",
    }
  );

  instance.register(
    async function hasLabel(
      state: Execution,
      entity: SqrlEntity,
      label: string
    ) {
      return service.hasLabel(state.ctx, entity, label);
    },
    {
      args: [AT.state, AT.any.sqrlEntity, AT.constant.string],
      allowSqrlObjects: true,
      argstring: "entity, label",
      docstring: "Returns true if the provided entity has the given label",
    }
  );
}
