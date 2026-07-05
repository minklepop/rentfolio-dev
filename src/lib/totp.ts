import * as OTPAuth from "otpauth";

function totpFor(email: string, base32Secret: string) {
  return new OTPAuth.TOTP({
    issuer: "Rentfolio",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function totpUri(email: string, base32Secret: string): string {
  return totpFor(email, base32Secret).toString();
}

export function verifyTotp(email: string, base32Secret: string, token: string): boolean {
  const delta = totpFor(email, base32Secret).validate({
    token: token.replaceAll(" ", ""),
    window: 1,
  });
  return delta !== null;
}
