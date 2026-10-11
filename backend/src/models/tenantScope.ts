import type { Model, ModelStatic } from "sequelize";

type TenantModel = ModelStatic<Model>;

function validateStoreId(storeId: number): number {
  if (!Number.isSafeInteger(storeId) || storeId < 1) {
    throw new TypeError("A valid storeId is required for tenant queries");
  }

  return storeId;
}

export function addStoreScope(model: TenantModel): void {
  model.addScope(
    "forStore",
    (storeId: number) => ({ where: { storeId: validateStoreId(storeId) } }),
    { override: true }
  );
}

export function forStore(model: TenantModel, storeId: number): TenantModel {
  return model.scope({ method: ["forStore", validateStoreId(storeId)] });
}