import { styled } from '@mui/material/styles';
import { Paper, Box, Card } from '@mui/material';

// FileUpload component styles
export const UploadContainer = styled(Paper)(({ theme }) => ({
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

export const FilePreview = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: '8px',
  backgroundColor: theme.palette.background.paper,
  transition: 'background-color 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));

// InvoicesTab component styles
export const InvoiceCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

export const IconText = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
});

// Common layout components
export const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1200px',
  margin: '0 auto',
}));

export const FlexContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
}));

export const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
}));

// Animation keyframes
export const fadeInAnimation = {
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
};

// Responsive styles
export const responsiveStyles = {
  mobile: {
    padding: '1rem',
    fontSize: '14px',
  },
  tablet: {
    padding: '1.5rem',
    fontSize: '16px',
  },
  desktop: {
    padding: '2rem',
    fontSize: '16px',
  },
};

// Theme-aware styled components
export const ThemeAwareContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  color: theme.palette.text.primary,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: responsiveStyles.mobile,
  [theme.breakpoints.between('sm', 'md')]: responsiveStyles.tablet,
  [theme.breakpoints.up('md')]: responsiveStyles.desktop,
}));

// Custom animations
export const slideInAnimation = {
  '@keyframes slideIn': {
    from: {
      transform: 'translateX(-100%)',
    },
    to: {
      transform: 'translateX(0)',
    },
  },
};

export const AnimatedContainer = styled(Box)(({ theme }) => ({
  animation: 'slideIn 0.3s ease-out',
  ...slideInAnimation,
}));
