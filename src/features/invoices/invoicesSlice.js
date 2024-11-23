import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  invoices: [],
  loading: false,
  error: null,
};

export const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    addInvoice: (state, action) => {
      state.invoices.push(action.payload);
    },
    updateInvoice: (state, action) => {
      const index = state.invoices.findIndex(invoice => invoice.serialNumber === action.payload.serialNumber);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
    },
    setInvoices: (state, action) => {
      state.invoices = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { addInvoice, updateInvoice, setInvoices, setLoading, setError } = invoicesSlice.actions;
export const selectInvoices = (state) => state.invoices.invoices;
export const selectLoading = (state) => state.invoices.loading;
export const selectError = (state) => state.invoices.error;

export default invoicesSlice.reducer;
