import { randomBytes, createHash } from "crypto";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `sha256$${salt}$${hash}`;
};

export const verifyPassword = (stored: string, plain: string) => {
  if (!stored || !plain) return false;
  const [algo, salt, digest] = stored.split("$");
  if (algo !== "sha256" || !salt || !digest) return false;
  const candidate = createHash("sha256").update(salt + plain).digest("hex");
  return candidate === digest;
};