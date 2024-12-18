# 📊 Swipe Invoice Manager

> A modern, intelligent invoice processing system with advanced multi-format data extraction capabilities. Live demo: [https://invoice-manager-87b17.web.app](https://invoice-manager-87b17.web.app)

## 🌟 Features

- 📱 Intelligent phone number extraction with Indian format support
- 📄 Multi-format file processing (PDF, Excel, Images)
- 🎯 Advanced data extraction with pattern recognition
- 💫 Modern UI with Material Design and smooth animations
- 📊 Interactive dashboard with data visualization
- 🔍 Smart search and filtering capabilities
- 📱 Fully responsive design for all devices

## Tech Stack

- React
- Redux Toolkit
- Material-UI (MUI)
- Framer Motion
- PDF.js
- Tesseract.js

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/ydvrahul19/swipe-invoice-manager.git
```

2. Install dependencies:
```bash
cd swipe-invoice-manager
npm install
```

3. Run the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Usage

1. Drag and drop your invoice files (PDF, Excel, or Images) into the upload area
2. The application will automatically extract:
   - Invoice number
   - Customer details
   - Phone numbers
   - Product information
   - Amounts and taxes
3. View and manage extracted data in the respective tabs

## Project Structure

```
src/
├── components/          # React components
├── features/           # Redux slices and reducers
├── services/           # Business logic and API services
├── styles/             # Theme and component styles
└── utils/             # Helper functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🚀 Deployment

The application is deployed and accessible at:
- **Live Demo**: [https://invoice-manager-87b17.web.app](https://invoice-manager-87b17.web.app)
- **Firebase Console**: [https://console.firebase.google.com/project/invoice-manager-87b17/overview](https://console.firebase.google.com/project/invoice-manager-87b17/overview)

### Deployment Instructions

To deploy new changes to Firebase:

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF processing
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR capabilities
- [Material-UI](https://mui.com/) for the UI components
- [Framer Motion](https://www.framer.com/motion/) for animations