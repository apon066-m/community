import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type {
  CreateInventoryItemInput,
  InventoryItemIdParams,
  InventoryListQuery,
  RecordInventoryMovementInput,
  UpdateInventoryItemInput,
} from "shared";

import type { AppEnv } from "../../app-env";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from "../../middleware/validation";
import {
  throwCreateInventoryItemError,
  throwGetInventoryItemError,
  throwRecordInventoryMovementError,
  throwUpdateInventoryItemError,
} from "./inventory.errors";
import * as inventoryService from "./inventory.service";

export async function listInventoryItemsHandler(c: Context<AppEnv>) {
  const query = getValidatedQuery<InventoryListQuery>(c);
  return c.json(await inventoryService.listInventoryItems(query), StatusCodes.OK);
}

export async function getInventoryItemHandler(c: Context<AppEnv>) {
  const { itemId } = getValidatedParams<InventoryItemIdParams>(c);
  const result = await inventoryService.getInventoryItem(itemId);
  if (result.status !== "found") throwGetInventoryItemError(result);

  return c.json(result.response, StatusCodes.OK);
}

export async function createInventoryItemHandler(c: Context<AppEnv>) {
  const input = getValidatedBody<CreateInventoryItemInput>(c);
  const result = await inventoryService.createInventoryItem(
    input,
    c.get("user")!.id,
  );
  if (result.status !== "created") throwCreateInventoryItemError(result);

  return c.json(result.response, StatusCodes.CREATED);
}

export async function updateInventoryItemHandler(c: Context<AppEnv>) {
  const { itemId } = getValidatedParams<InventoryItemIdParams>(c);
  const input = getValidatedBody<UpdateInventoryItemInput>(c);
  const result = await inventoryService.updateInventoryItem(
    itemId,
    input,
    c.get("user")!.id,
  );
  if (result.status !== "updated") throwUpdateInventoryItemError(result);

  return c.json({ item: result.item }, StatusCodes.OK);
}

export async function recordInventoryMovementHandler(c: Context<AppEnv>) {
  const { itemId } = getValidatedParams<InventoryItemIdParams>(c);
  const movement = getValidatedBody<RecordInventoryMovementInput>(c);
  const result = await inventoryService.recordInventoryMovement({
    itemId,
    movement,
    actorUserId: c.get("user")!.id,
  });
  if (result.status !== "recorded") throwRecordInventoryMovementError(result);

  return c.json(result.response, StatusCodes.OK);
}
