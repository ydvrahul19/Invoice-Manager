import React, { useState } from 'react';
import { Container, Box, Tab, Tabs, Alert, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import FileUpload from './components/FileUpload';
import InvoicesTab from './components/InvoicesTab';
import ProductsTab from './components/ProductsTab';
import CustomersTab from './components/CustomersTab';
import { selectLoading, selectError } from './features/invoices/invoicesSlice';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ marginTop: '20px' }}>
      {value === index && children}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <h1>Invoice Data Management</h1>
        <FileUpload />
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {Array.isArray(error) ? error.join(', ') : error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Invoices" />
            <Tab label="Products" />
            <Tab label="Customers" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <InvoicesTab />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <ProductsTab />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <CustomersTab />
        </TabPanel>
      </Box>
    </Container>
  );
}

export default App;
