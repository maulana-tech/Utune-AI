import { create } from 'zustand';

/**
 * Which lead the detail panel is showing. Used to be part of the map store —
 * the map is gone, the selection bus stayed.
 */
interface LeadState {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
}

export const useLeadStore = create<LeadState>((set) => ({
  selectedLeadId: null,
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
}));
