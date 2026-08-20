import { createHash, randomBytes, pbkdf2 as nodePbkdf2 } from "crypto";

export enum CryptoDigestAlgorithm {
  SHA1 = "SHA-1",
  SHA256 = "SHA-256",
  SHA384 = "SHA-384",
  SHA512 = "SHA-512",
  MD2 = "MD2",
  MD4 = "MD4",
  MD5 = "MD5",
}

export enum CryptoEncoding {
  HEX = "hex",
  BASE64 = "base64",
}

export type CryptoDigestOptions = { encoding?: CryptoEncoding };

export async function digestStringAsync(algorithm: string, data: string, options: CryptoDigestOptions = {}): Promise<string> {
  const hash = createHash(algorithm === "SHA-256" ? "sha256" : "sha1").update(data, "utf8");
  return options.encoding === CryptoEncoding.BASE64 ? hash.digest("base64") : hash.digest("hex");
}

export async function getRandomBytesAsync(byteCount: number): Promise<Uint8Array> {
  return new Uint8Array(randomBytes(byteCount));
}

export function getRandomValues(array: Uint8Array): Uint8Array {
  const values = randomBytes(array.length);
  for (let index = 0; index < array.length; index++) {
    array[index] = values[index];
  }
  return array;
}

type CryptoDigestAlgorithmName =
  | CryptoDigestAlgorithm
  | "SHA-1"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512";

export type CryptoDigestOptionsExtended = {
  encoding?: CryptoEncoding;
};

export type CryptoKdfOptions = {
  encoding?: CryptoEncoding;
};

export async function pbkdf2Async(
  password: string,
  salt: string,
  iterations: number,
  keyByteLength: number,
  algorithm: CryptoDigestAlgorithmName,
  options: CryptoKdfOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const nodeAlgorithm = algorithm === "SHA-256" ? "sha256" : algorithm === "SHA-1" ? "sha1" : "sha512";
    nodePbkdf2(
      password,
      salt,
      iterations,
      keyByteLength,
      nodeAlgorithm,
      (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(options.encoding === CryptoEncoding.BASE64 ? key!.toString("base64") : key!.toString("hex"));
      },
    );
  });
}
