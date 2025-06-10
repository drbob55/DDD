import { inferAsyncReturnType } from '@trpc/server';

export interface CreateContextOptions {
  session: any | null;
}

export async function createContext({ session }: CreateContextOptions) {
  return {
    session,
    // Add your repositories and services here
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
