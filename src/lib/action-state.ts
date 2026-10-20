// Client-safe type shared by server actions and forms.
export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
  /** bumps on every completed submission so forms can react (reset, close dialogs) */
  stamp?: number;
};

export const initialState: ActionState = { ok: false };
