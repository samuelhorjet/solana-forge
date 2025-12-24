/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_forge.json`.
 */
export type SolanaForge = {
  "address": "HwB325tYBpE7pAzZshMBCZo3PRCpdwwwLtsRy6t8NjDg",
  "metadata": {
    "name": "solanaForge",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createStandardToken",
      "discriminator": [
        158,
        50,
        113,
        24,
        224,
        140,
        167,
        160
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "tokenMetadataProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "tokenMetadataProgram"
            }
          }
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createStandardArgs"
            }
          }
        }
      ]
    },
    {
      "name": "createToken2022",
      "discriminator": [
        122,
        75,
        16,
        217,
        248,
        141,
        155,
        169
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createToken2022Args"
            }
          }
        }
      ]
    },
    {
      "name": "initializeUser",
      "discriminator": [
        111,
        17,
        185,
        250,
        60,
        122,
        38,
        254
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "proxyBurnBatch",
      "discriminator": [
        13,
        119,
        237,
        58,
        87,
        16,
        90,
        74
      ],
      "accounts": [
        {
          "name": "burner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amounts",
          "type": {
            "vec": "u64"
          }
        }
      ]
    },
    {
      "name": "proxyBurnFromLock",
      "discriminator": [
        216,
        185,
        84,
        141,
        225,
        133,
        54,
        169
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyBurnFromWallet",
      "discriminator": [
        152,
        15,
        120,
        104,
        64,
        120,
        6,
        193
      ],
      "accounts": [
        {
          "name": "burner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyCloseVault",
      "discriminator": [
        192,
        160,
        46,
        41,
        34,
        22,
        22,
        65
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyLockTokens",
      "discriminator": [
        240,
        44,
        217,
        178,
        53,
        54,
        241,
        79
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlockTimestamp",
          "type": "i64"
        },
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyMintTo",
      "discriminator": [
        35,
        51,
        23,
        59,
        15,
        13,
        177,
        122
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyTransfer",
      "discriminator": [
        96,
        85,
        66,
        154,
        46,
        148,
        7,
        152
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyWithdrawTokens",
      "discriminator": [
        250,
        32,
        175,
        249,
        161,
        143,
        244,
        170
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateTokenMetadata",
      "discriminator": [
        243,
        6,
        8,
        23,
        126,
        181,
        251,
        158
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "metadata",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    }
  ],
  "events": [
    {
      "name": "batchBurnEvent",
      "discriminator": [
        32,
        79,
        226,
        180,
        227,
        216,
        159,
        171
      ]
    },
    {
      "name": "lockedBurnEvent",
      "discriminator": [
        6,
        19,
        17,
        214,
        187,
        127,
        85,
        82
      ]
    },
    {
      "name": "metadataUpdatedEvent",
      "discriminator": [
        66,
        19,
        187,
        5,
        244,
        90,
        125,
        113
      ]
    },
    {
      "name": "standardTokenCreatedEvent",
      "discriminator": [
        127,
        41,
        151,
        188,
        167,
        205,
        45,
        158
      ]
    },
    {
      "name": "token2022CreatedEvent",
      "discriminator": [
        16,
        133,
        11,
        108,
        165,
        5,
        213,
        92
      ]
    },
    {
      "name": "tokenLockedEvent",
      "discriminator": [
        241,
        170,
        204,
        85,
        134,
        224,
        30,
        212
      ]
    },
    {
      "name": "tokenMintedEvent",
      "discriminator": [
        136,
        51,
        151,
        241,
        53,
        48,
        38,
        62
      ]
    },
    {
      "name": "tokenTransferredEvent",
      "discriminator": [
        33,
        245,
        64,
        27,
        188,
        124,
        220,
        189
      ]
    },
    {
      "name": "tokenWithdrawnEvent",
      "discriminator": [
        83,
        159,
        90,
        90,
        49,
        94,
        13,
        63
      ]
    },
    {
      "name": "vaultClosedEvent",
      "discriminator": [
        104,
        71,
        213,
        247,
        195,
        133,
        16,
        106
      ]
    },
    {
      "name": "walletBurnEvent",
      "discriminator": [
        125,
        58,
        64,
        99,
        24,
        200,
        220,
        66
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "batchBurnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burner",
            "type": "pubkey"
          },
          {
            "name": "mints",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "amounts",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "createStandardArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "initialSupply",
            "type": "u64"
          },
          {
            "name": "revokeUpdateAuthority",
            "type": "bool"
          },
          {
            "name": "revokeMintAuthority",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "createToken2022Args",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "initialSupply",
            "type": "u64"
          },
          {
            "name": "transferFeeBasisPoints",
            "type": "u16"
          },
          {
            "name": "interestRate",
            "type": "i16"
          },
          {
            "name": "isNonTransferable",
            "type": "bool"
          },
          {
            "name": "enablePermanentDelegate",
            "type": "bool"
          },
          {
            "name": "defaultAccountStateFrozen",
            "type": "bool"
          },
          {
            "name": "revokeUpdateAuthority",
            "type": "bool"
          },
          {
            "name": "revokeMintAuthority",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lockedBurnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fromLock",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "metadataUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "standardTokenCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "supply",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "token2022CreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "supply",
            "type": "u64"
          },
          {
            "name": "tokenProgram",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokenLockedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lockId",
            "type": "u64"
          },
          {
            "name": "unlockDate",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokenMintedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokenTransferredEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokenWithdrawnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lockId",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "tokenCount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vaultClosedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lockId",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "walletBurnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fromLock",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
