import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../errors/app-error";
import type {
  CreateInventoryItemResult,
  GetInventoryItemResult,
  RecordInventoryMovementResult,
  UpdateInventoryItemResult,
} from "./inventory.service";

function inventoryError(
  message: string,
  code: string,
  statusCode: ContentfulStatusCode,
) {
  return new AppError({ message, code, statusCode });
}

export function throwCreateInventoryItemError(
  result: Exclude<CreateInventoryItemResult, { status: "created" }>,
): never {
  switch (result.status) {
    case "name-conflict":
      throw inventoryError(
        "An inventory item with this name already exists",
        "INVENTORY_ITEM_NAME_EXISTS",
        StatusCodes.CONFLICT,
      );
    case "persistence-failed":
      throw inventoryError(
        "Unable to create the inventory item",
        "INVENTORY_ITEM_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwGetInventoryItemError(
  result: Exclude<GetInventoryItemResult, { status: "found" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw inventoryError(
        "Inventory item not found",
        "INVENTORY_ITEM_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
  }
}

export function throwUpdateInventoryItemError(
  result: Exclude<UpdateInventoryItemResult, { status: "updated" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw inventoryError(
        "Inventory item not found",
        "INVENTORY_ITEM_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "name-conflict":
      throw inventoryError(
        "An inventory item with this name already exists",
        "INVENTORY_ITEM_NAME_EXISTS",
        StatusCodes.CONFLICT,
      );
    case "persistence-failed":
      throw inventoryError(
        "Unable to update the inventory item",
        "INVENTORY_ITEM_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}

export function throwRecordInventoryMovementError(
  result: Exclude<RecordInventoryMovementResult, { status: "recorded" }>,
): never {
  switch (result.status) {
    case "not-found":
      throw inventoryError(
        "Inventory item not found",
        "INVENTORY_ITEM_NOT_FOUND",
        StatusCodes.NOT_FOUND,
      );
    case "insufficient-stock":
      throw inventoryError(
        "The inventory item does not have enough stock",
        "INVENTORY_INSUFFICIENT_STOCK",
        StatusCodes.CONFLICT,
      );
    case "persistence-failed":
      throw inventoryError(
        "Unable to record the inventory movement",
        "INVENTORY_MOVEMENT_PERSISTENCE_FAILED",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
  }
}
