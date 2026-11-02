// `pnpm db:types`로 재생성하세요 (최초 1회 `npx supabase login` 필요).
// 아래 내용은 supabase/migrations 기준으로 생성기 출력 형식에 맞춰 작성되었습니다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      characters: {
        Row: {
          avatar_config: Json | null;
          created_at: string | null;
          description: string | null;
          few_shot: string | null;
          id: string;
          name: string;
          slug: string;
          system_prompt: string;
        };
        Insert: {
          avatar_config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          few_shot?: string | null;
          id?: string;
          name: string;
          slug: string;
          system_prompt: string;
        };
        Update: {
          avatar_config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          few_shot?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          system_prompt?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          character_id: string;
          created_at: string | null;
          id: string;
          summary: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          character_id: string;
          created_at?: string | null;
          id?: string;
          summary?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          character_id?: string;
          created_at?: string | null;
          id?: string;
          summary?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_character_id_fkey';
            columns: ['character_id'];
            isOneToOne: false;
            referencedRelation: 'characters';
            referencedColumns: ['id'];
          },
        ];
      };
      memories: {
        Row: {
          character_id: string;
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          embedding: string;
          id: string;
          message_id: string | null;
          user_id: string;
        };
        Insert: {
          character_id: string;
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          embedding: string;
          id?: string;
          message_id?: string | null;
          user_id: string;
        };
        Update: {
          character_id?: string;
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          embedding?: string;
          id?: string;
          message_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memories_character_id_fkey';
            columns: ['character_id'];
            isOneToOne: false;
            referencedRelation: 'characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string | null;
          emotion: string | null;
          id: string;
          role: string;
          token_usage: Json | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string | null;
          emotion?: string | null;
          id?: string;
          role: string;
          token_usage?: Json | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          emotion?: string | null;
          id?: string;
          role?: string;
          token_usage?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      user_knowledge: {
        Row: {
          character_id: string;
          content: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          character_id: string;
          content: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          character_id?: string;
          content?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_knowledge_character_id_fkey';
            columns: ['character_id'];
            isOneToOne: false;
            referencedRelation: 'characters';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_memories: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_character_id: string;
          p_exclude_conversation_id?: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
