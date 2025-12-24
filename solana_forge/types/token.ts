// FILE: types/token.ts

export interface TokenExtensions {
  nonTransferable?: boolean;
  transferFee?: string; 
  permanentDelegate?: string; 
  transferHook?: string; 
  interestRate?: number;
  isFrozen?: boolean;
}

export interface Token {
  id: string; 
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number; 
  balance: number; 
  image?: string; 
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  isMintable: boolean; 
  programId: string; 
  authority?: string; 
  status: "active" | "inactive";
  createdAt?: string; 
  extensions?: TokenExtensions;
}
