const authErrorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  EmailInUse: "An account with this email already exists.",
}

export function getAuthErrorMessage(code?: string | null): string | undefined {
  if (!code) return undefined
  return authErrorMessages[code] ?? "Something went wrong. Please try again."
}
