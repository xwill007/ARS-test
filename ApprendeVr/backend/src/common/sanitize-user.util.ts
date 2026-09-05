/** Quita `password` de un usuario antes de devolverlo en cualquier respuesta HTTP. */
export function sanitizeUser<T extends { password: string }>(
  user: T,
): Omit<T, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- se destructura para excluirla
  const { password, ...rest } = user;
  return rest;
}
