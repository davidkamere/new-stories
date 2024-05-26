// auth.ts

import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/db/supabase';

export const signUp = async (email: string, password: string) => {
  const { data: user, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error signing up:', error.message);
  }

  return { user, error };
};


export const signIn = async (email: string, password: string) => {
    try {
        const { data: user, error:signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            // Handle authentication error
            throw signInError;
        }   
        
        return { user,  };
    } catch (error) {
        return { user: null, error: error as Error };
    }
};

export const signOut = async () => {
  await supabase.auth.signOut();
};



export const getUser = (): any => supabase.auth.getUser();

export const getSession = (): any => supabase.auth.getSession();

export const onAuthStateChanged = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data;
};
