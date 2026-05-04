export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ═══ Database Row Types ═══

export interface User {
  id: string;
  name: string;
  role: "suami" | "istri";
}

export interface Pos {
  id: string;
  name: string;
  icon: string;
  sub: string;
  monthly_target: number;
  current_balance: number;
  order_index: number;
  is_goal: boolean;
  goal_target: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  pos_id: string;
  pos_name: string;
  pos_icon: string;
  user_id: string;
  user_name: string;
  user_role: "suami" | "istri";
  description: string;
  created_at: string;
}

export interface Cycle {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  label: string;
}

export interface Child {
  id: string;
  name: string;
  icon: string;
  balance: number;
}

export interface ChildTransaction {
  id: string;
  child_id: string;
  type: "in" | "out";
  amount: number;
  description: string;
  icon: string;
  created_at: string;
}

export interface Debt {
  id: string;
  name: string;
  icon: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  due_date: number;
  created_at: string;
}

// ═══ Supabase Database Schema ═══

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id"> & { id?: string };
        Update: Partial<User>;
      };
      pos: {
        Row: Pos;
        Insert: Omit<Pos, "id" | "is_goal" | "goal_target"> & { id?: string; is_goal?: boolean; goal_target?: number };
        Update: Partial<Pos>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "type"> & {
          id?: string;
          created_at?: string;
          type?: "income" | "expense";
        };
        Update: Partial<Transaction>;
      };
      cycles: {
        Row: Cycle;
        Insert: Omit<Cycle, "id"> & { id?: string };
        Update: Partial<Cycle>;
      };
      children: {
        Row: Child;
        Insert: Omit<Child, "id"> & { id?: string };
        Update: Partial<Child>;
      };
      child_transactions: {
        Row: ChildTransaction;
        Insert: Omit<ChildTransaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ChildTransaction>;
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Debt>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
