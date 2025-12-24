// FILE: app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Defines the expected structure of a successful response from the Pinata API.
interface PinataSuccessResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

// Defines the potential structure of an error response from the Pinata API.
interface PinataErrorResponse {
  error?: {
    reason?: string;
    details?: string;
  };
}

/**
 * In the App Router, we export named functions for each HTTP method (e.g., POST, GET).
 * The 'config' object is no longer needed for disabling the body parser.
 */
export async function POST(req: NextRequest) {
  // 1. Verify the Pinata JWT environment variable is set.
  const pinataJWT = process.env.PINATA_JWT;
  if (!pinataJWT) {
    console.error("[API/UPLOAD] Server Error: PINATA_JWT environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error: IPFS key is missing." },
      { status: 500 }
    );
  }

  try {
    // 2. Parse the incoming form data from the request.
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // 3. Create a new FormData instance to send to Pinata.
    const data = new FormData();
    // The file from req.formData() can be appended directly.
    data.append('file', Buffer.from(await file.arrayBuffer()), {
      filename: file.name,
    });
    
    // 4. Send the file to Pinata for pinning.
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
        ...data.getHeaders(),
      },
      body: data,
    });

    if (!pinataResponse.ok) {
      const errorBody = await pinataResponse.json() as PinataErrorResponse;
      console.error("[API/UPLOAD] Pinata API Error:", errorBody);
      throw new Error(`IPFS pinning failed: ${errorBody.error?.reason || 'Pinata API request failed'}`);
    }

    const responseData = await pinataResponse.json() as PinataSuccessResponse;
    const ipfsHash = responseData.IpfsHash;

    // 5. Construct the publicly accessible URL.
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.pinata.cloud';
    const publicUrl = `${gatewayUrl}/ipfs/${ipfsHash}`;
    
    // 6. Return a successful response.
    return NextResponse.json({ url: publicUrl, ipfsHash }, { status: 200 });

  } catch (error: any) {
    console.error("[API/UPLOAD] An unexpected error occurred:", error);
    return NextResponse.json(
        { error: error.message || 'An unknown error occurred during upload.' }, 
        { status: 500 }
    );
  }
}