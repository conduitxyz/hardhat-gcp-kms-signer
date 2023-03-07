import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface HttpNetworkUserConfig {
    gcpKmsKeyName?: string;
    minMaxFeePerGas?: string | number;
    minMaxPriorityFeePerGas?: string | number;
  }

  export interface HardhatNetworkUserConfig {
    gcpKmsKeyName?: string;
    minMaxFeePerGas?: string | number;
    minMaxPriorityFeePerGas?: string | number;
  }
  export interface HttpNetworkConfig {
    gcpKmsKeyName?: string;
    minMaxFeePerGas?: string | number;
    minMaxPriorityFeePerGas?: string | number;
  }
  export interface HardhatNetworkConfig {
    gcpKmsKeyName?: string;
    minMaxFeePerGas?: string | number;
    minMaxPriorityFeePerGas?: string | number;
  }
}
