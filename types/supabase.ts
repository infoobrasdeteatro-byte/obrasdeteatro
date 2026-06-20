export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_requests: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          prompt: string | null
          request_type: string
          response: string | null
          tokens_used: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          prompt?: string | null
          request_type: string
          response?: string | null
          tokens_used?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          prompt?: string | null
          request_type?: string
          response?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          profile_id: string | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          profile_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          profile_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_type: string | null
          created_at: string | null
          deadline: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          location: string | null
          prize_amount: number | null
          profile_id: string
          slug: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          call_type?: string | null
          created_at?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          prize_amount?: number | null
          profile_id: string
          slug?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          call_type?: string | null
          created_at?: string | null
          deadline?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          prize_amount?: number | null
          profile_id?: string
          slug?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      casting_applications: {
        Row: {
          applicant_id: string
          applied_at: string | null
          casting_id: string
          cover_letter: string | null
          id: string
          notes: string | null
          portfolio_url: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string | null
          casting_id: string
          cover_letter?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string | null
          casting_id?: string
          cover_letter?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casting_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casting_applications_casting_id_fkey"
            columns: ["casting_id"]
            isOneToOne: false
            referencedRelation: "castings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casting_applications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      castings: {
        Row: {
          ciudad: string | null
          created_at: string
          descripcion: string
          descripcion_proceso: string | null
          destacado: boolean | null
          edad_max: number | null
          edad_min: number | null
          email_recepcion: string | null
          entidad_organizadora: string
          estado: string
          experiencia_requerida: string | null
          fecha_apertura: string
          fecha_cierre: string
          fechas_previstas: string | null
          forma_candidatura: string | null
          formacion_requerida: string | null
          genero_escenico: string | null
          habilidades_especiales: string | null
          id: string
          idiomas_requeridos: string[] | null
          importe: string | null
          lugar_trabajo: string | null
          modalidad: string | null
          nombre_proyecto: string
          pais: string | null
          perfil_descripcion: string
          perfil_nombre: string
          publicado: boolean | null
          remunerado: boolean | null
          scenaia_activo: boolean | null
          sinopsis: string | null
          tipo_audiovisual: boolean | null
          tipo_danza: boolean | null
          tipo_entidad: string | null
          tipo_musical: boolean | null
          tipo_otro: string | null
          tipo_teatro: boolean | null
          titulo: string
          updated_at: string
          url_externa: string | null
          user_id: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          descripcion: string
          descripcion_proceso?: string | null
          destacado?: boolean | null
          edad_max?: number | null
          edad_min?: number | null
          email_recepcion?: string | null
          entidad_organizadora: string
          estado?: string
          experiencia_requerida?: string | null
          fecha_apertura: string
          fecha_cierre: string
          fechas_previstas?: string | null
          forma_candidatura?: string | null
          formacion_requerida?: string | null
          genero_escenico?: string | null
          habilidades_especiales?: string | null
          id?: string
          idiomas_requeridos?: string[] | null
          importe?: string | null
          lugar_trabajo?: string | null
          modalidad?: string | null
          nombre_proyecto: string
          pais?: string | null
          perfil_descripcion: string
          perfil_nombre: string
          publicado?: boolean | null
          remunerado?: boolean | null
          scenaia_activo?: boolean | null
          sinopsis?: string | null
          tipo_audiovisual?: boolean | null
          tipo_danza?: boolean | null
          tipo_entidad?: string | null
          tipo_musical?: boolean | null
          tipo_otro?: string | null
          tipo_teatro?: boolean | null
          titulo: string
          updated_at?: string
          url_externa?: string | null
          user_id: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string
          descripcion_proceso?: string | null
          destacado?: boolean | null
          edad_max?: number | null
          edad_min?: number | null
          email_recepcion?: string | null
          entidad_organizadora?: string
          estado?: string
          experiencia_requerida?: string | null
          fecha_apertura?: string
          fecha_cierre?: string
          fechas_previstas?: string | null
          forma_candidatura?: string | null
          formacion_requerida?: string | null
          genero_escenico?: string | null
          habilidades_especiales?: string | null
          id?: string
          idiomas_requeridos?: string[] | null
          importe?: string | null
          lugar_trabajo?: string | null
          modalidad?: string | null
          nombre_proyecto?: string
          pais?: string | null
          perfil_descripcion?: string
          perfil_nombre?: string
          publicado?: boolean | null
          remunerado?: boolean | null
          scenaia_activo?: boolean | null
          sinopsis?: string | null
          tipo_audiovisual?: boolean | null
          tipo_danza?: boolean | null
          tipo_entidad?: string | null
          tipo_musical?: boolean | null
          tipo_otro?: string | null
          tipo_teatro?: boolean | null
          titulo?: string
          updated_at?: string
          url_externa?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "castings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          event_date: string | null
          event_end_date: string | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          is_published: boolean | null
          location: string | null
          price_from: number | null
          profile_id: string
          ticket_url: string | null
          title: string
          updated_at: string | null
          venue: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean | null
          location?: string | null
          price_from?: number | null
          profile_id: string
          ticket_url?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean | null
          location?: string | null
          price_from?: number | null
          profile_id?: string
          ticket_url?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          id: string
          is_read: boolean | null
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          id?: string
          is_read?: boolean | null
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          profile_id: string
          related_url: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          profile_id: string
          related_url?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          profile_id?: string
          related_url?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_actor: {
        Row: {
          acentos: string[] | null
          altura: number | null
          biografia: string | null
          created_at: string
          disp_castings: boolean | null
          disp_cine: boolean | null
          disp_giras: boolean | null
          disp_internacional: boolean | null
          disp_publicidad: boolean | null
          disp_teatro: boolean | null
          disp_television: boolean | null
          email_profesional: string | null
          experiencia: string | null
          facebook: string | null
          fecha_nacimiento: string | null
          formacion: string | null
          foto_principal: string | null
          genero: string | null
          habilidad_canto: boolean | null
          habilidad_circo: boolean | null
          habilidad_danza: boolean | null
          habilidad_doblaje: boolean | null
          habilidad_esgrima: boolean | null
          habilidad_improvisacion: boolean | null
          habilidad_magia: boolean | null
          habilidad_musical: boolean | null
          habilidad_presentacion: boolean | null
          id: string
          idiomas: string[] | null
          instagram: string | null
          linkedin: string | null
          mostrar_email: boolean | null
          mostrar_redes: boolean | null
          mostrar_telefono: boolean | null
          mostrar_whatsapp: boolean | null
          nacionalidad: string | null
          otras_habilidades: string | null
          premios: string | null
          telefono: string | null
          tiktok: string | null
          updated_at: string
          user_id: string
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          acentos?: string[] | null
          altura?: number | null
          biografia?: string | null
          created_at?: string
          disp_castings?: boolean | null
          disp_cine?: boolean | null
          disp_giras?: boolean | null
          disp_internacional?: boolean | null
          disp_publicidad?: boolean | null
          disp_teatro?: boolean | null
          disp_television?: boolean | null
          email_profesional?: string | null
          experiencia?: string | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          genero?: string | null
          habilidad_canto?: boolean | null
          habilidad_circo?: boolean | null
          habilidad_danza?: boolean | null
          habilidad_doblaje?: boolean | null
          habilidad_esgrima?: boolean | null
          habilidad_improvisacion?: boolean | null
          habilidad_magia?: boolean | null
          habilidad_musical?: boolean | null
          habilidad_presentacion?: boolean | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          mostrar_whatsapp?: boolean | null
          nacionalidad?: string | null
          otras_habilidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          acentos?: string[] | null
          altura?: number | null
          biografia?: string | null
          created_at?: string
          disp_castings?: boolean | null
          disp_cine?: boolean | null
          disp_giras?: boolean | null
          disp_internacional?: boolean | null
          disp_publicidad?: boolean | null
          disp_teatro?: boolean | null
          disp_television?: boolean | null
          email_profesional?: string | null
          experiencia?: string | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          genero?: string | null
          habilidad_canto?: boolean | null
          habilidad_circo?: boolean | null
          habilidad_danza?: boolean | null
          habilidad_doblaje?: boolean | null
          habilidad_esgrima?: boolean | null
          habilidad_improvisacion?: boolean | null
          habilidad_magia?: boolean | null
          habilidad_musical?: boolean | null
          habilidad_presentacion?: boolean | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          mostrar_whatsapp?: boolean | null
          nacionalidad?: string | null
          otras_habilidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_actor_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_compania: {
        Row: {
          anio_fundacion: number | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          email_corporativo: string | null
          facebook: string | null
          historia: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          mision: string | null
          mostrar_contacto: boolean | null
          mostrar_responsable: boolean | null
          nif_cif: string | null
          nombre_comercial: string | null
          nombre_compania: string
          num_integrantes: number | null
          num_producciones: number | null
          responsable_cargo: string | null
          responsable_email: string | null
          responsable_nombre: string | null
          responsable_telefono: string | null
          serv_contratacion: boolean | null
          serv_coproducciones: boolean | null
          serv_formacion: boolean | null
          serv_giras: boolean | null
          serv_internacional: boolean | null
          telefono: string | null
          tiktok: string | null
          tipo_amateur: boolean | null
          tipo_clasico: boolean | null
          tipo_comunitario: boolean | null
          tipo_contemporaneo: boolean | null
          tipo_experimental: boolean | null
          tipo_infantil: boolean | null
          tipo_musical: boolean | null
          tipo_profesional: boolean | null
          updated_at: string
          user_id: string
          valores: string | null
          verificado_solicitado: boolean | null
          vision: string | null
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          anio_fundacion?: number | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_corporativo?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mision?: string | null
          mostrar_contacto?: boolean | null
          mostrar_responsable?: boolean | null
          nif_cif?: string | null
          nombre_comercial?: string | null
          nombre_compania: string
          num_integrantes?: number | null
          num_producciones?: number | null
          responsable_cargo?: string | null
          responsable_email?: string | null
          responsable_nombre?: string | null
          responsable_telefono?: string | null
          serv_contratacion?: boolean | null
          serv_coproducciones?: boolean | null
          serv_formacion?: boolean | null
          serv_giras?: boolean | null
          serv_internacional?: boolean | null
          telefono?: string | null
          tiktok?: string | null
          tipo_amateur?: boolean | null
          tipo_clasico?: boolean | null
          tipo_comunitario?: boolean | null
          tipo_contemporaneo?: boolean | null
          tipo_experimental?: boolean | null
          tipo_infantil?: boolean | null
          tipo_musical?: boolean | null
          tipo_profesional?: boolean | null
          updated_at?: string
          user_id: string
          valores?: string | null
          verificado_solicitado?: boolean | null
          vision?: string | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          anio_fundacion?: number | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_corporativo?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mision?: string | null
          mostrar_contacto?: boolean | null
          mostrar_responsable?: boolean | null
          nif_cif?: string | null
          nombre_comercial?: string | null
          nombre_compania?: string
          num_integrantes?: number | null
          num_producciones?: number | null
          responsable_cargo?: string | null
          responsable_email?: string | null
          responsable_nombre?: string | null
          responsable_telefono?: string | null
          serv_contratacion?: boolean | null
          serv_coproducciones?: boolean | null
          serv_formacion?: boolean | null
          serv_giras?: boolean | null
          serv_internacional?: boolean | null
          telefono?: string | null
          tiktok?: string | null
          tipo_amateur?: boolean | null
          tipo_clasico?: boolean | null
          tipo_comunitario?: boolean | null
          tipo_contemporaneo?: boolean | null
          tipo_experimental?: boolean | null
          tipo_infantil?: boolean | null
          tipo_musical?: boolean | null
          tipo_profesional?: boolean | null
          updated_at?: string
          user_id?: string
          valores?: string | null
          verificado_solicitado?: boolean | null
          vision?: string | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_compania_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_director: {
        Row: {
          biografia: string | null
          created_at: string
          disp_coproducciones: boolean | null
          disp_festivales: boolean | null
          disp_formacion: boolean | null
          disp_giras: boolean | null
          disp_internacional: boolean | null
          disp_proyectos: boolean | null
          email_profesional: string | null
          esp_clasico: boolean | null
          esp_comunitario: boolean | null
          esp_contemporaneo: boolean | null
          esp_experimental: boolean | null
          esp_infantil: boolean | null
          esp_musical: boolean | null
          esp_opera: boolean | null
          esp_performance: boolean | null
          esp_zarzuela: boolean | null
          facebook: string | null
          fecha_nacimiento: string | null
          formacion: string | null
          foto_principal: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          mostrar_email: boolean | null
          mostrar_redes: boolean | null
          mostrar_telefono: boolean | null
          nacionalidad: string | null
          otras_especialidades: string | null
          premios: string | null
          telefono: string | null
          tiktok: string | null
          trayectoria: string | null
          updated_at: string
          user_id: string
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          biografia?: string | null
          created_at?: string
          disp_coproducciones?: boolean | null
          disp_festivales?: boolean | null
          disp_formacion?: boolean | null
          disp_giras?: boolean | null
          disp_internacional?: boolean | null
          disp_proyectos?: boolean | null
          email_profesional?: string | null
          esp_clasico?: boolean | null
          esp_comunitario?: boolean | null
          esp_contemporaneo?: boolean | null
          esp_experimental?: boolean | null
          esp_infantil?: boolean | null
          esp_musical?: boolean | null
          esp_opera?: boolean | null
          esp_performance?: boolean | null
          esp_zarzuela?: boolean | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          nacionalidad?: string | null
          otras_especialidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          trayectoria?: string | null
          updated_at?: string
          user_id: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          biografia?: string | null
          created_at?: string
          disp_coproducciones?: boolean | null
          disp_festivales?: boolean | null
          disp_formacion?: boolean | null
          disp_giras?: boolean | null
          disp_internacional?: boolean | null
          disp_proyectos?: boolean | null
          email_profesional?: string | null
          esp_clasico?: boolean | null
          esp_comunitario?: boolean | null
          esp_contemporaneo?: boolean | null
          esp_experimental?: boolean | null
          esp_infantil?: boolean | null
          esp_musical?: boolean | null
          esp_opera?: boolean | null
          esp_performance?: boolean | null
          esp_zarzuela?: boolean | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          nacionalidad?: string | null
          otras_especialidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          trayectoria?: string | null
          updated_at?: string
          user_id?: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_director_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_dramaturgo: {
        Row: {
          acepta_adaptacion_audiovisual: boolean | null
          acepta_licenciamiento: boolean | null
          acepta_publicacion_editorial: boolean | null
          acepta_solicitudes_representacion: boolean | null
          acepta_traduccion: boolean | null
          biografia: string | null
          created_at: string
          email_profesional: string | null
          esp_comedia: boolean | null
          esp_drama: boolean | null
          esp_experimental: boolean | null
          esp_historico: boolean | null
          esp_infantil: boolean | null
          esp_microteatro: boolean | null
          esp_monologo: boolean | null
          esp_musical: boolean | null
          esp_tragedia: boolean | null
          facebook: string | null
          fecha_nacimiento: string | null
          formacion: string | null
          foto_principal: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          mostrar_email: boolean | null
          mostrar_redes: boolean | null
          mostrar_telefono: boolean | null
          nacionalidad: string | null
          otras_especialidades: string | null
          premios: string | null
          telefono: string | null
          tiktok: string | null
          total_obras_escritas: number | null
          total_obras_estrenadas: number | null
          total_obras_publicadas: number | null
          trayectoria: string | null
          updated_at: string
          user_id: string
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          acepta_adaptacion_audiovisual?: boolean | null
          acepta_licenciamiento?: boolean | null
          acepta_publicacion_editorial?: boolean | null
          acepta_solicitudes_representacion?: boolean | null
          acepta_traduccion?: boolean | null
          biografia?: string | null
          created_at?: string
          email_profesional?: string | null
          esp_comedia?: boolean | null
          esp_drama?: boolean | null
          esp_experimental?: boolean | null
          esp_historico?: boolean | null
          esp_infantil?: boolean | null
          esp_microteatro?: boolean | null
          esp_monologo?: boolean | null
          esp_musical?: boolean | null
          esp_tragedia?: boolean | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          nacionalidad?: string | null
          otras_especialidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          total_obras_escritas?: number | null
          total_obras_estrenadas?: number | null
          total_obras_publicadas?: number | null
          trayectoria?: string | null
          updated_at?: string
          user_id: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          acepta_adaptacion_audiovisual?: boolean | null
          acepta_licenciamiento?: boolean | null
          acepta_publicacion_editorial?: boolean | null
          acepta_solicitudes_representacion?: boolean | null
          acepta_traduccion?: boolean | null
          biografia?: string | null
          created_at?: string
          email_profesional?: string | null
          esp_comedia?: boolean | null
          esp_drama?: boolean | null
          esp_experimental?: boolean | null
          esp_historico?: boolean | null
          esp_infantil?: boolean | null
          esp_microteatro?: boolean | null
          esp_monologo?: boolean | null
          esp_musical?: boolean | null
          esp_tragedia?: boolean | null
          facebook?: string | null
          fecha_nacimiento?: string | null
          formacion?: string | null
          foto_principal?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          mostrar_email?: boolean | null
          mostrar_redes?: boolean | null
          mostrar_telefono?: boolean | null
          nacionalidad?: string | null
          otras_especialidades?: string | null
          premios?: string | null
          telefono?: string | null
          tiktok?: string | null
          total_obras_escritas?: number | null
          total_obras_estrenadas?: number | null
          total_obras_publicadas?: number | null
          trayectoria?: string | null
          updated_at?: string
          user_id?: string
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_dramaturgo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_escuela: {
        Row: {
          anio_fundacion: number | null
          codigo_postal: string | null
          created_at: string
          descripcion: string | null
          descripcion_becas: string | null
          direccion: string | null
          email_oficial: string | null
          entidad_responsable: string | null
          facebook: string | null
          form_danza: boolean | null
          form_direccion: boolean | null
          form_dramaturgia: boolean | null
          form_gestion_cultural: boolean | null
          form_improvisacion: boolean | null
          form_interpretacion: boolean | null
          form_musical: boolean | null
          form_produccion: boolean | null
          form_voz: boolean | null
          historia: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          mostrar_contacto: boolean | null
          naturaleza_juridica: string | null
          nombre_comercial: string | null
          nombre_escuela: string
          num_estudiantes: number | null
          ofrece_ayudas: boolean | null
          ofrece_becas: boolean | null
          ofrece_practicas: boolean | null
          ofrece_residencias: boolean | null
          perfil_estudiantes: string | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono: string | null
          telefono: string | null
          tiktok: string | null
          updated_at: string
          user_id: string
          verificado_solicitado: boolean | null
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          anio_fundacion?: number | null
          codigo_postal?: string | null
          created_at?: string
          descripcion?: string | null
          descripcion_becas?: string | null
          direccion?: string | null
          email_oficial?: string | null
          entidad_responsable?: string | null
          facebook?: string | null
          form_danza?: boolean | null
          form_direccion?: boolean | null
          form_dramaturgia?: boolean | null
          form_gestion_cultural?: boolean | null
          form_improvisacion?: boolean | null
          form_interpretacion?: boolean | null
          form_musical?: boolean | null
          form_produccion?: boolean | null
          form_voz?: boolean | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_escuela: string
          num_estudiantes?: number | null
          ofrece_ayudas?: boolean | null
          ofrece_becas?: boolean | null
          ofrece_practicas?: boolean | null
          ofrece_residencias?: boolean | null
          perfil_estudiantes?: string | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          anio_fundacion?: number | null
          codigo_postal?: string | null
          created_at?: string
          descripcion?: string | null
          descripcion_becas?: string | null
          direccion?: string | null
          email_oficial?: string | null
          entidad_responsable?: string | null
          facebook?: string | null
          form_danza?: boolean | null
          form_direccion?: boolean | null
          form_dramaturgia?: boolean | null
          form_gestion_cultural?: boolean | null
          form_improvisacion?: boolean | null
          form_interpretacion?: boolean | null
          form_musical?: boolean | null
          form_produccion?: boolean | null
          form_voz?: boolean | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_escuela?: string
          num_estudiantes?: number | null
          ofrece_ayudas?: boolean | null
          ofrece_becas?: boolean | null
          ofrece_practicas?: boolean | null
          ofrece_residencias?: boolean | null
          perfil_estudiantes?: string | null
          responsable_cargo?: string
          responsable_email?: string
          responsable_nombre?: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_escuela_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_festival: {
        Row: {
          acepta_postulaciones: boolean | null
          anio_fundacion: number | null
          codigo_postal: string | null
          concede_premios: boolean | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          email_oficial: string | null
          entidad_organizadora: string
          facebook: string | null
          historia: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          mostrar_contacto: boolean | null
          naturaleza_juridica: string | null
          nombre_comercial: string | null
          nombre_festival: string
          num_asistentes: number | null
          num_companias: number | null
          ofrece_residencias: boolean | null
          periodicidad: string | null
          publica_convocatorias: boolean | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono: string | null
          telefono: string | null
          tiktok: string | null
          tipo_clasico: boolean | null
          tipo_contemporaneo: boolean | null
          tipo_experimental: boolean | null
          tipo_infantil: boolean | null
          tipo_multidisciplinar: boolean | null
          tipo_musical: boolean | null
          updated_at: string
          url_ticketing_externo: string | null
          usa_ticketing_obrasdeteatro: boolean | null
          user_id: string
          verificado_solicitado: boolean | null
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          acepta_postulaciones?: boolean | null
          anio_fundacion?: number | null
          codigo_postal?: string | null
          concede_premios?: boolean | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_oficial?: string | null
          entidad_organizadora: string
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_festival: string
          num_asistentes?: number | null
          num_companias?: number | null
          ofrece_residencias?: boolean | null
          periodicidad?: string | null
          publica_convocatorias?: boolean | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_clasico?: boolean | null
          tipo_contemporaneo?: boolean | null
          tipo_experimental?: boolean | null
          tipo_infantil?: boolean | null
          tipo_multidisciplinar?: boolean | null
          tipo_musical?: boolean | null
          updated_at?: string
          url_ticketing_externo?: string | null
          usa_ticketing_obrasdeteatro?: boolean | null
          user_id: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          acepta_postulaciones?: boolean | null
          anio_fundacion?: number | null
          codigo_postal?: string | null
          concede_premios?: boolean | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_oficial?: string | null
          entidad_organizadora?: string
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_festival?: string
          num_asistentes?: number | null
          num_companias?: number | null
          ofrece_residencias?: boolean | null
          periodicidad?: string | null
          publica_convocatorias?: boolean | null
          responsable_cargo?: string
          responsable_email?: string
          responsable_nombre?: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_clasico?: boolean | null
          tipo_contemporaneo?: boolean | null
          tipo_experimental?: boolean | null
          tipo_infantil?: boolean | null
          tipo_multidisciplinar?: boolean | null
          tipo_musical?: boolean | null
          updated_at?: string
          url_ticketing_externo?: string | null
          usa_ticketing_obrasdeteatro?: boolean | null
          user_id?: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_festival_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_productora: {
        Row: {
          anio_fundacion: number | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          email_corporativo: string | null
          facebook: string | null
          historia: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          mostrar_contacto: boolean | null
          nif_cif: string | null
          nombre_comercial: string | null
          nombre_productora: string
          num_producciones: number | null
          num_proyectos_activos: number | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono: string | null
          telefono: string | null
          tiktok: string | null
          tipo_audiovisual: boolean | null
          tipo_coproducciones_int: boolean | null
          tipo_distribucion: boolean | null
          tipo_eventos: boolean | null
          tipo_festivales: boolean | null
          tipo_gestion_cultural: boolean | null
          tipo_independiente: boolean | null
          tipo_musical: boolean | null
          tipo_teatral: boolean | null
          updated_at: string
          user_id: string
          verificado_solicitado: boolean | null
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          anio_fundacion?: number | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_corporativo?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          nif_cif?: string | null
          nombre_comercial?: string | null
          nombre_productora: string
          num_producciones?: number | null
          num_proyectos_activos?: number | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_audiovisual?: boolean | null
          tipo_coproducciones_int?: boolean | null
          tipo_distribucion?: boolean | null
          tipo_eventos?: boolean | null
          tipo_festivales?: boolean | null
          tipo_gestion_cultural?: boolean | null
          tipo_independiente?: boolean | null
          tipo_musical?: boolean | null
          tipo_teatral?: boolean | null
          updated_at?: string
          user_id: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          anio_fundacion?: number | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email_corporativo?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          nif_cif?: string | null
          nombre_comercial?: string | null
          nombre_productora?: string
          num_producciones?: number | null
          num_proyectos_activos?: number | null
          responsable_cargo?: string
          responsable_email?: string
          responsable_nombre?: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_audiovisual?: boolean | null
          tipo_coproducciones_int?: boolean | null
          tipo_distribucion?: boolean | null
          tipo_eventos?: boolean | null
          tipo_festivales?: boolean | null
          tipo_gestion_cultural?: boolean | null
          tipo_independiente?: boolean | null
          tipo_musical?: boolean | null
          tipo_teatral?: boolean | null
          updated_at?: string
          user_id?: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_productora_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_teatro: {
        Row: {
          accesibilidad_ascensor: boolean | null
          accesibilidad_bucle: boolean | null
          accesibilidad_pmr: boolean | null
          anio_fundacion: number | null
          capacidad_total: number | null
          codigo_postal: string | null
          created_at: string
          descripcion: string | null
          descripcion_tecnica: string | null
          direccion: string
          disponible_alquiler: boolean | null
          disponible_ensayos: boolean | null
          email_oficial: string | null
          facebook: string | null
          historia: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          mostrar_contacto: boolean | null
          naturaleza_juridica: string | null
          nombre_comercial: string | null
          nombre_teatro: string
          num_salas: number | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono: string | null
          telefono: string | null
          tiktok: string | null
          tipo_escenario: string | null
          updated_at: string
          url_ticketing_externo: string | null
          usa_ticketing_obrasdeteatro: boolean | null
          user_id: string
          verificado_solicitado: boolean | null
          web: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          accesibilidad_ascensor?: boolean | null
          accesibilidad_bucle?: boolean | null
          accesibilidad_pmr?: boolean | null
          anio_fundacion?: number | null
          capacidad_total?: number | null
          codigo_postal?: string | null
          created_at?: string
          descripcion?: string | null
          descripcion_tecnica?: string | null
          direccion: string
          disponible_alquiler?: boolean | null
          disponible_ensayos?: boolean | null
          email_oficial?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_teatro: string
          num_salas?: number | null
          responsable_cargo: string
          responsable_email: string
          responsable_nombre: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_escenario?: string | null
          updated_at?: string
          url_ticketing_externo?: string | null
          usa_ticketing_obrasdeteatro?: boolean | null
          user_id: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          accesibilidad_ascensor?: boolean | null
          accesibilidad_bucle?: boolean | null
          accesibilidad_pmr?: boolean | null
          anio_fundacion?: number | null
          capacidad_total?: number | null
          codigo_postal?: string | null
          created_at?: string
          descripcion?: string | null
          descripcion_tecnica?: string | null
          direccion?: string
          disponible_alquiler?: boolean | null
          disponible_ensayos?: boolean | null
          email_oficial?: string | null
          facebook?: string | null
          historia?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          mostrar_contacto?: boolean | null
          naturaleza_juridica?: string | null
          nombre_comercial?: string | null
          nombre_teatro?: string
          num_salas?: number | null
          responsable_cargo?: string
          responsable_email?: string
          responsable_nombre?: string
          responsable_telefono?: string | null
          telefono?: string | null
          tiktok?: string | null
          tipo_escenario?: string | null
          updated_at?: string
          url_ticketing_externo?: string | null
          usa_ticketing_obrasdeteatro?: boolean | null
          user_id?: string
          verificado_solicitado?: boolean | null
          web?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_teatro_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acepta_privacidad: boolean
          acepta_terminos: boolean
          activo: boolean
          apellidos: string | null
          avatar_url: string | null
          bio: string | null
          ciudad: string | null
          country_code: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          idioma: string
          info_veraz: boolean
          is_premium: boolean
          marketing_comercial: boolean
          marketing_general: boolean
          mayor_de_edad: boolean
          nombre: string
          nombre_artistico: string | null
          pais: string
          perfil_publico: boolean
          phone: string | null
          plan: Database["public"]["Enums"]["plan_suscripcion"]
          postal_code: string | null
          region: string | null
          scenaia_analisis: boolean
          scenaia_recomendaciones: boolean
          slug: string | null
          tipo_perfil: Database["public"]["Enums"]["tipo_perfil"]
          updated_at: string
          verificado: boolean
        }
        Insert: {
          acepta_privacidad?: boolean
          acepta_terminos?: boolean
          activo?: boolean
          apellidos?: string | null
          avatar_url?: string | null
          bio?: string | null
          ciudad?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          idioma?: string
          info_veraz?: boolean
          is_premium?: boolean
          marketing_comercial?: boolean
          marketing_general?: boolean
          mayor_de_edad?: boolean
          nombre: string
          nombre_artistico?: string | null
          pais?: string
          perfil_publico?: boolean
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_suscripcion"]
          postal_code?: string | null
          region?: string | null
          scenaia_analisis?: boolean
          scenaia_recomendaciones?: boolean
          slug?: string | null
          tipo_perfil?: Database["public"]["Enums"]["tipo_perfil"]
          updated_at?: string
          verificado?: boolean
        }
        Update: {
          acepta_privacidad?: boolean
          acepta_terminos?: boolean
          activo?: boolean
          apellidos?: string | null
          avatar_url?: string | null
          bio?: string | null
          ciudad?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          idioma?: string
          info_veraz?: boolean
          is_premium?: boolean
          marketing_comercial?: boolean
          marketing_general?: boolean
          mayor_de_edad?: boolean
          nombre?: string
          nombre_artistico?: string | null
          pais?: string
          perfil_publico?: boolean
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_suscripcion"]
          postal_code?: string | null
          region?: string | null
          scenaia_analisis?: boolean
          scenaia_recomendaciones?: boolean
          slug?: string | null
          tipo_perfil?: Database["public"]["Enums"]["tipo_perfil"]
          updated_at?: string
          verificado?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_profile_id: string | null
          reported_work_id: string | null
          reporter_id: string
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_profile_id?: string | null
          reported_work_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_profile_id?: string | null
          reported_work_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_work_id_fkey"
            columns: ["reported_work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          profile_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          profile_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          profile_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_orders: {
        Row: {
          buyer_id: string
          id: string
          purchased_at: string | null
          quantity: number
          status: string | null
          stripe_payment_intent_id: string | null
          ticket_id: string
          total_amount: number
        }
        Insert: {
          buyer_id: string
          id?: string
          purchased_at?: string | null
          quantity?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          ticket_id: string
          total_amount: number
        }
        Update: {
          buyer_id?: string
          id?: string
          purchased_at?: string | null
          quantity?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          ticket_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          available_quantity: number | null
          created_at: string | null
          event_id: string
          id: string
          price: number
          sale_end: string | null
          sale_start: string | null
          ticket_type: string
          total_quantity: number | null
        }
        Insert: {
          available_quantity?: number | null
          created_at?: string | null
          event_id: string
          id?: string
          price?: number
          sale_end?: string | null
          sale_start?: string | null
          ticket_type: string
          total_quantity?: number | null
        }
        Update: {
          available_quantity?: number | null
          created_at?: string | null
          event_id?: string
          id?: string
          price?: number
          sale_end?: string | null
          sale_start?: string | null
          ticket_type?: string
          total_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          document_url: string | null
          id: string
          notes: string | null
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          document_url?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          document_url?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_files: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_public: boolean | null
          work_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_public?: boolean | null
          work_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_public?: boolean | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_files_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_rights_requests: {
        Row: {
          id: string
          message: string | null
          requested_at: string | null
          requester_id: string
          responded_at: string | null
          response_message: string | null
          status: string | null
          work_id: string
        }
        Insert: {
          id?: string
          message?: string | null
          requested_at?: string | null
          requester_id: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          work_id: string
        }
        Update: {
          id?: string
          message?: string | null
          requested_at?: string | null
          requester_id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_rights_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_rights_requests_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          author: string | null
          cast_size_max: number | null
          cast_size_min: number | null
          created_at: string | null
          deleted_at: string | null
          duration_minutes: number | null
          genre: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          language: string | null
          min_age: number | null
          profile_id: string
          slug: string | null
          synopsis: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author?: string | null
          cast_size_max?: number | null
          cast_size_min?: number | null
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          min_age?: number | null
          profile_id: string
          slug?: string | null
          synopsis?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author?: string | null
          cast_size_max?: number | null
          cast_size_min?: number | null
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          min_age?: number | null
          profile_id?: string
          slug?: string | null
          synopsis?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "works_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_suscripcion: "gratuito" | "premium" | "destacado" | "empresas"
      tipo_perfil:
        | "actor"
        | "director"
        | "dramaturgo"
        | "compania"
        | "productora"
        | "teatro"
        | "festival"
        | "escuela"
        | "institucion"
        | "profesional"
        | "publico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plan_suscripcion: ["gratuito", "premium", "destacado", "empresas"],
      tipo_perfil: [
        "actor",
        "director",
        "dramaturgo",
        "compania",
        "productora",
        "teatro",
        "festival",
        "escuela",
        "institucion",
        "profesional",
        "publico",
      ],
    },
  },
} as const

