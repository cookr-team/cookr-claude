import { tr } from '../lib/tr';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole, UserStatus } from '../types';

export interface SignUpMetadata {
  nome: string;
  telefone?: string;
  role: UserRole;
  avatar_url?: string;
}

/** Política de palavra-passe: mínimo 8 caracteres, com letras e números. */
export function assertStrongPassword(password: string) {
  if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(tr('A palavra-passe deve ter pelo menos 8 caracteres, com letras e números.'));
  }
}

export const supabaseAuthService = {
  /**
   * Supabase Auth: Registar novo utilizador passando metadados para o trigger handle_new_user
   */
  signUp: async (email: string, password: string, metadata: SignUpMetadata) => {
    const sanitizedEmail = email.toLowerCase().trim();
    assertStrongPassword(password);

    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        data: {
          nome: metadata.nome,
          telefone: metadata.telefone || null,
          role: metadata.role,
          avatar_url: metadata.avatar_url || null,
        },
      },
    });

    if (error) {
      console.warn('[Supabase Auth] signUp note:', error.message);
      throw error;
    }

    return data;
  },

  /**
   * Supabase Auth: Autenticar com email e palavra-passe
   */
  signInWithPassword: async (email: string, password: string) => {
    const sanitizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    if (error) {
      console.warn('[Supabase Auth] signInWithPassword error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Supabase Auth: Atualizar palavra-passe de forma segura do utilizador autenticado
   */
  updatePassword: async (newPassword: string) => {
    assertStrongPassword(newPassword);
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.warn('[Supabase Auth] updatePassword note:', error);
      throw error;
    }

    return data;
  },

  /**
   * Supabase Auth: Enviar link de redefinição de palavra-passe por email
   */
  resetPasswordForEmail: async (email: string, redirectTo?: string) => {
    const sanitizedEmail = email.toLowerCase().trim();
    const targetRedirect = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/?action=reset-password` : undefined);

    const { data, error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: targetRedirect,
    });

    if (error) {
      console.warn('[Supabase Auth] resetPasswordForEmail note:', error);
      throw error;
    }

    return data;
  },

  /**
   * Supabase Auth: Terminar sessão
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[Supabase Auth] signOut note:', error);
      throw error;
    }
  },

  /**
   * Supabase Auth: Obter a sessão ativa
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Supabase Auth] getSession error:', error);
      return null;
    }
    return data.session;
  },

  /**
   * Supabase Auth: Obter utilizador atual autenticado
   */
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return data.user;
  },

  /**
   * Supabase Auth: Autenticação com o Google OAuth
   */
  signInWithGoogle: async (): Promise<{ user: User | null; isNew: boolean; authUser: any; oauthUser?: any; data: any }> => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] signInWithGoogle note:', error);
      throw error;
    }

    return { user: null, isNew: false, authUser: null, oauthUser: null, data };
  },

  /**
   * Supabase Auth: Escuta de mudanças de estado de autenticação
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data.subscription;
  },
};
