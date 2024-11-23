import React from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import { selectCustomers } from '../features/customers/customersSlice';

const CustomersTab = () => {
  const customers = useSelector(selectCustomers);

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Customers
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Customer Name</TableCell>
            <TableCell>Phone Number</TableCell>
            <TableCell>Total Purchase Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.name}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.phoneNumber || 'N/A'}</TableCell>
              <TableCell>${customer.totalPurchaseAmount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CustomersTab;
