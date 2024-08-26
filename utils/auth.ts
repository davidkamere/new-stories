// utils/auth.ts

import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/db/supabase';

export const signUp = async (email: string, password: string) => {
  const { data: user, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Error signing up:', error.message);
    return { user: null, error };
  }

  return { user, error: null };
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data: user, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getSession = async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    return data.session;
  };
  
  export const getUser = async (): Promise<User | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error.message);
      return null;
    }
    return data.user;
  };

export const onAuthStateChanged = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data;
};
