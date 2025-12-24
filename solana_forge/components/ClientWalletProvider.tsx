// FILE: components/ClientWalletProvider.tsx
import { useMemo, ReactNode, useState, useEffect, useCallback } from "react";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import rawIdl from "../idl/solana_forge.json";
import { SolanaForge } from "../idl/solana_forge";
import { ProgramContext } from "./solana-context";

const AnchorSetup = ({ children }: { children: ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;

  // UPDATED: Use Environment variable for RPC if available, fallback to default Devnet
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network),
    [network]
  );

  const {
    publicKey,
    sendTransaction,
    signTransaction,
    wallet: adapterWallet,
  } = useWallet();

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState<boolean | null>(
    null
  );

  // UPDATED: Added "confirmed" commitment to the connection for better reliability
  const provider = useMemo(() => {
    if (!publicKey || !adapterWallet) return null;
    
    const connection = new anchor.web3.Connection(endpoint, "confirmed");
    
    return new anchor.AnchorProvider(connection, adapterWallet.adapter as any, {
      preflightCommitment: "processed",
    });
  }, [endpoint, publicKey, adapterWallet]);

  const program = useMemo(() => {
    if (provider) {
      return new Program<SolanaForge>(rawIdl as any, provider);
    }
    return null;
  }, [provider]);

  // Check Account Logic (Kept from your original file)
  useEffect(() => {
    const checkAccount = async () => {
      if (!program || !publicKey) {
        setIsInitialized(null);
        return;
      }
      try {
        console.log("Checking user account on-chain...");
        const [userAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), publicKey.toBuffer()],
          program.programId
        );
        const userAccount = await program.account.userAccount.fetchNullable(
          userAccountPda
        );
        console.log("User Account Found:", !!userAccount);
        setIsInitialized(!!userAccount);
      } catch (error) {
        console.error("Error checking account:", error);
        setIsInitialized(false);
      }
    };
    checkAccount();
  }, [program, publicKey]);

  useEffect(() => {
    if (provider && provider.connection) {
      setIsNetworkCorrect(true);
    } else {
      setIsNetworkCorrect(null);
    }
  }, [provider]);

  // Initialize User Logic (Kept from your original file)
  const initializeUserAccount = useCallback(async () => {
    if (!program || !publicKey || !provider) {
      throw new Error("Wallet not connected or program not available.");
    }
    try {
      console.log("Initializing User...");

      const balance = await provider.connection.getBalance(publicKey);
      if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.log("Requesting Airdrop...");
        const signature = await provider.connection.requestAirdrop(
          publicKey,
          1 * LAMPORTS_PER_SOL
        );
        const { blockhash, lastValidBlockHeight } =
          await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
      }

      const [userAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      const instruction = await program.methods
        .initializeUser()
        .accountsPartial({
          userAccount: userAccountPda,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      let signature: string;

      console.log("Sending Transaction...");
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        signature = await provider.connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: true,
            maxRetries: 5,
          }
        );
      } else {
        signature = await sendTransaction(transaction, provider.connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      await provider.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      console.log("Initialization Success!");
      setIsInitialized(true);
    } catch (e: any) {
      console.error("Initialization Failed:", e);
      throw e;
    }
  }, [program, provider, publicKey, sendTransaction, signTransaction]);

  return (
    <ProgramContext.Provider
      value={{
        program,
        provider,
        isInitialized,
        isNetworkCorrect,
        initializeUserAccount,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

export default function ClientWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const network = WalletAdapterNetwork.Devnet;

  const wallets = useMemo(() => {
    let currentUri = "https://solana-forge.netlify.app";
    if (typeof window !== "undefined") {
      currentUri = window.location.origin;
    }

    return [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "SolanaForge",
          uri: currentUri,
          icon: "/icon.jpeg",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
        chain: "solana:devnet",
      }),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new WalletConnectWalletAdapter({
        network: network,
        options: {
          projectId:
            process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "YOUR_ID",
          metadata: {
            name: "SolanaForge",
            description: "Token Management DApp",
            url: currentUri,
            icons: ["/icon.jpeg"],
          },
        },
      }),
    ];
  }, [network]);

  const onError = useCallback((error: WalletError) => {
    console.error("WALLET ADAPTER ERROR:", error.name, error.message);
  }, []);

  return (
    <WalletProvider wallets={wallets} autoConnect onError={onError}>
      <WalletModalProvider>
        <AnchorSetup>{children}</AnchorSetup>
      </WalletModalProvider>
    </WalletProvider>
  );
}