// FILE: components/token-action-modal.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Send,
  Plus,
  History,
  UserCheck,
  Ban,
  Lock,
  Edit,
  UploadCloud,
  AlertCircle,
  Info,
} from "lucide-react";
import { Token } from "@/types/token";
import { useTokenActions } from "@/hooks/useTokenActions";
import { PublicKey } from "@solana/web3.js";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  action: "transfer" | "mint" | "update" | null;
  onSuccess: () => void;
}

export function TokenActionModal({
  isOpen,
  onClose,
  token,
  action,
  onSuccess,
}: TokenActionModalProps) {
  const { transferToken, mintMoreToken, updateTokenMetadata, isProcessing } =
    useTokenActions();

  // --- STATE ---
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Transfer/Mint
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);

  // Metadata Update
  const [metaName, setMetaName] = useState("");
  const [metaSymbol, setMetaSymbol] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Socials
  const [metaWebsite, setMetaWebsite] = useState("");
  const [metaTwitter, setMetaTwitter] = useState("");
  const [metaTelegram, setMetaTelegram] = useState("");
  const [socialErrors, setSocialErrors] = useState({
    website: "",
    twitter: "",
    telegram: "",
  });

  // Image
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNonTransferable = token?.extensions?.nonTransferable || false;

  useEffect(() => {
    const saved = localStorage.getItem("solana_forge_contacts");
    if (saved) setSavedAddresses(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isOpen && token) {
      setMsg(null);
      setAmount("");
      setRecipient("");
      setIsInsufficientBalance(false);
      setIsAddressValid(true);
      setImageError(null);
      setSocialErrors({ website: "", twitter: "", telegram: "" });

      if (action === "update") {
        setMetaName(token.name);
        setMetaSymbol(token.symbol);
        setMetaDescription(token.description || "");
        setMetaWebsite(token.website || "");
        setMetaTwitter(token.twitter || "");
        setMetaTelegram(token.telegram || "");
        setImagePreview(token.image || null);
        setNewImageFile(null);
      }
    }
  }, [isOpen, token, action]);

  // --- VALIDATION LOGIC ---

  const validateAddress = (addr: string) => {
    setRecipient(addr);
    if (!addr) {
      setIsAddressValid(true);
      return;
    }
    try {
      const pubKey = new PublicKey(addr);
      setIsAddressValid(PublicKey.isOnCurve(pubKey));
    } catch (e) {
      setIsAddressValid(false);
    }
  };

  const validateAmount = (val: string) => {
    setAmount(val);
    if (!token) return;

    if (action === "transfer") {
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > token.balance) {
        setIsInsufficientBalance(true);
      } else {
        setIsInsufficientBalance(false);
      }
    } else {
      setIsInsufficientBalance(false);
    }
  };

  const handleNameValidation = (val: string) => {
    const encoder = new TextEncoder();
    if (encoder.encode(val).length > 32) return;
    setMetaName(val);
  };

  const handleSymbolValidation = (val: string) => {
    const clean = val.toUpperCase();
    if (!/^[A-Z0-9\-_.]*$/.test(clean)) return; // Added . as per screenshot example, typically strict is -_

    const encoder = new TextEncoder();
    if (encoder.encode(clean).length > 10) return;

    setMetaSymbol(clean);
  };

  const handleSocialValidation = (
    field: "website" | "twitter" | "telegram",
    value: string
  ) => {
    let error = "";
    if (value) {
      if (field === "website") {
        const urlPattern =
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(value)) error = "Invalid URL format";
        setMetaWebsite(value);
      } else if (field === "twitter") {
        if (!value.includes("twitter.com") && !value.includes("x.com"))
          error = "Must contain twitter.com or x.com";
        setMetaTwitter(value);
      } else if (field === "telegram") {
        if (!value.includes("t.me")) error = "Must contain t.me";
        setMetaTelegram(value);
      }
    } else {
      // Clear value if empty
      if (field === "website") setMetaWebsite("");
      if (field === "twitter") setMetaTwitter("");
      if (field === "telegram") setMetaTelegram("");
    }
    setSocialErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAndSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) return;

    const validTypes = ["image/png", "image/webp", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      setImageError("Format not supported. Use PNG (best), WEBP, or JPEG.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 500 * 1024) {
      setImageError("File too large. Max safe size is 500KB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const img = new globalThis.Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      // FIX: Do not revoke objectURL here if successful, otherwise preview fails

      if (img.width !== img.height) {
        setImageError(
          `Image must be square (1:1). Detected: ${img.width}x${img.height}.`
        );
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (img.width < 128 || img.width > 1024) {
        setImageError("Resolution out of range. Min: 128x128, Max: 1024x1024.");
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setNewImageFile(file);
      setImagePreview(objectUrl);
    };
  };

  const handleSubmit = async () => {
    if (!token || !action) return;
    setMsg(null);

    try {
      if (action === "transfer") {
        if (isNonTransferable) return;
        if (!recipient || !isAddressValid) {
          setMsg({ type: "error", text: "Invalid Recipient Address" });
          return;
        }
        if (isInsufficientBalance || !amount) return;

        await transferToken(
          token.mintAddress,
          recipient,
          parseFloat(amount),
          token.decimals,
          token.programId
        );

        if (!savedAddresses.includes(recipient)) {
          const newCtx = [recipient, ...savedAddresses].slice(0, 5);
          setSavedAddresses(newCtx);
          localStorage.setItem("solana_forge_contacts", JSON.stringify(newCtx));
        }
        setMsg({ type: "success", text: "Transfer Successful!" });
      } else if (action === "mint") {
        if (!amount) return;
        await mintMoreToken(
          token.mintAddress,
          parseFloat(amount),
          token.decimals,
          token.programId
        );
        setMsg({ type: "success", text: "Supply Updated!" });
      } else if (action === "update") {
        // Block update if social errors exist
        if (
          socialErrors.website ||
          socialErrors.twitter ||
          socialErrors.telegram
        ) {
          setMsg({ type: "error", text: "Please fix social link errors." });
          return;
        }

        await updateTokenMetadata(
          token.mintAddress,
          {
            name: metaName,
            symbol: metaSymbol,
            description: metaDescription,
            image: token.image || "",
            website: metaWebsite,
            twitter: metaTwitter,
            telegram: metaTelegram,
          },
          newImageFile
        );
        setMsg({ type: "success", text: "Metadata Updated Successfully!" });
      }

      onSuccess();
      setTimeout(onClose, 2000);
    } catch (e: any) {
      let errorMessage = "Transaction Failed";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "string") {
        errorMessage = e;
      }

      if (e?.logs && Array.isArray(e.logs)) {
        const programError = e.logs.find((log: string) =>
          log.includes("Error:")
        );
        if (programError) errorMessage += ` (${programError})`;
      }

      setMsg({ type: "error", text: errorMessage });
    }
  };

  if (!token) return null;
  const isUpdate = action === "update";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isUpdate ? "sm:max-w-xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "transfer" && <Send className="h-5 w-5" />}
            {action === "mint" && <Plus className="h-5 w-5" />}
            {action === "update" && <Edit className="h-5 w-5" />}
            {action === "transfer" && "Transfer Assets"}
            {action === "mint" && "Mint Supply"}
            {action === "update" && "Update Metadata"}
          </DialogTitle>
          <DialogDescription>
            {action === "transfer" &&
              `Sending ${token.symbol} to another wallet.`}
            {action === "mint" &&
              `Increase the total supply of ${token.symbol}.`}
            {action === "update" &&
              `Edit details for ${token.symbol}. Only Name, Symbol, and Image can be changed.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {action === "transfer" && isNonTransferable && (
            <Alert
              variant="destructive"
              className="bg-destructive/10 text-destructive border-destructive/20"
            >
              <Lock className="h-4 w-4" />
              <AlertDescription className="font-semibold">
                This token is Soulbound (Non-Transferable).
              </AlertDescription>
            </Alert>
          )}

          {!isUpdate && (
            <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-background border">
                  {token.image ? (
                    <Image src={token.image} layout="fill" alt="icon" />
                  ) : (
                    <div className="bg-muted h-full w-full" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm">{token.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {token.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-mono font-medium">
                  {token.balance.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {isUpdate && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <div className="flex justify-center items-center gap-2 mb-1">
                  <Label>Token Icon</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] text-xs">
                        <p className="font-bold">Requirements:</p>
                        <p>• Square (1:1) required</p>
                        <p>• PNG or WEBP recommended</p>
                        <p>• Size &lt; 500KB</p>
                        <p>• 128x128 to 1024x1024 px</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative h-24 w-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden group transition-all ${
                      imageError
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-muted-foreground/30 hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={validateAndSelectImage}
                      accept="image/png, image/webp, image/jpeg"
                      className="hidden"
                    />
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:opacity-50 transition-opacity"
                        unoptimized={true} // Add unoptimized if external URLs are used or blob issues persist
                      />
                    ) : (
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 font-xs font-bold text-white bg-black/40">
                      Edit
                    </div>
                  </div>
                  {imageError && (
                    <p className="text-[10px] text-destructive mt-1 flex items-center gap-1 text-center max-w-[200px]">
                      <AlertCircle className="h-3 w-3 inline" /> {imageError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={metaName}
                    onChange={(e) => handleNameValidation(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Max 32 bytes (Emojis ok)
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Symbol</Label>
                  <Input
                    value={metaSymbol}
                    onChange={(e) => handleSymbolValidation(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Uppercase A-Z, 0-9
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="h-20 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Socials</Label>
                <div className="space-y-1">
                  <Input
                    placeholder="Website (https://...)"
                    value={metaWebsite}
                    onChange={(e) =>
                      handleSocialValidation("website", e.target.value)
                    }
                    className={`text-xs ${
                      socialErrors.website
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  {socialErrors.website && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {socialErrors.website}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Twitter (x.com/user)"
                    value={metaTwitter}
                    onChange={(e) =>
                      handleSocialValidation("twitter", e.target.value)
                    }
                    className={`text-xs ${
                      socialErrors.twitter
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  {socialErrors.twitter && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {socialErrors.twitter}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Telegram (t.me/user)"
                    value={metaTelegram}
                    onChange={(e) =>
                      handleSocialValidation("telegram", e.target.value)
                    }
                    className={`text-xs ${
                      socialErrors.telegram
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  {socialErrors.telegram && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{" "}
                      {socialErrors.telegram}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {action === "transfer" && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Recipient Address</Label>
                  {savedAddresses.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                        >
                          <History className="h-3 w-3" /> Recent
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {savedAddresses.map((addr) => (
                          <DropdownMenuItem
                            key={addr}
                            onClick={() => validateAddress(addr)}
                          >
                            <UserCheck className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="font-mono text-xs">
                              {addr.slice(0, 4)}...{addr.slice(-4)}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Paste Solana address..."
                    value={recipient}
                    onChange={(e) => validateAddress(e.target.value)}
                    disabled={isNonTransferable}
                    className={`font-mono text-xs ${
                      !isAddressValid && recipient ? "border-red-500" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Amount</Label>
                  <span
                    className="text-xs text-primary cursor-pointer hover:underline"
                    onClick={() => validateAmount(token.balance.toString())}
                  >
                    Max: {token.balance}
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => validateAmount(e.target.value)}
                  disabled={isNonTransferable}
                  className={isInsufficientBalance ? "border-red-500" : ""}
                />
                {isInsufficientBalance && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Ban className="h-3 w-3" /> Insufficient Balance
                  </p>
                )}
              </div>
            </>
          )}

          {action === "mint" && (
            <div className="space-y-2">
              <Label>Amount to Mint</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}

          {msg && (
            <Alert
              variant={msg.type === "error" ? "destructive" : "default"}
              className={
                msg.type === "success"
                  ? "bg-green-500/10 text-green-600 border-green-200"
                  : ""
              }
            >
              <AlertDescription>{msg.text}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full btn-fintech"
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              !!imageError ||
              (action === "update" &&
                (!!socialErrors.website ||
                  !!socialErrors.twitter ||
                  !!socialErrors.telegram)) ||
              (action === "transfer" &&
                (isNonTransferable ||
                  !isAddressValid ||
                  isInsufficientBalance ||
                  !amount)) ||
              (action === "mint" && !amount) ||
              (action === "update" && !metaName)
            }
          >
            {isProcessing ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : action === "transfer" ? (
              <Send className="mr-2 h-4 w-4" />
            ) : action === "mint" ? (
              <Plus className="mr-2 h-4 w-4" />
            ) : (
              <Edit className="mr-2 h-4 w-4" />
            )}
            {action === "transfer"
              ? "Transfer"
              : action === "mint"
              ? "Mint"
              : "Update Metadata"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
