const sanitizeAuthUrlEnv = (
  key: "NEXTAUTH_URL" | "NEXTAUTH_URL_INTERNAL" | "VERCEL_URL",
) => {
  const raw = process.env[key];

  if (!raw) {
    return;
  }

  const value = raw.trim();
  if (!value) {
    delete process.env[key];
    return;
  }

  try {
    new URL(value);
    process.env[key] = value;
    return;
  } catch {
    if (!value.includes("://")) {
      const fallbackProtocol =
        value.startsWith("localhost") || value.startsWith("127.0.0.1")
          ? "http://"
          : "https://";
      const normalized = `${fallbackProtocol}${value}`;

      try {
        new URL(normalized);
        process.env[key] = normalized;
        return;
      } catch {
        delete process.env[key];
        return;
      }
    }

    delete process.env[key];
  }
};

sanitizeAuthUrlEnv("NEXTAUTH_URL");
sanitizeAuthUrlEnv("NEXTAUTH_URL_INTERNAL");
sanitizeAuthUrlEnv("VERCEL_URL");

// Load next-auth/react only after sanitizing environment variables.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextAuthReact = require("next-auth/react") as {
  SessionProvider: (props: any) => JSX.Element;
  useSession: (...args: any[]) => any;
  signIn: (...args: any[]) => any;
  signOut: (...args: any[]) => any;
};

export const SessionProvider = nextAuthReact.SessionProvider;
export const useSession = nextAuthReact.useSession;
export const signIn = nextAuthReact.signIn;
export const signOut = nextAuthReact.signOut;
