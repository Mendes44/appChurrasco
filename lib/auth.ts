// O e-mail autorizado vem do ambiente e nunca fica gravado no repositório.
// Login Google válido não significa automaticamente acesso administrativo.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("pt-BR") ?? "";

export function isAdmin(email?: string | null) {
  return Boolean(ADMIN_EMAIL) && email?.toLocaleLowerCase("pt-BR") === ADMIN_EMAIL;
}
