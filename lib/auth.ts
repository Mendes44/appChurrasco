// A autorização usa uma lista explícita; login válido não significa acesso ao painel.
export const ADMIN_EMAIL = "marcosmendesm10@gmail.com";

export function isAdmin(email?: string | null) {
  return email?.toLocaleLowerCase("pt-BR") === ADMIN_EMAIL;
}
