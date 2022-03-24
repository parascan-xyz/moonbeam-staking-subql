import { SubstrateEvent } from "@subql/types";
import { Delegation, Delegator } from "../types";
import { ensureCandidate } from "./candidate";

async function ensureDelegator(recordId: string): Promise<Delegator> {
  recordId = recordId.toLowerCase();
  let entity = await Delegator.get(recordId);
  if (!entity) {
    entity = new Delegator(recordId);
    await entity.save();
  }
  return entity;
}

async function ensureDelegation(
  delegatorId: string,
  candidateId: string
): Promise<Delegation> {
  delegatorId = delegatorId.toLowerCase();
  candidateId = candidateId.toLowerCase();
  const recordId = `${delegatorId}-${candidateId}`;
  let entity = await Delegation.get(recordId);
  if (!entity) {
    entity = new Delegation(recordId);
    entity.delegatorId = delegatorId;
    entity.candidateId = candidateId;
    entity.value = BigInt(0);
    await entity.save();
  }
  return entity;
}

/**
 * For parachainStaking-Nomination and parachainStaking-Delegation event
 * @param event
 */
export async function createDelegation(event: SubstrateEvent): Promise<void> {
  const [delegatorId, value, candidateId, added] =
    event.event.data.toJSON() as [string, string, string, string];
  const delegator = await ensureDelegator(delegatorId);
  const candidate = await ensureCandidate(candidateId);
  const entity = await ensureDelegation(delegator.id, candidate.id);
  entity.value = BigInt(value);
  await entity.save();
}

/**
 * For parachainStaking-DelegationDecreased, parachainStaking-DelegationIncreased,
 * parachainStaking-NominationDecreased, parachainStaking-NominationIncreased events
 * @param event
 */
export async function changeDelegation(event: SubstrateEvent): Promise<void> {
  const [delegatorId, candidateId, value, isTop] =
    event.event.data.toJSON() as [string, string, string, boolean];
  const delegator = await ensureDelegator(delegatorId);
  const candidate = await ensureCandidate(candidateId);
  const entity = await ensureDelegation(delegator.id, candidate.id);
  entity.value = BigInt(value);
  await entity.save();
}

/**
 * For parachainStaking-DelegatorLeftCandidate and parachainStaking-NominatorLeftCandidate events
 * @param event
 */
export async function removeDelegation(event: SubstrateEvent): Promise<void> {
  const [delegatorId, candidateId, unstakedAmount, newAmount] =
    event.event.data.toJSON() as [string, string, string, string];
  const delegator = await ensureDelegator(delegatorId);
  const candidate = await ensureCandidate(candidateId);
  const entity = await ensureDelegation(delegator.id, candidate.id);
  await Delegation.remove(entity.id);
}

/**
 * For parachainStaking-DelegatorLeft and parachainStaking-NominatorLeft events
 * @param event
 */
export async function removeDelegator(event: SubstrateEvent): Promise<void> {
  await removeAllDelegations(event.event.data[0].toString().toLowerCase());
}

export async function removeAllDelegations(
  delegatorId?: string,
  candidateId?: string
): Promise<void> {
  if (delegatorId) {
    const delegations = await Delegation.getByDelegatorId(
      delegatorId.toLowerCase()
    );
    delegations.map((d) => Delegation.remove(d.id).then());
  }
  if (candidateId) {
    const delegations = await Delegation.getByCandidateId(
      candidateId.toLowerCase()
    );
    delegations.map((d) => Delegation.remove(d.id).then());
  }
}
