import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  customers: [],
  loading: false,
  error: null,
};

export const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    addCustomer: (state, action) => {
      state.customers.push(action.payload);
    },
    updateCustomer: (state, action) => {
      const index = state.customers.findIndex(customer => customer.name === action.payload.name);
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
    },
    setCustomers: (state, action) => {
      state.customers = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { addCustomer, updateCustomer, setCustomers, setLoading, setError } = customersSlice.actions;
export const selectCustomers = (state) => state.customers.customers;
export const selectLoading = (state) => state.customers.loading;
export const selectError = (state) => state.customers.error;

export default customersSlice.reducer;
