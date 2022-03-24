import { SubstrateEvent } from "@subql/types";
import { Candidate } from "../types";
import { removeAllDelegations } from "./delegate";

export async function ensureCandidate(recordId: string): Promise<Candidate> {
  recordId = recordId.toLowerCase();
  let entity = await Candidate.get(recordId);
  if (!entity) {
    entity = new Candidate(recordId);
    entity.selfBonded = BigInt(10 ** 21);
    await entity.save();
  }
  return entity;
}

/**
 * For parachainStaking-JoinedCollatorCandidates event
 * @param event
 */
export async function createCandidate(event: SubstrateEvent): Promise<void> {
  const [candidateId, amount, amountTotal] = event.event.data.toJSON() as [
    string,
    string,
    string
  ];
  const entity = await ensureCandidate(candidateId);
  entity.selfBonded = BigInt(amount);
  entity.joined = event.block.timestamp;
  await entity.save();
}

/**
 * For parachainStaking-CollatorChosen event
 * @param event
 */
export async function chooseCandidate(event: SubstrateEvent): Promise<void> {
  const entity = await ensureCandidate(event.event.data[1].toString());
  entity.isChosen = true;
  await entity.save();
}

/**
 * For parachainStaking-CandidateBondedLess and parachainStaking-CandidateBondedMore
 * parachainStaking-CollatorBondedLess and parachainStaking-CollatorBondedMore events
 * @param event
 */
export async function changeSelfBonded(event: SubstrateEvent): Promise<void> {
  const [candidateId, amount, newBond] = event.event.data.toJSON() as [
    string,
    string,
    string
  ];
  const entity = await ensureCandidate(candidateId);
  entity.selfBonded = BigInt(newBond);
  await entity.save();
}

/**
 * For parachainStaking-CandidateLeft and parachainStaking-CollatorLeft events
 * @param event
 */
export async function removeCandidate(event: SubstrateEvent): Promise<void> {
  const candidateId = event.event.data[0].toString().toLowerCase();
  await Candidate.remove(candidateId);
  await removeAllDelegations(null, candidateId);
}
