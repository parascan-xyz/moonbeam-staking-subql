import {
  SubstrateEvent,
  SubstrateBlock,
  SubstrateExtrinsic,
} from "@subql/types";
import { extractAuthor } from "@polkadot/api-derive/type/util";
import { Block, Identity } from "../types";
import { Dispatcher } from "../handlers/dispatcher";
import {
  changeSelfBonded,
  chooseCandidate,
  createCandidate,
  removeCandidate,
} from "../handlers/candidate";
import {
  changeDelegation,
  createDelegation,
  removeDelegation,
  removeDelegator,
} from "../handlers/delegate";
import { createReward } from "../handlers/reward";

const dispatch = new Dispatcher<SubstrateEvent>();
dispatch.batchRegist([
  // Staking
  // Lingo really change between spec versions
  // e.g Collator to Candidate and Nomination to Delegation
  { key: "CandidateBondedLess", handler: changeSelfBonded },
  { key: "CandidateBondedMore", handler: changeSelfBonded },
  { key: "CandidateLeft", handler: removeCandidate },
  { key: "CollatorBondedLess", handler: changeSelfBonded },
  { key: "CollatorBondedMore", handler: changeSelfBonded },
  { key: "CollatorChosen", handler: chooseCandidate },
  { key: "CollatorLeft", handler: removeCandidate },
  { key: "Delegation", handler: createDelegation },
  { key: "DelegationDecreased", handler: changeDelegation },
  { key: "DelegationIncreased", handler: changeDelegation },
  { key: "DelegatorLeft", handler: removeDelegator },
  { key: "DelegatorLeftCandidate", handler: removeDelegation },
  { key: "JoinedCollatorCandidates", handler: createCandidate },
  { key: "Nomination", handler: createDelegation },
  { key: "NominationDecreased", handler: changeDelegation },
  { key: "NominationIncreased", handler: changeDelegation },
  { key: "NominatorLeft", handler: removeDelegator },
  { key: "NominatorLeftCollator", handler: removeDelegation },
  { key: "Rewarded", handler: createReward },
]);

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  const blockNumber = block.block.header.number.toNumber();
  //const validators = await api.query.session.validators();
  //type CP = Array<{owner: string; amount: bigint}
  //const selectedCandidates = api.query.parachainStaking.selectedCandidates()
  const candidatePool = JSON.parse(
    (await api.query.parachainStaking.candidatePool()).toString()
  );
  const validators = candidatePool.map((x) => x.owner);
  const author = extractAuthor(block.block.header.digest, validators);
  const entity = Block.create({
    id: blockNumber.toString(),
    author: author?.toString(),
  });
  await entity.save();
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  await dispatch.dispatch(event.event.method, event);
}

export async function handleExtrinsic(
  extrinsic: SubstrateExtrinsic
): Promise<void> {
  const signer = extrinsic.extrinsic.signer.toString().toLowerCase();
  const argString = extrinsic.extrinsic.args.toString();
  const args = JSON.parse(argString);
  const entity = Identity.create({
    id: signer,
    display: args.display.raw,
    args: argString,
  });
  await entity.save();
}
