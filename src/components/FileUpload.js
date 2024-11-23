import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button,
  IconButton,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { styled } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import { processFile, validateData } from '../services/fileProcessingService';
import { setInvoices, setLoading, setError } from '../features/invoices/invoicesSlice';
import { setProducts } from '../features/products/productsSlice';
import { setCustomers } from '../features/customers/customersSlice';

const UploadContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  borderRadius: '16px',
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  border: `2px dashed ${theme.palette.primary.main}`,
  cursor: 'pointer',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.secondary.main,
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4]
  }
}));

const FilePreview = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: '8px'
}));

const FileUpload = () => {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    setFiles(acceptedFiles);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true
  });

  const processUploadedData = async (data) => {
    // Extract unique products
    const products = [...new Set(data.map(item => item.productName))].map(name => {
      const productItems = data.filter(item => item.productName === name);
      return {
        name,
        quantity: productItems.reduce((sum, item) => sum + item.quantity, 0),
        unitPrice: productItems[0].totalAmount / productItems[0].quantity,
        tax: productItems[0].tax,
        priceWithTax: (productItems[0].totalAmount / productItems[0].quantity) * (1 + productItems[0].tax / 100),
      };
    });

    // Extract unique customers
    const customers = [...new Set(data.map(item => item.customerName))].map(name => {
      const customerInvoices = data.filter(item => item.customerName === name);
      return {
        name,
        phoneNumber: '', // This would need to be extracted from the document
        totalPurchaseAmount: customerInvoices.reduce((sum, item) => sum + item.totalAmount, 0),
      };
    });

    dispatch(setInvoices(data));
    dispatch(setProducts(products));
    dispatch(setCustomers(customers));
  };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress((i / files.length) * 100);
        const data = await processFile(files[i]);
        const errors = validateData(data);

        if (errors.length > 0) {
          dispatch(setError(errors));
          continue;
        }

        await processUploadedData(data);
      }
      setProgress(100);
      setTimeout(() => {
        setFiles([]);
        setProcessing(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <UploadContainer {...getRootProps()}>
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Supported formats: PDF, Excel, Images
          </Typography>
        </UploadContainer>

        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={file.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <FilePreview elevation={2}>
                <Typography noWrap sx={{ flex: 1 }}>
                  {file.name}
                </Typography>
                <IconButton 
                  onClick={() => handleRemoveFile(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </FilePreview>
            </motion.div>
          ))}
        </AnimatePresence>

        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={handleProcess}
              disabled={processing}
              startIcon={processing ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{ mt: 2 }}
            >
              {processing ? 'Processing...' : 'Process Files'}
            </Button>
          </motion.div>
        )}

        {processing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
              Processing files... {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </motion.div>
    </Box>
  );
};

export default FileUpload;
