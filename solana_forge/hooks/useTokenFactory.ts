// FILE: hooks/useTokenFactory.ts

import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { useHistory } from "@/components/history-provider";
import { Token } from "@/types/token";

export type TokenStandard = "token" | "token-2022";
export type AddressMethod = "random" | "custom";

const ensureProtocol = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

export const useTokenFactory = (onTokenCreated: (token: Token) => void) => {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

  // --- WIZARD STATE ---
  const [step, setStep] = useState(1);
  const [addressMethod, setAddressMethod] = useState<AddressMethod>("random");

  // --- TOKEN CONFIG STATE ---
  const [tokenStandard, setTokenStandard] =
    useState<TokenStandard>("token-2022");
  const [uploadedKeypair, setUploadedKeypair] = useState<Keypair | null>(null);
  const [keypairFileError, setKeypairFileError] = useState<string | null>(null);
  const { refreshHistory } = useHistory();

  // Form Data with UPDATED DEFAULTS
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: "9",
    initialSupply: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    transferFee: "0",
    interestRate: "0",
    nonTransferable: false,
    enablePermanentDelegate: false,
    defaultAccountStateFrozen: false,
    revokeUpdateAuthority: true,
    isMintable: false,
  });

  // Vanity Grinder State
  const [vanityPrefix, setVanityPrefix] = useState("");
  const [vanityResults, setVanityResults] = useState<Keypair[]>([]);
  const [selectedVanityKey, setSelectedVanityKey] = useState<string | null>(
    null
  );
  const [isGrinding, setIsGrinding] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, speed: 0 });
  const grindingRef = useRef(false);

  // Image State
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [tokenImagePreview, setTokenImagePreview] = useState<string | null>(
    null
  );

  // Transaction State
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);

  // --- HELPERS ---
  const handleKeypairUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeypairFileError(null);
    setUploadedKeypair(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed) || parsed.length !== 64) {
          setKeypairFileError(
            "Invalid JSON format. Must be a [64 byte] array."
          );
          return;
        }
        const kp = Keypair.fromSecretKey(new Uint8Array(parsed));
        const accountInfo = await connection.getAccountInfo(kp.publicKey);
        if (accountInfo) {
          setKeypairFileError(
            `Address ${kp.publicKey
              .toBase58()
              .slice(0, 6)}... is already active on chain.`
          );
          return;
        }
        setUploadedKeypair(kp);
        setSelectedVanityKey(null);
        setVanityResults([]);
      } catch (err) {
        setKeypairFileError("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const stopGrinding = () => {
    grindingRef.current = false;
    setIsGrinding(false);
  };

  const grindVanityAddress = (continueSearch = false) => {
    if (!vanityPrefix) return;
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(vanityPrefix)) {
      setErrors({ vanity: "Invalid characters. No 0, O, I, l." });
      return;
    }
    grindingRef.current = true;
    setIsGrinding(true);
    if (!continueSearch) {
      setVanityResults([]);
      setSelectedVanityKey(null);
      setStats({ scanned: 0, speed: 0 });
    }
    setErrors((prev) => ({ ...prev, vanity: "" }));
    let count = 0;
    let lastUpdate = Date.now();
    let startTime = Date.now();
    const findMatch = () => {
      if (!grindingRef.current) return;
      const burstStart = Date.now();
      while (Date.now() - burstStart < 20) {
        const kp = Keypair.generate();
        count++;
        if (kp.publicKey.toBase58().startsWith(vanityPrefix)) {
          setVanityResults((prev) => [...prev, kp]);
        }
      }
      if (Date.now() - lastUpdate > 500) {
        const elapsed = (Date.now() - startTime) / 1000;
        setStats({ scanned: count, speed: Math.round(count / elapsed) });
        lastUpdate = Date.now();
      }
      if (count > 500000) {
        stopGrinding();
        return;
      }
      requestAnimationFrame(findMatch);
    };
    findMatch();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTokenImage(file);
      setTokenImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, tokenImage: "" }));
    }
  };

  const uploadToIpfs = async (
    file: File | Blob,
    isJson = false
  ): Promise<string> => {
    const data = new FormData();
    data.append("file", file, isJson ? "metadata.json" : undefined);
    const res = await fetch("/api/upload", { method: "POST", body: data });

    const responseData = await res.json();

    if (!res.ok) {
      console.error("Upload API Error:", responseData.error);
      throw new Error(responseData.error || "Upload failed due to a server error.");
    }
    
    return responseData.url;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Name required.";
    if (!formData.symbol.trim()) errs.symbol = "Symbol required.";
    if (!tokenImage) errs.tokenImage = "Image required.";
    if (Number(formData.decimals) < 0 || Number(formData.decimals) > 18)
      errs.decimals = "Invalid decimals.";
    if (Number(formData.initialSupply) <= 0)
      errs.initialSupply = "Invalid supply.";

    // URL Validations
    if (
      formData.twitter &&
      !/^(https?:\/\/)?(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]{1,15}\/?$/.test(
        formData.twitter
      )
    ) {
      errs.twitter = "Invalid Twitter URL";
    }
    if (
      formData.telegram &&
      !/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}\/?$/.test(
        formData.telegram
      )
    ) {
      errs.telegram = "Invalid Telegram URL";
    }
    if (
      formData.website &&
      !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(
        formData.website
      )
    ) {
      errs.website = "Invalid Website URL";
    }

    if (addressMethod === "custom" && !uploadedKeypair && !selectedVanityKey) {
      errs.address = "You selected Custom Address but haven't provided one.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- CORE: CREATE TOKEN ---
  const createToken = async () => {
    if (!validate() || !publicKey || !program) return;

    setIsCreating(true);
    setSignature(null);
    setErrors({});

    try {
      // 1. UPLOAD METADATA
      setStatusMessage("Uploading Metadata...");
      const imgUrl = await uploadToIpfs(tokenImage!);
      const cleanWebsite = ensureProtocol(formData.website);
      const cleanTwitter = ensureProtocol(formData.twitter);
      const cleanTelegram = ensureProtocol(formData.telegram);

      const metadataPayload = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image: imgUrl,
        external_url: cleanWebsite,
        attributes: [] as any[],
      };

      if (cleanTwitter)
        metadataPayload.attributes.push({
          trait_type: "Twitter",
          value: cleanTwitter,
        });
      if (cleanTelegram)
        metadataPayload.attributes.push({
          trait_type: "Telegram",
          value: cleanTelegram,
        });

      const metaUrl = await uploadToIpfs(
        new Blob([JSON.stringify(metadataPayload)], {
          type: "application/json",
        }),
        true
      );

      // 2. PREPARE KEYS
      setStatusMessage("Building Transaction...");
      let mintKeypair: Keypair;
      if (addressMethod === "custom") {
        if (uploadedKeypair) {
          mintKeypair = uploadedKeypair;
        } else if (selectedVanityKey) {
          const found = vanityResults.find(
            (k) => k.publicKey.toBase58() === selectedVanityKey
          );
          mintKeypair = found || Keypair.generate();
        } else {
          mintKeypair = Keypair.generate();
        }
      } else {
        mintKeypair = Keypair.generate();
      }

      const decimals = Number(formData.decimals);
      // NOTE: Supply must be raw amount (with decimals calculated)
      const supplyBN = new anchor.BN(formData.initialSupply).mul(
        new anchor.BN(10).pow(new anchor.BN(decimals))
      );

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      let txSignature: string;
      let instruction: TransactionMessage["instructions"][0];

      // =========================================================================
      // PATH A: TOKEN-2022 (Via Smart Contract)
      // =========================================================================
      if (tokenStandard === "token-2022") {
        const tokenAccount = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          publicKey,
          false,
          TOKEN_2022_PROGRAM_ID
        );

        // Prepare Arguments for createToken2022 instruction
        const args = {
          name: formData.name,
          symbol: formData.symbol,
          uri: metaUrl,
          decimals: decimals,
          initialSupply: supplyBN,
          transferFeeBasisPoints: Number(formData.transferFee) * 100, // % to BP
          interestRate: Number(formData.interestRate),
          isNonTransferable: formData.nonTransferable,
          enablePermanentDelegate: formData.enablePermanentDelegate,
          defaultAccountStateFrozen: formData.defaultAccountStateFrozen,
          revokeUpdateAuthority: formData.revokeUpdateAuthority,
          revokeMintAuthority: !formData.isMintable,
        };

        // Call Smart Contract
        instruction = await program.methods
          .createToken2022(args)
          .accountsPartial({
            userAccount: userPda,
            authority: publicKey,
            mint: mintKeypair.publicKey, // Signer
            tokenAccount: tokenAccount,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction();
      }
      // =========================================================================
      // PATH B: STANDARD TOKEN (Legacy Via Smart Contract)
      // =========================================================================
      else {
        const metaProgId = new PublicKey(
          MPL_TOKEN_METADATA_PROGRAM_ID.toString()
        );

        const [metaPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            metaProgId.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
          ],
          metaProgId
        );

        const tokenAccount = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          publicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        const args = {
          name: formData.name,
          symbol: formData.symbol,
          uri: metaUrl,
          decimals: decimals,
          initialSupply: supplyBN,
          revokeUpdateAuthority: formData.revokeUpdateAuthority,
          revokeMintAuthority: !formData.isMintable,
        };

        instruction = await program.methods
          .createStandardToken(args)
          .accountsPartial({
            userAccount: userPda,
            authority: publicKey,
            mint: mintKeypair.publicKey,
            tokenAccount: tokenAccount,
            metadata: metaPda,
            tokenMetadataProgram: metaProgId,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          })
          .instruction();
      }

      // 3. BUILD AND SEND TRANSACTION
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([mintKeypair]);

      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: true,
            maxRetries: 5,
          }
        );
      } else {
        txSignature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      // 4. CONFIRM
      await connection.confirmTransaction(
        { signature: txSignature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setSignature(txSignature);
      setStatusMessage("Success!");

      // 5. UPDATE LOCAL HISTORY & STATE
      refreshHistory(true); // Triggers fetching events from chain

      onTokenCreated({
        id: mintKeypair.publicKey.toBase58(),
        mintAddress: mintKeypair.publicKey.toBase58(),
        name: formData.name,
        symbol: formData.symbol,
        decimals,
        supply: Number(formData.initialSupply),
        balance: Number(formData.initialSupply),
        createdAt: new Date().toISOString(),
        status: "active",
        image: imgUrl,
        isMintable: formData.isMintable,
        programId:
          tokenStandard === "token-2022"
            ? TOKEN_2022_PROGRAM_ID.toBase58()
            : TOKEN_PROGRAM_ID.toBase58(),
        authority: formData.isMintable ? publicKey.toBase58() : "Revoked",
        description: formData.description,
        website: cleanWebsite,
        twitter: cleanTwitter,
        telegram: cleanTelegram,
      });
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Transaction failed";

      // Detailed error parsing
      if (e instanceof anchor.web3.SendTransactionError) {
        if (e.logs) {
          console.log("Tx Logs:", e.logs);
          msg = "Transaction failed. Check console for details.";
        }
      }
      if (msg.includes("User rejected")) msg = "Request rejected by wallet";
      setErrors({ form: msg });
    } finally {
      setIsCreating(false);
      setUploadedKeypair(null);
    }
  };

  return {
    step,
    setStep,
    addressMethod,
    setAddressMethod,
    formData,
    handleInputChange,
    tokenStandard,
    setTokenStandard,
    handleKeypairUpload,
    uploadedKeypair,
    keypairFileError,
    setUploadedKeypair,
    vanityPrefix,
    setVanityPrefix,
    vanityResults,
    isGrinding,
    grindVanityAddress,
    stopGrinding,
    stats,
    selectedVanityKey,
    setSelectedVanityKey,
    tokenImage,
    tokenImagePreview,
    handleImageSelect,
    isCreating,
    statusMessage,
    errors,
    setErrors,
    signature,
    createToken,
  };
};
