import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';


interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Omit<User, 'id' | 'email'>) => Promise<any>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  loadUser: async () => {
    set({ loading: true });
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session?.user) {
        set({ user: null, loading: false });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            fullName: profile.full_name,
            role: profile.role,
            department: profile.department
          }
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Reset user state on error
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {

    const { error, data } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: profile.full_name,
          role: profile.role,
          department: profile.department
        }
      });
    }
  },

  signUp: async (email, password, userData) => {
    try {
      // First create the auth user
      const { error: authError, data } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('No user returned from signup');

      // Then create the profile with direct SQL to bypass RLS
      const { error: profileError } = await supabase.rpc('create_profile', {
        user_id: data.user.id,
        full_name: userData.fullName,
        user_role: userData.role,
        user_department: userData.department
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));