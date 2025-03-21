const { PrivateKey } = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

function checkAdminKey() {
  console.log("Checking if ADMIN_PRIVATE_KEY matches the LYNX token supply key...");

  // Log environment variables availability
  console.log("ADMIN_PRIVATE_KEY available:", process.env.ADMIN_PRIVATE_KEY ? "Yes" : "No");

  // Check if required environment variables are present
  if (!process.env.ADMIN_PRIVATE_KEY) {
    console.error("Required environment variable ADMIN_PRIVATE_KEY is missing. Please check your .env.local file.");
    process.exit(1);
  }

  // The supply key from the mirror node
  const tokenSupplyKeyFromMirror = "8e9938d49222e81e50054cb172e627668ce1e1c29d9434d2eb6cf21dbdafb5fb";
  console.log("LYNX Token Supply Key (from Mirror Node):", tokenSupplyKeyFromMirror);

  // The raw admin private key value (for debugging only - first and last few characters)
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const adminKeyPartial = adminPrivateKey.substring(0, 10) + "..." + adminPrivateKey.substring(adminPrivateKey.length - 10);
  console.log("ADMIN_PRIVATE_KEY (partial):", adminKeyPartial);
  console.log("ADMIN_PRIVATE_KEY length:", adminPrivateKey.length);

  try {
    // Try different formats for the admin key
    console.log("\nTrying different formats for ADMIN_PRIVATE_KEY...");
    
    // Try DER format
    try {
      console.log("Attempting to parse as DER format...");
      const adminKeyDer = PrivateKey.fromStringDer(adminPrivateKey);
      const publicKeyDer = adminKeyDer.publicKey;
      console.log("Public key from DER (hex):", publicKeyDer.toString());
      console.log("Public key from DER (raw):", publicKeyDer.toStringRaw());
      
      // Compare with token supply key
      if (publicKeyDer.toStringRaw() === tokenSupplyKeyFromMirror) {
        console.log("✅ MATCH: The DER-parsed admin key matches the token's supply key");
      } else {
        console.log("❌ NO MATCH: The DER-parsed admin key does NOT match the token's supply key");
      }
    } catch (error) {
      console.log("Failed to parse as DER format:", error.message);
    }
    
    // Try ED25519 format
    try {
      console.log("\nAttempting to parse as ED25519 format...");
      const adminKeyEd = PrivateKey.fromStringED25519(adminPrivateKey);
      const publicKeyEd = adminKeyEd.publicKey;
      console.log("Public key from ED25519 (hex):", publicKeyEd.toString());
      console.log("Public key from ED25519 (raw):", publicKeyEd.toStringRaw());
      
      // Compare with token supply key
      if (publicKeyEd.toStringRaw() === tokenSupplyKeyFromMirror) {
        console.log("✅ MATCH: The ED25519-parsed admin key matches the token's supply key");
      } else {
        console.log("❌ NO MATCH: The ED25519-parsed admin key does NOT match the token's supply key");
      }
    } catch (error) {
      console.log("Failed to parse as ED25519 format:", error.message);
    }
    
    // If you created the token, you might try the key directly as UTF8 or Base64
    try {
      console.log("\nAttempting some additional format checks...");
      if (adminPrivateKey.length === 96) {
        // Could be a concatenated format - split and try the first half
        const firstHalf = adminPrivateKey.substring(0, 48);
        console.log("Testing first half of the key...");
        try {
          const key1 = PrivateKey.fromStringDer(firstHalf);
          console.log("First half parsed as DER, public key:", key1.publicKey.toStringRaw());
          if (key1.publicKey.toStringRaw() === tokenSupplyKeyFromMirror) {
            console.log("✅ MATCH: First half of admin key (DER) matches the token's supply key");
          }
        } catch (e) {
          console.log("First half not valid DER format");
        }
        
        try {
          const key1Ed = PrivateKey.fromStringED25519(firstHalf);
          console.log("First half parsed as ED25519, public key:", key1Ed.publicKey.toStringRaw());
          if (key1Ed.publicKey.toStringRaw() === tokenSupplyKeyFromMirror) {
            console.log("✅ MATCH: First half of admin key (ED25519) matches the token's supply key");
          }
        } catch (e) {
          console.log("First half not valid ED25519 format");
        }
        
        // Try second half
        const secondHalf = adminPrivateKey.substring(48);
        console.log("\nTesting second half of the key...");
        try {
          const key2 = PrivateKey.fromStringDer(secondHalf);
          console.log("Second half parsed as DER, public key:", key2.publicKey.toStringRaw());
          if (key2.publicKey.toStringRaw() === tokenSupplyKeyFromMirror) {
            console.log("✅ MATCH: Second half of admin key (DER) matches the token's supply key");
          }
        } catch (e) {
          console.log("Second half not valid DER format");
        }
        
        try {
          const key2Ed = PrivateKey.fromStringED25519(secondHalf);
          console.log("Second half parsed as ED25519, public key:", key2Ed.publicKey.toStringRaw());
          if (key2Ed.publicKey.toStringRaw() === tokenSupplyKeyFromMirror) {
            console.log("✅ MATCH: Second half of admin key (ED25519) matches the token's supply key");
          }
        } catch (e) {
          console.log("Second half not valid ED25519 format");
        }
      }
    } catch (error) {
      console.log("Additional format checks failed:", error.message);
    }

  } catch (error) {
    console.error("Error checking admin key:", error.message);
  }

  console.log("\nScript execution completed.");
}

// Execute the function
checkAdminKey(); 