import { GcpKmsSigner, GcpKmsSignerCredentials} from "ethers-gcp-kms-signer";

import { BigNumber, utils } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import { rpcTransactionRequest } from "hardhat/internal/core/jsonrpc/types/input/transactionRequest";
import { validateParams } from "hardhat/internal/core/jsonrpc/types/input/validation";
import { ProviderWrapperWithChainId } from "hardhat/internal/core/providers/chainId";
import { EIP1193Provider, RequestArguments } from "hardhat/types";

import { toHexString } from "./utils";
import { assert } from "console";

export class KMSSigner extends ProviderWrapperWithChainId {
  public kmsSigner: GcpKmsSigner;
  public kmsCredentials: GcpKmsSignerCredentials;
  

  constructor(provider: EIP1193Provider, kmsKeyId: string) {
    super(provider);
    this.kmsCredentials = parseKmsKey(kmsKeyId);
    this.kmsSigner = new GcpKmsSigner(this.kmsCredentials);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const method = args.method;
    const params = this._getParams(args);
    const sender = await this._getSender();
    if (method === "eth_sendTransaction") {
      const [txRequest] = validateParams(params, rpcTransactionRequest);
      const tx = await utils.resolveProperties(txRequest);
      const nonce = tx.nonce ?? (await this._getNonce(sender));
      const baseTx: utils.UnsignedTransaction = {
        chainId: (await this._getChainId()) || undefined,
        data: tx.data,
        gasLimit: tx.gas?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        nonce: Number(nonce),
        type: 2,
        to: toHexString(tx.to),
        value: tx.value?.toString(),
        maxFeePerGas: tx.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      };

      if (
        baseTx.maxFeePerGas === undefined &&
        baseTx.maxPriorityFeePerGas === undefined
      ) {
        baseTx.type = 0;
        delete baseTx.maxFeePerGas;
        delete baseTx.maxPriorityFeePerGas;
      }

      console.log("TX", baseTx);

      const unsignedTx = utils.serializeTransaction(baseTx);
      const hash = keccak256(utils.arrayify(unsignedTx));
      const sig = await this.kmsSigner.signMessage(hash);

      const rawTx = utils.serializeTransaction(baseTx, sig);

      return this._wrappedProvider.request({
        method: "eth_sendRawTransaction",
        params: [rawTx],
      });
    } else if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      return [sender];
    }

    return this._wrappedProvider.request(args);
  }

  private async _getSender(): Promise<string> {
    return this.kmsSigner.getAddress();
  }

  private async _getNonce(address: string): Promise<number> {
    const response = await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [address, "pending"],
    });

    return BigNumber.from(response).toNumber();
  }
}

function parseKmsKey(kmsKeyId: string): GcpKmsSignerCredentials {  
  let parts = kmsKeyId.split("/");
  assert(kmsKeyId, "kmsKeyId is missing.")
  assert(parts.length === 10, `Incorrect gcp kms key format: ${ kmsKeyId }. ` + 
    `Expected: projects/<projectId>/locations/<locationId>/keyRings/<keyRingId>/cryptoKeys/<keyId>/cryptoKeyVersions/<keyVersion>`);
  return {
    projectId: parts[1], // your project id in gcp
    locationId: parts[3], // the location where your key ring was created
    keyRingId: parts[5], // the id of the key ring
    keyId: parts[7], // the name/id of your key in the key ring
    keyVersion: parts[9], // the version of the key
  };
}

