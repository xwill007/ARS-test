/** Funciones puras del dominio `auth` — sin efectos secundarios, testeables sin BD/HTTP. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildJwtPayload(user: {
  id: number;
  email: string;
}): { sub: number; email: string } {
  return { sub: user.id, email: user.email };
}
