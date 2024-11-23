import React from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const IconText = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
});

const InvoicesTab = () => {
  const { invoices, loading, error } = useSelector((state) => state.invoices);

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {Array.isArray(error) ? error.join(', ') : error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <AnimatePresence>
          {invoices.map((invoice, index) => (
            <Grid item xs={12} sm={6} md={4} key={invoice.serialNumber}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <StyledCard>
                  <CardContent>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" component="div" color="primary">
                        <IconText>
                          <ReceiptIcon />
                          {invoice.serialNumber}
                        </IconText>
                      </Typography>
                      <Chip 
                        label={`₹${invoice.totalAmount.toLocaleString()}`}
                        color="success"
                        icon={<CurrencyRupeeIcon />}
                      />
                    </Box>

                    <IconText>
                      <PersonIcon color="action" />
                      <Typography variant="body1">
                        {invoice.customerName || 'N/A'}
                      </Typography>
                    </IconText>

                    <IconText>
                      <LocalPhoneIcon color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {invoice.phoneNumber || 'N/A'}
                      </Typography>
                    </IconText>

                    <IconText>
                      <InventoryIcon color="action" />
                      <Typography variant="body2">
                        {invoice.productName} (x{invoice.quantity})
                      </Typography>
                    </IconText>

                    <IconText>
                      <CalendarTodayIcon color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {new Date(invoice.date).toLocaleDateString()}
                      </Typography>
                    </IconText>

                    {invoice.tax > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Chip 
                          label={`GST: ₹${invoice.tax.toLocaleString()}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </CardContent>
                </StyledCard>
              </motion.div>
            </Grid>
          ))}
        </AnimatePresence>
      </Grid>

      {invoices.length === 0 && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            color: 'text.secondary'
          }}
        >
          <ReceiptIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">
            No Invoices Yet
          </Typography>
          <Typography variant="body2">
            Upload some invoices to get started
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default InvoicesTab;
