---
title: "Advanced: Data Transformations"
sidebar_position: 3
draft: true
---

This guide provides a step-by-step process for creating custom transformations on data before applying your rule sets.

### Introduction

Trench enhances data through **transformations** before rules are applied. This enhancement can include:

1. Aggregation queries on data. For instance, determining the number of cards a customer has used in the past day.
2. Retrieval of data from external APIs.
3. Execution of valuable computations.

This guide will demonstrate how you can add your own custom transformation using Trench's Flow system.

### Understanding Flow

To maintain an optimal execution timeline while adding or modifying transformations, Trench leverages [Flow](https://github.com/trytrench/flow), a type-safe DAG execution library. The main components of a transformation are located in `dashboard/src/server/transforms/ruleInput.ts`:

- `ruleInputNode`: This is responsible for computing the final output of the transformations that will be injected into the rules.
- `RuleInput`: This represents the type of the input that the rules receive.

Here's a snippet illustrating how these components interact:

```typescript
const result = await ruleInputNode.run({ paymentAttempt });

for (const rule of rules) {
  const signal = rule.getSignal(result);
}
```

### Creating a Custom Transformation

To add a custom transformation, you'll define it and then integrate it into the `ruleInputNode` as a dependency. Consider this code block, which is a modification of `ruleInput.ts`:

```typescript{0, 4-13, 19}
import { node } from "./flow";
import { aggregationNode } from "./nodes/aggregations";
import { type inferNodeOutput } from "@trytrench/flow";

export const splitNameNode = node.resolver(({ input }) => {
  const { paymentAttempt } = input;
  const nameArr = paymentAttempt.paymentMethod.name?.split(" ") || [];
  const firstName = nameArr[0];
  const lastName = nameArr.slice(1).join(" ");
  return {
    firstName,
    lastName,
  };
});

export const ruleInputNode = node
  .depend({
    transforms: {
      aggregations: aggregationNode,
      splitName: splitNameNode,
    },
  })
  .resolver(({ input, deps }) => {
    const { paymentAttempt, blockLists } = input;
    const { transforms } = deps;
    return {
      paymentAttempt: paymentAttempt,
      lists: blockLists,
      transforms,
    };
  });

export type RuleInput = inferNodeOutput<typeof ruleInputNode>;
```

In this case, the `splitNameNode` is a custom transformation that splits a full name into first and last names. It's added as a dependency in `ruleInputNode`.

After adding the custom transformation, you need to update your types by running `yarn generate-types`. This action will reflect your new types in the dashboard's rule editor. Once you push your updates, the system will deploy, making your transformations operational.

The rule editor can now access your newly transformed data:

```typescript
function getSignal(input: RuleInput) {
  const { firstName, lastName } = input.transforms.splitName;

  // ...
}
```

In this instance, the `getSignal` function is accessing the `firstName` and `lastName` values from the `splitName` transformation.

---

Remember, by personalizing transformations to suit your specific needs, you can make your rule sets more effective and your data more insightful.
