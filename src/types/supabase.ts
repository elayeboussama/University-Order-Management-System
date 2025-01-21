export interface Database {
    public: {
      Tables: {
        orders: {
          Row: {
            id: string
            title: string
            description: string
            submitted_by: string
            submitted_at: string
            status: 'pending' | 'approved' | 'rejected' | 'processing'
            document_path: string
            department: string
            notes: string | null
          }
        }
        profiles: {
          Row: {
            id: string
            full_name: string
            role: 'staff' | 'director' | 'secretary' | 'responsible'
            department: string
          }
        }
        signatures: {
          Row: {
            id: string
            order_id: string
            user_id: string
            signature_data: string
            created_at: string
          }
        }
      }
    }
  }