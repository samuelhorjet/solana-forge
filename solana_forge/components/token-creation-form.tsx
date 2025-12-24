// FILE: components/token-creation-form.tsx

"use client";

import React, { useRef, useState } from "react";
import { useTokenFactory } from "@/hooks/useTokenFactory";
import { Token } from "@/types/token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Keypair } from "@solana/web3.js";
import {
  Coins,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  UploadCloud,
  X,
  Sparkles,
  ChevronDown,
  Check,
  Zap,
  LockOpen,
  Lock,
  Rocket,
  FileJson,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Snowflake,
  Anchor,
  Eye,
  Percent,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenCreationFormProps {
  onTokenCreated: (token: Token) => void;
  onCancel: () => void;
}

export function TokenCreationForm({
  onTokenCreated,
  onCancel,
}: TokenCreationFormProps) {
  const { connection } = useConnection();
  const {
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
    tokenImagePreview,
    handleImageSelect,
    isCreating,
    statusMessage,
    errors,
    setErrors,
    signature,
    createToken,
  } = useTokenFactory(onTokenCreated);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [showExtensions, setShowExtensions] = useState(true);

  // Local state for image validation errors specifically
  const [imageError, setImageError] = useState<string | null>(null);

  // Manual Input State
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isCheckingManual, setIsCheckingManual] = useState(false);

  const canProceedToStep2 = () => {
    if (addressMethod === "random") return true;
    if (addressMethod === "custom") {
      return uploadedKeypair !== null || selectedVanityKey !== null;
    }
    return false;
  };

  const handleManualKeyInput = async (value: string) => {
    setManualInput(value);
    setManualError(null);
    setUploadedKeypair(null);

    if (!value.trim()) return;

    try {
      let parsed: number[];
      try {
        parsed = JSON.parse(value);
      } catch (e) {
        throw new Error(
          "Invalid format. Please paste a valid JSON array (e.g. [123, 45, ...])"
        );
      }

      if (!Array.isArray(parsed)) throw new Error("Input is not an array.");
      if (parsed.length !== 64) {
        throw new Error(
          `Invalid length (${parsed.length}). Private keys must be 64 numbers.`
        );
      }

      const array = Uint8Array.from(parsed);
      const kp = Keypair.fromSecretKey(array);

      setIsCheckingManual(true);
      try {
        const accountInfo = await connection.getAccountInfo(kp.publicKey);
        if (accountInfo !== null) {
          setManualError(
            "This address is already in use on-chain. Please use a fresh keypair."
          );
        } else {
          setUploadedKeypair(kp);
        }
      } catch (err) {
        setManualError("Failed to verify address availability. Network error.");
      } finally {
        setIsCheckingManual(false);
      }
    } catch (err: any) {
      setManualError(err.message);
      setIsCheckingManual(false);
    }
  };

  // Strict Name Validation (Max 32 Bytes)
  const handleNameValidation = (val: string) => {
    const encoder = new TextEncoder();
    if (encoder.encode(val).length > 32) return;
    handleInputChange("name", val);
  };

  // Strict Symbol Validation (Uppercase, A-Z, 0-9, -, _, Max 10 Bytes)
  const handleSymbolValidation = (val: string) => {
    const clean = val.toUpperCase();
    // Regex: Only A-Z, 0-9, - and _ allowed
    if (!/^[A-Z0-9\-_]*$/.test(clean)) return;

    const encoder = new TextEncoder();
    if (encoder.encode(clean).length > 10) return;

    handleInputChange("symbol", clean);
  };

  // Strict Image Validation
  const validateAndSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) return;

    // 1. Format Check
    const validTypes = ["image/png", "image/webp", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      setImageError("Format not supported. Use PNG (best), WEBP, or JPEG.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. File Size Check (< 500KB strict, < 200KB recommended)
    if (file.size > 500 * 1024) {
      setImageError("File too large. Max safe size is 500KB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Dimensions & Aspect Ratio Check
    const img = new globalThis.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Aspect Ratio: Must be Square
      if (img.width !== img.height) {
        setImageError(
          `Image must be square (1:1). Detected: ${img.width}x${img.height}.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Min/Max Dimensions
      if (img.width < 128 || img.width > 1024) {
        setImageError("Resolution out of range. Min: 128x128, Max: 1024x1024.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Pass to standard handler if valid
      handleImageSelect(e);
    };
  };

  return (
    <Card className="card-fintech w-full max-w-3xl mx-auto border-border/60 shadow-xl pb-6">
      <CardHeader className="pb-6 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
            {step === 1 ? (
              <Rocket className="h-6 w-6" />
            ) : (
              <Coins className="h-6 w-6" />
            )}
          </div>
          <div>
            <CardTitle className="font-serif text-2xl">
              {step === 1 ? "Token Configuration" : "Token Metadata"}
            </CardTitle>
            <CardDescription>
              Step {step} of 2 •{" "}
              {step === 1
                ? "Choose your token standard"
                : "Fill in asset details"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createToken();
          }}
          className="space-y-6"
        >
          {/* ======================= STEP 1: CONFIGURATION ======================= */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* 1. Token Standard Selection */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  1. Choose Program
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setTokenStandard("token")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      tokenStandard === "token"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Standard (Legacy)</span>
                      {tokenStandard === "token" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Best for broad compatibility. No extensions supported.
                    </p>
                  </div>

                  <div
                    onClick={() => setTokenStandard("token-2022")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      tokenStandard === "token-2022"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Token-2022</span>
                      {tokenStandard === "token-2022" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports Taxes, Interest, Non-Transferable & more.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Address Generation Method */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">2. Mint Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setAddressMethod("random");
                      setUploadedKeypair(null);
                      setManualInput("");
                      setManualError(null);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      addressMethod === "random"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" /> Random
                        (Fast)
                      </span>
                      {addressMethod === "random" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Instantly generate a random address. Easiest option.
                    </p>
                  </div>

                  <div
                    onClick={() => setAddressMethod("custom")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      addressMethod === "custom"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" /> Custom
                        Address
                      </span>
                      {addressMethod === "custom" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload keypair file, paste private key, or grind vanity.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Custom Address Logic */}
              <AnimatePresence>
                {addressMethod === "custom" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden border-t pt-4"
                  >
                    <Tabs defaultValue="paste" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-4 h-auto p-1">
                        <TabsTrigger
                          value="paste"
                          className="text-xs sm:text-sm"
                        >
                          Paste Key
                        </TabsTrigger>
                        <TabsTrigger
                          value="upload"
                          className="text-xs sm:text-sm"
                        >
                          Upload File
                        </TabsTrigger>
                        <TabsTrigger
                          value="grind"
                          className="text-xs sm:text-sm"
                        >
                          Vanity Gen
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="paste" className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            Paste Private Key JSON Array
                          </Label>
                          <div className="relative">
                            <Textarea
                              placeholder="Example: [173, 21, 99, 44, ...]"
                              className={`font-mono text-xs bg-muted/30 pr-10 ${
                                manualError
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                              rows={4}
                              value={manualInput}
                              onChange={(e) =>
                                handleManualKeyInput(e.target.value)
                              }
                            />
                            {isCheckingManual && (
                              <div className="absolute top-2 right-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                          </div>

                          {manualError ? (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {manualError}
                            </p>
                          ) : uploadedKeypair && manualInput ? (
                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold text-green-700">
                                  Valid & Unused
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground break-all font-mono bg-background/50 p-2 rounded">
                                {uploadedKeypair.publicKey.toBase58()}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Paste the raw JSON array. We verify format and
                              check on-chain availability.
                            </p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="upload" className="space-y-4">
                        <div className="p-4 border border-dashed rounded-xl bg-muted/20 text-center">
                          <input
                            type="file"
                            accept=".json"
                            ref={jsonInputRef}
                            onChange={handleKeypairUpload}
                            className="hidden"
                          />
                          {!uploadedKeypair || manualInput ? (
                            <div className="flex flex-col items-center gap-2">
                              <FileJson className="h-10 w-10 text-muted-foreground" />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setManualInput("");
                                  setManualError(null);
                                  jsonInputRef.current?.click();
                                }}
                              >
                                Select .JSON File
                              </Button>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                Upload a Solana Keypair JSON file. Processed
                                locally.
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle className="h-10 w-10 text-green-500" />
                              <div className="text-sm font-mono bg-background p-2 rounded border">
                                {uploadedKeypair.publicKey.toBase58()}
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setUploadedKeypair(null);
                                  if (jsonInputRef.current)
                                    jsonInputRef.current.value = "";
                                }}
                              >
                                Remove File
                              </Button>
                            </div>
                          )}
                          {keypairFileError && (
                            <p className="text-xs text-destructive mt-2">
                              {keypairFileError}
                            </p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="grind" className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Prefix (e.g. ABC)"
                            className="font-mono uppercase"
                            value={vanityPrefix}
                            onChange={(e) => setVanityPrefix(e.target.value)}
                            maxLength={5}
                            disabled={isGrinding}
                          />
                          <Button
                            type="button"
                            onClick={() =>
                              isGrinding
                                ? stopGrinding()
                                : grindVanityAddress(false)
                            }
                          >
                            {isGrinding ? <X className="h-4 w-4" /> : "Start"}
                          </Button>
                        </div>

                        {isGrinding && (
                          <p className="text-xs animate-pulse text-primary font-mono text-center">
                            Scanning: {stats.speed}/s
                          </p>
                        )}

                        {vanityResults.length > 0 && (
                          <ScrollArea className="h-32 rounded border bg-background/50 p-2">
                            {vanityResults.map((kp, idx) => {
                              const addr = kp.publicKey.toBase58();
                              const sel = selectedVanityKey === addr;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedVanityKey(addr)}
                                  className={`flex justify-between items-center p-2 rounded text-xs font-mono cursor-pointer ${
                                    sel
                                      ? "bg-primary/10 border-primary border"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  <span>
                                    <span className="text-primary font-bold">
                                      {vanityPrefix}
                                    </span>
                                    {addr.slice(vanityPrefix.length, 16)}...
                                  </span>
                                  {sel && (
                                    <Check className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                              );
                            })}
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ======================= STEP 2: METADATA ======================= */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* 1. Image Upload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Token Icon *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                          <Info className="h-3 w-3" /> Requirements
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] text-xs">
                        <p className="font-bold">Recommendation:</p>
                        <p>• Size: 256x256 px (Square)</p>
                        <p>• Format: PNG or WEBP</p>
                        <p>• File Size: &lt; 200 KB</p>
                        <div className="mt-1 pt-1 border-t">
                          <p className="text-red-400">Strict Limits:</p>
                          <p>• Must be Square (1:1)</p>
                          <p>• Min 128px, Max 1024px</p>
                          <p>• Max 500KB</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                  <div
                    onClick={() => !isCreating && fileInputRef.current?.click()}
                    className={`relative h-32 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                      imageError
                        ? "border-destructive/50 bg-destructive/5"
                        : !isCreating
                        ? "cursor-pointer hover:bg-muted/50 border-border hover:border-primary/50"
                        : "opacity-50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={validateAndSelectImage}
                      accept="image/png, image/webp, image/jpeg"
                      className="hidden"
                      disabled={isCreating}
                    />
                    {tokenImagePreview ? (
                      <Image
                        src={tokenImagePreview}
                        alt="Preview"
                        layout="fill"
                        objectFit="contain"
                        className="p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                        <UploadCloud className="h-8 w-8" />
                        <div>
                          <p className="text-sm font-semibold">Upload Image</p>
                          <p className="text-[10px] opacity-70 mt-1">
                            PNG/WEBP • 256x256 • &lt;200KB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {imageError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {imageError}
                  </p>
                )}
              </div>

              {/* 2. Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. SolanaForge"
                    value={formData.name}
                    onChange={(e) => handleNameValidation(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    Max 32 bytes (Emojis = 4 bytes)
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Symbol *</Label>
                  <Input
                    placeholder="e.g. FORGE"
                    value={formData.symbol}
                    onChange={(e) => handleSymbolValidation(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    Uppercase A-Z, 0-9. Max 10 chars.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Decimals *</Label>
                  <Input
                    type="number"
                    placeholder="9"
                    value={formData.decimals}
                    onChange={(e) =>
                      handleInputChange("decimals", e.target.value)
                    }
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Supply *</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={formData.initialSupply}
                    onChange={(e) =>
                      handleInputChange("initialSupply", e.target.value)
                    }
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* 3. Description & Socials */}
              <div className="space-y-3 pt-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Additional Info (Optional)
                </Label>
                <Textarea
                  placeholder="Description of your project..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="bg-background/50 h-20"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Input
                      placeholder="Website"
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      className={`text-xs ${
                        errors.website ? "border-red-500" : ""
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Input
                      placeholder="Twitter (x.com/user)"
                      value={formData.twitter}
                      onChange={(e) =>
                        handleInputChange("twitter", e.target.value)
                      }
                      className={`text-xs ${
                        errors.twitter ? "border-red-500" : ""
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <Input
                      placeholder="Telegram (t.me/user)"
                      value={formData.telegram}
                      onChange={(e) =>
                        handleInputChange("telegram", e.target.value)
                      }
                      className={`text-xs ${
                        errors.telegram ? "border-red-500" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Mint Authority */}
              <div
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  formData.isMintable
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-green-500/30 bg-green-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold text-base">
                        Mint Authority
                      </Label>
                      {formData.isMintable ? (
                        <LockOpen className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p
                      className={`text-xs ${
                        formData.isMintable
                          ? "text-orange-600/80 font-medium"
                          : "text-green-600/80"
                      }`}
                    >
                      {formData.isMintable
                        ? "Warning: Future minting is ENABLED. Supply can change."
                        : "Fixed Supply: Future minting is DISABLED forever."}
                    </p>
                  </div>
                  <Switch
                    checked={formData.isMintable}
                    onCheckedChange={(c) => handleInputChange("isMintable", c)}
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* 5. Extensions (Token-2022 Only) */}
              {tokenStandard === "token-2022" && (
                <div className="border rounded-xl bg-muted/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowExtensions(!showExtensions)}
                    className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Zap className="h-4 w-4 text-yellow-500" /> Token-2022
                      Extensions
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showExtensions ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showExtensions && (
                    <div className="p-4 space-y-3">
                      {/* --- Transfer Fee --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-green-500/10 text-green-500 mt-1">
                            <Percent className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Transfer Tax
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              Percentage of every transaction withheld.
                            </p>
                          </div>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0%"
                            value={formData.transferFee}
                            onChange={(e) =>
                              handleInputChange("transferFee", e.target.value)
                            }
                            className="bg-background text-right"
                          />
                        </div>
                      </div>

                      {/* --- Interest Rate --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500 mt-1">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Interest Rate
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              APY accumulated by holders.
                            </p>
                          </div>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0%"
                            value={formData.interestRate}
                            onChange={(e) =>
                              handleInputChange("interestRate", e.target.value)
                            }
                            className="bg-background text-right"
                          />
                        </div>
                      </div>

                      {/* --- Immutable Metadata --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 mt-1">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Immutable Metadata
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              Name, symbol, and image cannot be changed later.
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.revokeUpdateAuthority}
                          onCheckedChange={(c) =>
                            handleInputChange("revokeUpdateAuthority", c)
                          }
                          disabled={isCreating}
                        />
                      </div>

                      {/* --- Soulbound --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-purple-500/10 text-purple-500 mt-1">
                            <Anchor className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Soulbound (Non-Transferable)
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              Tokens cannot be sent to other wallets.
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.nonTransferable}
                          onCheckedChange={(c) =>
                            handleInputChange("nonTransferable", c)
                          }
                          disabled={isCreating}
                        />
                      </div>

                      {/* --- God Mode --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-red-500/10 text-red-500 mt-1">
                            <Eye className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Permanent Delegate (God Mode)
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              Burn or transfer tokens from <strong>any</strong>{" "}
                              wallet.
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.enablePermanentDelegate}
                          onCheckedChange={(c) =>
                            handleInputChange("enablePermanentDelegate", c)
                          }
                          disabled={isCreating}
                        />
                      </div>

                      {/* --- Default Frozen --- */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500 mt-1">
                            <Snowflake className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">
                              Default Account State: Frozen
                            </Label>
                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-xs">
                              Holders are frozen by default. Must thaw manually.
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.defaultAccountStateFrozen}
                          onCheckedChange={(c) =>
                            handleInputChange("defaultAccountStateFrozen", c)
                          }
                          disabled={isCreating}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================= FOOTER / NAVIGATION ======================= */}
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          {errors.address && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.address}</AlertDescription>
            </Alert>
          )}

          {signature && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>Token Created Successfully!</span>
                <a
                  href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  className="hover:underline flex items-center gap-1 text-xs"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isCreating}
                className="w-24"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}

            {step === 1 ? (
              <Button
                type="button"
                className="flex-1 btn-fintech"
                onClick={() =>
                  canProceedToStep2()
                    ? setStep(2)
                    : setErrors({
                        address: "Please complete the address generation step.",
                      })
                }
              >
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isCreating || !!imageError}
                className="flex-1 btn-fintech shadow-lg shadow-primary/20"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    {statusMessage}
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" /> Mint Token
                  </>
                )}
              </Button>
            )}

            {step === 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className=""
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
