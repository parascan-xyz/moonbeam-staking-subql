import { Reward } from "../types";
import { SubstrateEvent } from "@subql/types";

/**
 * For parachainStaking-Rewarded event
 * @param data
 */
export async function createReward(event: SubstrateEvent): Promise<void> {
  const [accountId, value] = event.event.data.toJSON() as [string, string];
  const block = event.block.block.header.number.toString();
  const entity = Reward.create({
    id: `${block}-${event.idx}`,
    blockNumber: Number(block),
    eventIdx: event.idx,
    account: accountId.toLowerCase(),
    value: BigInt(value),
    timestamp: event.block.timestamp,
  });
  await entity.save();
}
