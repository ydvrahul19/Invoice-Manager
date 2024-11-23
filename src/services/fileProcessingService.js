import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist';
import 'pdfjs-dist/legacy/build/pdf.worker.entry';

// Helper functions
const cleanOCRText = (text) => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\b[A-Z]\s+(?=[A-Z])/g, '$&')  // Handle spaced capital letters
    .trim();
};

const cleanProductName = (name) => {
  if (!name) return 'Unknown Product';
  
  // Remove common OCR artifacts and headers
  const cleanedName = name
    .replace(/T\s*A\s*X\s*I\s*N\s*V\s*O\s*I\s*C\s*E/gi, '')
    .replace(/O\s*R\s*I\s*G\s*I\s*N\s*A\s*L/gi, '')
    .replace(/F\s*O\s*R\s*R\s*E\s*C\s*I\s*P\s*I\s*E\s*N\s*T/gi, '')
    .replace(/I\s*N\s*V\s*O\s*I\s*C\s*E/gi, '')
    .trim();

  return cleanedName || 'Unknown Product';
};

const extractNumber = (text) => {
  const decimalMatch = text.match(/\d+[.,]\d+/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[0].replace(',', '.'));
  }
  
  const wholeMatch = text.match(/\d+/);
  if (wholeMatch) {
    return parseInt(wholeMatch[0], 10);
  }
  
  return null;
};

const findValueInLines = (lines, patterns, type = 'text') => {
  for (const pattern of patterns) {
    for (const line of lines) {
      if (pattern.test(line)) {
        const matchedLine = line.toLowerCase();
        // Remove the matched pattern and any special characters
        const value = line.replace(pattern, '')
          .replace(/[:：]/g, '')
          .trim();

        if (type === 'number') {
          const number = extractNumber(value);
          if (number !== null) {
            return number;
          }
          const lineNumber = extractNumber(matchedLine);
          if (lineNumber !== null) {
            return lineNumber;
          }
        } else if (type === 'currency') {
          const currencyMatch = value.match(/[\$€£]?\s*\d+([.,]\d{2})?/);
          if (currencyMatch) {
            return parseFloat(currencyMatch[0].replace(/[^\d.]/g, ''));
          }
        } else {
          return value;
        }
      }
    }
  }
  return type === 'number' ? 0 : '';
};

const cleanPDFText = (text) => {
  if (!text) return '';
  
  // Remove form feed characters and normalize whitespace
  let cleaned = text.replace(/\f/g, '\n')
                   .replace(/\r\n/g, '\n')
                   .replace(/\r/g, '\n');
  
  // Remove extra whitespace between words
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Split into lines and clean each line
  const lines = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0); // Remove empty lines
  
  return lines;
};

const extractInvoiceData = (lines) => {
  // Enhanced patterns for invoice data extraction
  const patterns = {
    invoiceNumber: [
      /invoice\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i,
      /bill\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i,
      /ref\.?\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i
    ],
    customerName: [
      /(?:bill|ship|sold)\s*to\s*:?\s*([^,\n]+)/i,
      /customer\s*:?\s*([^,\n]+)/i,
      /name\s*:?\s*([^,\n]+)/i,
      /M\/s\.?\s*([^,\n]+)/i,
      /attention\s*:?\s*([^,\n]+)/i,
      /party\s*:?\s*([^,\n]+)/i
    ],
    productName: [
      /(?:item|product|service)\s*description\s*:?\s*([^,\n]+)/i,
      /particulars?\s*:?\s*([^,\n]+)/i,
      /description\s*:?\s*([^,\n]+)/i,
      /goods\s*:?\s*([^,\n]+)/i
    ],
    amount: [
      /(?:total|grand|net)\s*amount\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
      /amount\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
      /total\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
      /(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)\s*(?:only|total)/i
    ],
    quantity: [
      /quantity\s*:?\s*(\d+)/i,
      /qty\s*:?\s*(\d+)/i,
      /units?\s*:?\s*(\d+)/i,
      /pieces?\s*:?\s*(\d+)/i
    ]
  };

  // Helper function to find value using patterns
  const findValue = (patterns, text, type = 'text') => {
    for (const pattern of patterns) {
      for (const line of text) {
        if (pattern.test(line)) {
          const matchedLine = line.toLowerCase();
          // Remove the matched pattern and any special characters
          const value = line.replace(pattern, '')
            .replace(/[:：]/g, '')
            .trim();

          if (type === 'number') {
            const number = extractNumber(value);
            if (number !== null) {
              return number;
            }
            const lineNumber = extractNumber(matchedLine);
            if (lineNumber !== null) {
              return lineNumber;
            }
          } else if (type === 'currency') {
            const currencyMatch = value.match(/[\$€£]?\s*\d+([.,]\d{2})?/);
            if (currencyMatch) {
              return parseFloat(currencyMatch[0].replace(/[^\d.]/g, ''));
            }
          } else {
            return value;
          }
        }
      }
    }
    return type === 'number' ? 0 : '';
  };

  // Enhanced customer name extraction
  const extractCustomerName = (lines) => {
    console.log('Starting customer name extraction. Lines:', lines); // Debug log

    // Clean and validate a name
    const cleanName = (name) => {
      if (!name) return null;
      return name
        .replace(/^(?:M\/s\.?|Messrs\.?|To:|Name:|Buyer:|Consignee:|Bill To:|Ship To:)\s*/i, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s*(?:address|gstin|phone|email|:|\n|$).*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Validate a name
    const isValidName = (name) => {
      if (!name || name.length < 2 || name.length > 100) return false;
      return /[A-Za-z]/.test(name) && 
             !/^\d+$/.test(name) &&
             !/^(?:invoice|tax|bill|total|amount|product|description)$/i.test(name);
    };

    // Try specific patterns first
    const patterns = [
      /buyer\s*\(if\s*other\s*than\s*consignee\)\s*:?\s*([^:\n]+)/i,
      /buyer\s*:?\s*([^:\n]+)/i,
      /consignee\s*:?\s*([^:\n]+)/i,
      /bill\s*to\s*:?\s*([^:\n]+)/i,
      /ship\s*to\s*:?\s*([^:\n]+)/i,
      /name\s*:?\s*([^:\n]+)/i,
      /customer\s*:?\s*([^:\n]+)/i,
      /M\/s\.?\s*([^:\n]+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/  // "Navya Sri" format
    ];

    // Check each pattern
    for (const pattern of patterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const name = cleanName(match[1]);
          if (isValidName(name)) {
            console.log('Found customer name using pattern:', pattern, '-> Name:', name); // Debug log
            return name;
          }
        }
      }
    }

    // Look for proper names in first few lines
    const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/;
    for (const line of lines.slice(0, 10)) {
      const match = line.match(namePattern);
      if (match && match[1]) {
        const name = cleanName(match[1]);
        if (isValidName(name)) {
          console.log('Found customer name in first few lines:', line); // Debug log
          return name;
        }
      }
    }

    console.log('No valid customer name found'); // Debug log
    return '';
  };

  // Find the first non-empty line that looks like a product description
  const findProductDescription = (lines) => {
    const productLine = lines.find(line => {
      const isReasonableLength = line.length > 5 && line.length < 200;
      const startsWithLetter = /^[A-Za-z]/.test(line);
      const isNotHeader = !/invoice|bill|total|amount|tax|date/i.test(line);
      const hasNoSpecialChars = /^[\w\s,.-]+$/.test(line);
      return isReasonableLength && startsWithLetter && isNotHeader && hasNoSpecialChars;
    });
    return productLine || '';
  };

  // Extract values
  const invoiceNumber = findValue(patterns.invoiceNumber, lines, 'text') || `INV-${Date.now()}`;
  const customerName = extractCustomerName(lines);
  let productName = findValue(patterns.productName, lines, 'text');
  
  // If no product name found, try to find a reasonable description
  if (!productName) {
    productName = findProductDescription(lines);
  }

  // Parse amount and quantity
  let amount = 0;
  const amountStr = findValue(patterns.amount, lines, 'text');
  if (amountStr) {
    amount = parseFloat(amountStr.replace(/,/g, ''));
  }

  let quantity = 1;
  const qtyStr = findValue(patterns.quantity, lines, 'text');
  if (qtyStr) {
    quantity = parseInt(qtyStr, 10);
  }

  return {
    serialNumber: invoiceNumber,
    customerName: customerName || 'Customer',
    productName: productName || 'Product',
    quantity: quantity || 1,
    totalAmount: amount || 0,
    date: new Date().toISOString()
  };
};

const processExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // First try with header: 1 to get raw rows
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          defval: ''
        });
        
        // Remove empty rows
        jsonData = jsonData.filter(row => row.some(cell => cell !== ''));
        
        console.log('Raw Excel Data (first 3 rows):', jsonData.slice(0, 3));
        
        // Try to identify the header row by looking for common column names
        let headerRow = -1;
        const headerPatterns = [
          /product|item|description|particular/i,
          /customer|client|buyer|party|name/i,
          /quantity|qty|units|pieces/i,
          /amount|total|price|value/i
        ];
        
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row.some(cell => 
            headerPatterns.some(pattern => 
              cell && pattern.test(cell.toString().trim())
            )
          )) {
            headerRow = i;
            break;
          }
        }
        
        // If no header row found, try parsing without headers
        if (headerRow === -1) {
          console.log('No header row found, using default column mapping');
          // Try to parse the data assuming fixed columns
          const processedData = jsonData.map((row, index) => ({
            serialNumber: (row[0] || `INV-${index + 1}`).toString(),
            customerName: (row[1] || 'Customer').toString(),
            productName: (row[2] || 'Product').toString(),
            quantity: parseFloat(row[3]) || 1,
            tax: parseFloat(row[4]) || 0,
            totalAmount: calculateTotalAmount(row, 5),
            date: row[6] || new Date().toISOString()
          }));
          resolve(processedData);
          return;
        }
        
        // Get headers and normalize them
        const headers = jsonData[headerRow].map(h => h ? h.toString().toLowerCase().trim() : '');
        console.log('Found Headers:', headers);
        
        // Find column indices with more variations
        const findColumnIndex = (patterns) => {
          return headers.findIndex(header => 
            header && patterns.some(pattern => pattern.test(header))
          );
        };
        
        const columnIndices = {
          serialNumber: findColumnIndex([
            /^(serial.*no|invoice.*no|bill.*no|s\.?\s*no|no|number|id|reference)$/i
          ]),
          customerName: findColumnIndex([
            /^(customer.*name|client.*name|buyer.*name|bill.*to|party.*name|name.*of.*customer|customer|client|buyer|name|sold.*to|party)$/i
          ]),
          productName: findColumnIndex([
            /^(product.*name|item.*name|description|item.*description|product|item|goods|particular|service|material|prod.*desc|item.*desc)$/i
          ]),
          quantity: findColumnIndex([
            /^(quantity|qty|units|pieces|pcs|count|nos|number|qnty)$/i
          ]),
          unitPrice: findColumnIndex([
            /^(unit.*price|price.*per.*unit|rate|unit.*rate|unit.*value|price|unit)$/i
          ]),
          tax: findColumnIndex([
            /^(tax.*amount|tax|vat|gst|tax.*rate|vat.*amount|gst.*amount|tax.*value)$/i
          ]),
          totalAmount: findColumnIndex([
            /^(total.*amount|amount|total|grand.*total|net.*amount|final.*amount|price|value|sum|net|gross.*amount|payable)$/i
          ]),
          date: findColumnIndex([
            /^(date|invoice.*date|bill.*date|transaction.*date|doc.*date)$/i
          ])
        };
        
        console.log('Column Indices:', columnIndices);
        
        // Process data rows with more flexible validation
        const processedData = [];
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell)) continue;
          
          const getValue = (index, defaultValue = '') => {
            if (index === -1) return defaultValue;
            const value = row[index];
            return value !== undefined && value !== null ? value.toString().trim() : defaultValue;
          };
          
          const getNumber = (index, defaultValue = 0) => {
            if (index === -1) return defaultValue;
            const value = row[index];
            if (!value) return defaultValue;
            
            // Handle Excel number formats
            let numStr = value.toString()
              .replace(/[^0-9.,\-]/g, '') // Remove non-numeric chars except . , -
              .replace(/,(\d{2})$/, '.$1') // Convert last comma before 2 digits to decimal point
              .replace(/,/g, ''); // Remove remaining commas
            
            const number = parseFloat(numStr);
            return isNaN(number) ? defaultValue : Math.abs(number);
          };
          
          // Get unit price and quantity for total amount calculation
          const unitPrice = getNumber(columnIndices.unitPrice);
          const quantity = getNumber(columnIndices.quantity, 1);
          const tax = getNumber(columnIndices.tax, 0);
          
          // Calculate total amount with different strategies
          let totalAmount = getNumber(columnIndices.totalAmount);
          
          // If total amount is 0 or invalid, try to calculate it
          if (totalAmount <= 0) {
            if (unitPrice > 0) {
              // Calculate from unit price and quantity
              totalAmount = unitPrice * quantity;
            } else {
              // Try to find a number in any remaining columns that could be the total
              for (let j = 0; j < row.length; j++) {
                if (!Object.values(columnIndices).includes(j)) {
                  const possibleAmount = getNumber(j);
                  if (possibleAmount > totalAmount) {
                    totalAmount = possibleAmount;
                  }
                }
              }
            }
            
            // Add tax if available
            if (tax > 0) {
              totalAmount += (totalAmount * (tax / 100));
            }
          }
          
          const rowData = {
            serialNumber: getValue(columnIndices.serialNumber, `INV-${i}`),
            customerName: getValue(columnIndices.customerName, 'Customer'),
            productName: getValue(columnIndices.productName, 'Product'),
            quantity: quantity,
            tax: tax,
            totalAmount: totalAmount || 0,
            date: getValue(columnIndices.date, new Date().toISOString())
          };
          
          // More flexible validation
          if (rowData.quantity <= 0) rowData.quantity = 1;
          if (!rowData.customerName) rowData.customerName = 'Customer';
          if (!rowData.productName) rowData.productName = 'Product';
          if (rowData.totalAmount <= 0) rowData.totalAmount = quantity * 100; // Default unit price of 100 if no price found
          
          processedData.push(rowData);
        }
        
        console.log('Processed Excel data:', processedData);
        resolve(processedData);
      } catch (error) {
        console.error('Excel processing error:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const calculateTotalAmount = (row, totalIndex) => {
  // Try to get total amount directly
  let total = parseFloat(row[totalIndex]);
  if (!isNaN(total) && total > 0) return total;
  
  // Try to calculate from quantity and unit price
  const quantity = parseFloat(row[3]) || 1;
  const unitPrice = parseFloat(row[4]) || 0;
  if (unitPrice > 0) {
    total = quantity * unitPrice;
    // Add tax if available
    const tax = parseFloat(row[5]) || 0;
    if (tax > 0) {
      total += (total * (tax / 100));
    }
    return total;
  }
  
  // Default calculation
  return quantity * 100; // Default unit price of 100
};

const processPDFFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let textLines = [];

    // Get text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Process each text item with its position
      const textItems = textContent.items.map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]), // x position
        y: Math.round(item.transform[5])  // y position
      }));

      // Sort items by y position (top to bottom) and then x position (left to right)
      textItems.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.x - b.x;
      });

      // Group items into lines based on y position with smaller threshold
      let currentY = textItems[0]?.y;
      let currentLine = [];

      textItems.forEach(item => {
        if (!item.text) return; // Skip empty strings

        // Use a smaller threshold (2 instead of 5) for more precise line grouping
        if (Math.abs(item.y - currentY) > 2) {
          if (currentLine.length > 0) {
            const lineText = currentLine.map(i => i.text).join(' ').trim();
            if (lineText) {
              textLines.push(lineText);
              console.log('Added line:', lineText); // Debug log
            }
          }
          currentLine = [item];
          currentY = item.y;
        } else {
          // Only add a space if items are actually separate
          if (currentLine.length > 0 && item.x - (currentLine[currentLine.length - 1].x + currentLine[currentLine.length - 1].text.length * 5) > 10) {
            currentLine.push({ text: ' ', x: 0, y: 0 });
          }
          currentLine.push(item);
        }
      });

      // Add the last line if any
      if (currentLine.length > 0) {
        const lineText = currentLine.map(i => i.text).join('').trim();
        if (lineText) {
          textLines.push(lineText);
          console.log('Added last line:', lineText); // Debug log
        }
      }
    }

    // Clean the text lines and ensure it's an array
    if (!Array.isArray(textLines)) {
      console.warn('textLines is not an array, converting to array');
      textLines = String(textLines).split('\n');
    }

    textLines = textLines
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log('Extracted PDF Lines:', textLines); // Debug log

    // Extract invoice data
    const invoiceData = await extractInvoiceDataFromPDF(textLines);
    
    return {
      success: true,
      data: invoiceData
    };
  } catch (error) {
    console.error('Error processing PDF file:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const extractInvoiceDataFromPDF = async (lines) => {
  try {
    // Ensure lines is an array
    if (!Array.isArray(lines)) {
      console.warn('Input is not an array, converting to array');
      lines = String(lines).split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }

    // Extract each field
    const serialNumber = extractSerialNumber(lines) || `INV-${Date.now()}`;
    const customerName = extractCustomerName(lines) || 'Unknown Customer';
    const productNames = extractProductNames(lines) || [];
    const date = extractDate(lines) || new Date().toISOString().split('T')[0];
    const phoneNumber = extractPhoneNumber(lines) || '';
    const quantity = extractQuantity(lines) || 1;
    const amount = extractAmount(lines) || 0;

    // Debug logs
    console.log('Extracted Raw Data:', {
      serialNumber,
      customerName,
      productNames,
      date,
      phoneNumber,
      quantity,
      amount
    });

    // Construct invoice data object with default values
    const invoiceData = {
      serialNumber,
      customerName,
      productName: productNames.length > 0 ? productNames[0] : 'Unknown Product',
      productNames,
      date,
      phoneNumber,
      quantity,
      amount
    };

    // Validate the extracted data
    const validatedData = validateData(invoiceData);
    console.log('Final Validated Data:', validatedData);
    return validatedData;
  } catch (error) {
    console.error('Error extracting data from PDF:', error);
    // Return default data on error
    return validateData({});
  }
};

const processImageFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        // Create worker without custom logger
        const worker = await createWorker();
        
        // Initialize worker with better quality settings
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-$%/ ',
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: '1',
        });
        
        console.log('Starting OCR processing...'); // Debug log
        const { data: { text } } = await worker.recognize(e.target.result);
        console.log('OCR processing complete'); // Debug log
        await worker.terminate();
        
        console.log('Extracted Text:', text); // Debug log
        
        // Split into lines and clean up
        const lines = text.split(/[\n\r]+/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        console.log('Cleaned Lines:', lines); // Debug log
        
        // Enhanced pattern matching for invoice data
        const patterns = {
          customerName: [
            /bill\s*to\s*:?\s*([^:\n]+)/i,
            /ship\s*to\s*:?\s*([^:\n]+)/i,
            /consignee\s*:?\s*([^:\n]+)/i,
            /buyer\s*:?\s*([^:\n]+)/i,
            /customer\s*:?\s*([^:\n]+)/i,
            /name\s*:?\s*([^:\n]+)/i,
            /M\/s\.?\s*([^:\n]+)/i
          ],
          productName: [
            /item\s*:?\s*([^:\n]+)/i,
            /product\s*:?\s*([^:\n]+)/i,
            /description\s*:?\s*([^:\n]+)/i,
            /service\s*:?\s*([^:\n]+)/i,
            /goods\s*:?\s*([^:\n]+)/i,
            /particular\s*:?\s*([^:\n]+)/i
          ],
          quantity: [
            /quantity\s*:?\s*(\d+)/i,
            /qty\s*:?\s*(\d+)/i,
            /units?\s*:?\s*(\d+)/i,
            /pieces?\s*:?\s*(\d+)/i,
            /pcs\s*:?\s*(\d+)/i
          ],
          amount: [
            /total\s*amount\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /amount\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /total\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /sum\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /price\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i
          ],
          tax: [
            /tax\s*amount\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /tax\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /vat\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i,
            /gst\s*:?\s*[\$€£]?\s*([\d,]+\.?\d*)/i
          ]
        };
        
        // Function to find value using multiple patterns
        const findValue = (patterns, text, type = 'text') => {
          for (const pattern of patterns) {
            for (const line of text) {
              const match = line.match(pattern);
              if (match) {
                console.log('Found match with pattern:', pattern, 'Match:', match);
                // Get the captured group (the actual value)
                const value = match[1];
                if (value) return value;
              }
            }
          }
          return type === 'number' ? 0 : '';
        };
        
        // Find numbers in text
        const findNumbers = (text) => {
          const matches = text.match(/\d+([.,]\d{2})?/g);
          if (!matches) return [];
          return matches.map(num => parseFloat(num.replace(',', '.')));
        };
        
        // Extract customer name with context
        let customerName = findValue(patterns.customerName, lines, 'text');
        if (!customerName) {
          // Look for lines that might contain a name (capitalized words)
          const namePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/;
          for (const line of lines.slice(0, 10)) { // Check first 10 lines
            if (namePattern.test(line)) {
              customerName = line.trim();
              break;
            }
          }
        }
        
        // Extract product name with context
        let productName = findValue(patterns.productName, lines, 'text');
        if (!productName) {
          // Look for lines that might be product descriptions
          const descPattern = /^[\w\s\-&]+$/;
          for (const line of lines) {
            if (descPattern.test(line) && line.length > 10 && !/invoice|tax|bill|total|amount|customer|address/i.test(line)) {
              productName = line.trim();
              break;
            }
          }
        }
        
        // Find quantity
        let quantity = 1;
        const qtyStr = findValue(patterns.quantity, lines, 'text');
        if (qtyStr) {
          const nums = findNumbers(qtyStr);
          if (nums.length > 0) quantity = nums[0];
        }
        
        // Find total amount
        let totalAmount = 0;
        const amountStr = findValue(patterns.amount, lines, 'text');
        if (amountStr) {
          const nums = findNumbers(amountStr);
          if (nums.length > 0) totalAmount = nums[0];
        }
        
        // If no total amount found, look for the largest number that could be an amount
        if (totalAmount === 0) {
          const allNumbers = [];
          lines.forEach(line => {
            const nums = findNumbers(line);
            allNumbers.push(...nums);
          });
          if (allNumbers.length > 0) {
            totalAmount = Math.max(...allNumbers);
          }
        }
        
        // Find tax
        let tax = 0;
        const taxStr = findValue(patterns.tax, lines, 'text');
        if (taxStr) {
          const nums = findNumbers(taxStr);
          if (nums.length > 0) tax = nums[0];
        }
        
        const invoiceData = {
          serialNumber: `INV-${Date.now()}`,
          customerName: customerName || 'Customer',
          productName: productName || 'Product',
          quantity: quantity,
          tax: tax,
          totalAmount: totalAmount || (quantity * 100), // Default price of 100 if no amount found
          date: new Date().toISOString()
        };
        
        console.log('Extracted Invoice Data:', invoiceData); // Debug log
        resolve([invoiceData]);
        
      } catch (error) {
        console.error('Image processing error:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const validateData = (data) => {
  console.log('Validating data:', data);

  // Create a new object with default values
  const validatedData = {
    serialNumber: data?.serialNumber || `INV-${Date.now()}`,
    customerName: cleanOCRText(data?.customerName) || 'Unknown Customer',
    productName: '',  // Will be set based on productNames
    productNames: [],
    date: data?.date || new Date().toISOString().split('T')[0],
    phoneNumber: data?.phoneNumber || 'N/A',
    quantity: parseInt(data?.quantity) || 1,
    amount: parseFloat(data?.amount) || 0,
    tax: parseFloat(data?.tax) || 0,
    totalAmount: parseFloat(data?.totalAmount) || 0
  };

  // Handle product names
  if (Array.isArray(data?.productNames) && data.productNames.length > 0) {
    // Clean each product name
    validatedData.productNames = data.productNames
      .map(name => cleanProductName(name))
      .filter(name => name && name !== 'Unknown Product');
  } else if (data?.productName) {
    // If we have a single product name
    const cleanedName = cleanProductName(data.productName);
    if (cleanedName && cleanedName !== 'Unknown Product') {
      validatedData.productNames = [cleanedName];
    }
  }

  // If we still don't have any product names, try to extract from raw text
  if (validatedData.productNames.length === 0 && data?.rawText) {
    const lines = data.rawText.split('\n');
    validatedData.productNames = extractProductNames(lines);
  }

  // Set the main productName to the first valid product name
  validatedData.productName = validatedData.productNames[0] || 'Unknown Product';

  // Clean and validate other fields
  validatedData.serialNumber = validatedData.serialNumber.trim();
  validatedData.customerName = validatedData.customerName.trim();
  validatedData.phoneNumber = validatedData.phoneNumber.trim();

  // Ensure quantity is positive
  validatedData.quantity = Math.max(1, validatedData.quantity);

  // Ensure amount and tax are non-negative
  validatedData.amount = Math.max(0, validatedData.amount);
  validatedData.tax = Math.max(0, validatedData.tax);

  // Calculate total amount if not provided
  if (!validatedData.totalAmount) {
    const subtotal = validatedData.amount * validatedData.quantity;
    const taxAmount = subtotal * (validatedData.tax / 100);
    validatedData.totalAmount = subtotal + taxAmount;
  }

  console.log('Validated Data:', validatedData);
  return validatedData;
};

const extractSerialNumber = (lines) => {
  const patterns = [
    /invoice\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i,
    /bill\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i,
    /ref\.?\s*no\.?\s*:?\s*([A-Za-z0-9\-\/]+)/i
  ];

  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  return `INV-${Date.now()}`;
};

const extractCustomerName = (lines) => {
  // Clean and validate a name
  const cleanName = (name) => {
    if (!name) return null;
    return name
      .replace(/^(?:M\/s\.?|Messrs\.?|To:|Name:|Buyer:|Consignee:|Bill To:|Ship To:)\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s*(?:address|gstin|phone|email|:|\n|$).*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Validate a name
  const isValidName = (name) => {
    if (!name || name.length < 2 || name.length > 100) return false;
    return /[A-Za-z]/.test(name) && 
           !/^\d+$/.test(name) &&
           !/^(?:invoice|tax|bill|total|amount|product|description)$/i.test(name);
  };

  // Try specific patterns first
  const patterns = [
    /buyer\s*\(if\s*other\s*than\s*consignee\)\s*:?\s*([^:\n]+)/i,
    /buyer\s*:?\s*([^:\n]+)/i,
    /consignee\s*:?\s*([^:\n]+)/i,
    /bill\s*to\s*:?\s*([^:\n]+)/i,
    /ship\s*to\s*:?\s*([^:\n]+)/i,
    /name\s*:?\s*([^:\n]+)/i,
    /customer\s*:?\s*([^:\n]+)/i,
    /M\/s\.?\s*([^:\n]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/  // "Navya Sri" format
  ];

  // Check each pattern
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const name = cleanName(match[1]);
        if (isValidName(name)) {
          return name;
        }
      }
    }
  }

  // Look for proper names in first few lines
  const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/;
  for (const line of lines.slice(0, 10)) {
    const match = line.match(namePattern);
    if (match && match[1]) {
      const name = cleanName(match[1]);
      if (isValidName(name)) {
        return name;
      }
    }
  }

  return 'Customer';
};

const isValidCustomerName = (name) => {
  if (!name) return false;

  // Remove common prefixes and clean the name
  name = name
    .replace(/^(?:M\/s\.?|Messrs\.?|To:|Name:|Buyer:|Consignee:)\s*/i, '')
    .replace(/\([^)]*\)/g, '')  // Remove text in parentheses
    .trim();

  const isReasonableLength = name.length >= 2 && name.length <= 100;
  const hasLetters = /[A-Za-z]/.test(name);
  const isNotNumeric = !/^\d+$/.test(name);
  const isNotGenericWord = !/^(?:invoice|tax|bill|total|amount|product|description)$/i.test(name);
  const hasProperCase = /[A-Z][a-z]/.test(name) || /[A-Z\s]+/.test(name);

  return isReasonableLength && 
         hasLetters && 
         isNotNumeric && 
         isNotGenericWord &&
         hasProperCase;
};

const extractProductName = (lines) => {
  // Clean and validate product name
  const cleanProduct = (text) => {
    if (!text) return null;
    return text
      .replace(/^\d+[\s.-]*/, '')  // Remove leading numbers
      .replace(/\([^)]*\)/g, '')   // Remove parentheses content
      .replace(/\s+/g, ' ')        // Normalize spaces
      .trim();
  };

  // Validate product name
  const isValidProduct = (name) => {
    if (!name || name.length < 2 || name.length > 200) return false;
    return /[A-Za-z]/.test(name) && 
           !/^(?:invoice|tax|bill|total|amount|product|description)$/i.test(name) &&
           !/^[\d.,\s]+$/.test(name);
  };

  // First try specific product patterns
  const productPatterns = [
    /product\s*description\s*:?\s*([^:\n]+)/i,
    /product\s*details?\s*:?\s*([^:\n]+)/i,
    /product\s*name\s*:?\s*([^:\n]+)/i,
    /product\s*:?\s*([^:\n]+)/i,
    /item\s*description\s*:?\s*([^:\n]+)/i,
    /description\s*of\s*goods\s*:?\s*([^:\n]+)/i,
    /description\s*:?\s*([^:\n]+)/i,
    /particulars?\s*:?\s*([^:\n]+)/i,
    /goods\s*:?\s*([^:\n]+)/i,
    /service\s*:?\s*([^:\n]+)/i
  ];

  // Try each pattern
  for (const pattern of productPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const product = cleanProduct(match[1]);
        if (isValidProduct(product)) {
          return product;
        }
      }
    }
  }

  // Look for product in table format
  const tableHeaders = /(?:description|product|item|particular|goods)/i;
  let foundHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (tableHeaders.test(line)) {
      foundHeader = true;
      continue;
    }

    if (foundHeader && lines[i + 1]) {
      const product = cleanProduct(lines[i + 1]);
      if (isValidProduct(product)) {
        return product;
      }
    }
  }

  return 'Product';
};

const extractDate = (lines) => {
  // Common date formats
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(?:date|dated|dt)?\s*:?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
    // YYYY/MM/DD or YYYY-MM-DD
    /(?:date|dated|dt)?\s*:?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i,
    // Month DD, YYYY
    /(?:date|dated|dt)?\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
    // DD Month YYYY
    /(?:date|dated|dt)?\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
  ];

  for (const pattern of datePatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const date = parseDate(dateStr);
        if (date && isValidDate(date)) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  }

  return new Date().toISOString().split('T')[0]; // Default to current date
};

const parseDate = (dateStr) => {
  try {
    // Remove any leading/trailing spaces and common prefixes
    dateStr = dateStr.replace(/^(?:date|dated|dt)\s*:?\s*/i, '').trim();

    // Try parsing different formats
    if (dateStr.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/)) {
      // DD/MM/YYYY or DD-MM-YYYY
      const [day, month, year] = dateStr.split(/[-/.]/);
      return new Date(normalizeYear(year), month - 1, day);
    } else if (dateStr.match(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/)) {
      // YYYY/MM/DD or YYYY-MM-DD
      const [year, month, day] = dateStr.split(/[-/.]/);
      return new Date(year, month - 1, day);
    } else {
      // Try standard Date parsing for other formats
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }
  return null;
};

const normalizeYear = (year) => {
  if (year.length === 2) {
    const currentYear = new Date().getFullYear();
    const century = Math.floor(currentYear / 100) * 100;
    const twoDigitYear = parseInt(year, 10);
    // If the two-digit year is greater than 30 years from now, assume it's in the past century
    return twoDigitYear > ((currentYear - century + 30) % 100)
      ? century - 100 + twoDigitYear
      : century + twoDigitYear;
  }
  return year;
};

const isValidDate = (date) => {
  return date instanceof Date && 
         !isNaN(date.getTime()) && 
         date.getFullYear() >= 1900 && 
         date.getFullYear() <= new Date().getFullYear() + 1;
};

const extractPhoneNumber = (lines) => {
  console.log('Starting phone number extraction with lines:', lines);

  const phonePatterns = [
    // Mobile: +91 9999999999 format
    /mobile\s*:\s*\+91\s*([6789]\d{9})/i,
    
    // +91 prefix with number
    /\+91\s*([6789]\d{9})/,
    
    // Mobile number with label
    /(?:mobile|phone|tel|contact|mob)(?:\s*(?:no\.?|number|#|\:|：))?\s*([6789]\d{9})/i,
    
    // Basic 10-digit number
    /\b([6789]\d{9})\b/
  ];

  for (const line of lines) {
    console.log('Checking line:', line);
    
    for (const pattern of phonePatterns) {
      const match = line.match(pattern);
      if (match) {
        console.log('Found match:', match);
        const number = match[1].replace(/\D/g, '');
        
        if (/^[6789]\d{9}$/.test(number)) {
          const formatted = `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
          console.log('Valid number found:', formatted);
          return formatted;
        }
      }
    }
  }

  // Try full text search
  const fullText = lines.join(' ');
  const numberMatch = fullText.match(/\+91\s*([6789]\d{9})/);
  if (numberMatch) {
    const number = numberMatch[1].replace(/\D/g, '');
    if (/^[6789]\d{9}$/.test(number)) {
      const formatted = `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
      console.log('Valid number found in full text:', formatted);
      return formatted;
    }
  }

  console.log('No valid phone number found');
  return null;
};

const extractQuantity = (lines) => {
  const patterns = [
    /quantity\s*:?\s*(\d+)/i,
    /qty\s*:?\s*(\d+)/i,
    /units?\s*:?\s*(\d+)/i,
    /pieces?\s*:?\s*(\d+)/i,
    /nos\.?\s*:?\s*(\d+)/i,
    /pcs\.?\s*:?\s*(\d+)/i
  ];

  // Try each pattern
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const qty = parseInt(match[1], 10);
        if (!isNaN(qty) && qty > 0) {
          return qty;
        }
      }
    }
  }

  // Look for numbers after common quantity indicators
  const qtyIndicators = /(?:qty|quantity|units?|pcs|pieces|nos)\.?\s*:?\s*(\d+)/i;
  for (const line of lines) {
    const match = line.match(qtyIndicators);
    if (match && match[1]) {
      const qty = parseInt(match[1], 10);
      if (!isNaN(qty) && qty > 0) {
        return qty;
      }
    }
  }

  // Look for a single number in a line that might be quantity
  for (const line of lines) {
    if (/qty|quantity|units?|pcs|pieces|nos/i.test(line)) {
      const numbers = line.match(/\d+/g);
      if (numbers && numbers.length === 1) {
        const qty = parseInt(numbers[0], 10);
        if (!isNaN(qty) && qty > 0) {
          return qty;
        }
      }
    }
  }

  return 1; // Default quantity if none found
};

const extractAmount = (lines) => {
  const patterns = [
    // Match amounts with currency symbols and labels
    /(?:total|grand|net|final)\s*amount\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /amount\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /total\s*:?\s*(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /(?:Rs\.?|INR)?\s*([\d,]+\.?\d*)\s*(?:only|total)/i,
    
    // Match amounts with different currency formats
    /(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s*(?:₹|rs\.?|inr)/i,
    
    // Match amounts with "only" suffix
    /([\d,]+\.?\d*)\s*(?:rupees?|rs\.?|inr)?\s*only/i,
    
    // Match basic amount formats
    /amount\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
    /(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i
  ];

  // Helper function to clean and parse amount
  const parseAmount = (str) => {
    if (!str) return 0;
    // Remove all non-numeric characters except . and ,
    const cleaned = str.replace(/[^\d.,]/g, '');
    // Replace last comma before 2 digits to decimal point
    const normalized = cleaned.replace(/,(\d{2})$/, '.$1').replace(/,/g, '');
    const amount = parseFloat(normalized);
    return !isNaN(amount) && amount > 0 ? amount : 0;
  };

  // Try each pattern
  for (const pattern of patterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const amount = parseAmount(match[1]);
        if (amount > 0) {
          return amount;
        }
      }
    }
  }

  // If no amount found with patterns, look for the largest number that could be an amount
  const numbers = lines.join(' ').match(/(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/gi) || [];
  const amounts = numbers
    .map(n => parseAmount(n))
    .filter(n => n > 0);

  if (amounts.length > 0) {
    // Return the largest amount found
    return Math.max(...amounts);
  }

  return 0; // Default if no amount found
};

const extractProductNames = (lines) => {
  console.log('Extracting product names from lines:', lines);
  
  // Common product section headers that indicate where product details start
  const productSectionHeaders = [
    /description\s*of\s*goods/i,
    /item\s*description/i,
    /product\s*details/i,
    /particulars/i,
    /description/i,
    /items?/i,
    /goods/i,
    /hsn\s*code/i,
    /sl\.?\s*no\.?/i,
    /product\s*name/i,
    /item\s*name/i,
    /article/i,
    /material/i
  ];

  // Skip these lines as they're likely not product names
  const skipPatterns = [
    /total/i,
    /amount/i,
    /tax/i,
    /invoice/i,
    /bill/i,
    /date/i,
    /payment/i,
    /price/i,
    /quantity/i,
    /hsn/i,
    /gst/i,
    /cgst/i,
    /sgst/i,
    /igst/i,
    /rate/i,
    /subtotal/i,
    /discount/i,
    /shipping/i,
    /handling/i,
    /delivery/i,
    /^\s*sl\.?\s*no\.?\s*$/i,
    /^\s*no\.?\s*$/i,
    /page\s*\d+/i,
    /terms?\s*(?:&|and)?\s*conditions?/i,
    /bank\s*details?/i,
    /payment\s*terms?/i,
    /due\s*date/i,
    /balance/i,
    /credit/i,
    /debit/i
  ];

  // Find the start of the product section
  let startIndex = -1;
  let inProductSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (productSectionHeaders.some(header => header.test(line))) {
      startIndex = i + 1;
      inProductSection = true;
      break;
    }
  }

  if (startIndex === -1) {
    // If no product section header found, try to find first line that looks like a product
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !skipPatterns.some(pattern => pattern.test(line))) {
        startIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1) {
    startIndex = 0;
  }

  const cleanProductLine = (line) => {
    if (!line) return '';
    
    return line
      .replace(/^[-–—•*]+\s*/, '') // Remove bullet points and dashes at start
      .replace(/\s*[-–—•*]+\s*$/, '') // Remove bullet points and dashes at end
      .replace(/\([^)]*\)/g, ' ') // Remove parentheses and their contents
      .replace(/^[\d\s.,]+/, '') // Remove leading numbers and separators
      .replace(/\s+(?:rs\.?|inr)?\s*\d+(?:[.,]\d+)?\s*$/i, '') // Remove trailing prices
      .replace(/\s+\d+(?:[.,]\d+)?\s*(?:pc|pcs|pieces|nos|units|qty)?\s*$/i, '') // Remove trailing quantities
      .replace(/\s+\d+(?:[.,]\d+)?%?\s*$/i, '') // Remove trailing percentages
      .replace(/^.*?:\s*/, '') // Remove anything before and including a colon
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const isValidProductName = (text) => {
    if (!text || text.length < 2) return false;

    // Invalid patterns
    const invalidPatterns = [
      /^[0-9\s]*$/,                      // Only numbers and spaces
      /^[\W\s]*$/,                       // Only special characters and spaces
      /^\d+(?:[.,]\d+)?%?$/,            // Just a number with optional decimal and %
      /^(?:rs\.?|inr)?\s*\d+(?:[.,]\d+)?$/i, // Just a price
      /^(?:yes|no|na|nil|none)$/i,      // Common filler words
      /^page\s*\d+\s*of\s*\d+$/i,      // Page numbers
      /^[A-Z]{4}\d{7}$/,               // IFSC code pattern
      /^\d{9,18}$/,                    // Bank account number pattern
      /^[A-Z]{6}\d{2}[A-Z]\d{3}[A-Z]$/,// PAN number pattern
      /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{3}$/, // GST number pattern
      /charges?\s*(?:[\d.,]+)?$/i,     // Charges
      /fees?\s*(?:[\d.,]+)?$/i,        // Fees
    ];

    // Check if text matches any invalid pattern
    if (invalidPatterns.some(pattern => pattern.test(text))) {
      return false;
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(text)) {
      return false;
    }

    // Check if it's a skip pattern
    if (skipPatterns.some(pattern => pattern.test(text))) {
      return false;
    }

    return true;
  };

  const products = [];
  let lastProductLine = '';

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    // Skip if line matches any skip pattern
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // Split line by common delimiters
    const parts = line.split(/\s{2,}|\t|(?<=\S)(?=\d+[.,]\d+)/)
      .map(part => cleanProductLine(part))
      .filter(part => part && isValidProductName(part));

    if (parts.length > 0) {
      // Check if this line might be a continuation of the previous product name
      if (lastProductLine && 
          !parts[0].match(/^[A-Z0-9]/) && // Doesn't start with capital letter or number
          products.length > 0) {
        // Append to the last product
        products[products.length - 1] += ' ' + parts[0];
      } else {
        // Add as new product
        products.push(parts[0]);
        lastProductLine = parts[0];
      }
    }
  }

  // Clean up and remove duplicates
  const uniqueProducts = [...new Set(products)]
    .map(product => product.trim())
    .filter(product => 
      product && 
      product.length >= 2 && 
      isValidProductName(product)
    );

  console.log('Extracted product names:', uniqueProducts);
  return uniqueProducts.length > 0 ? uniqueProducts : [];
};

const processFile = async (file) => {
  try {
    const fileType = file.type.toLowerCase();
    console.log('Processing file:', file.name, 'Type:', fileType);

    let result;
    if (fileType.includes('excel') || fileType.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      result = await processExcelFile(file);
    } else if (fileType.includes('pdf')) {
      const pdfResult = await processPDFFile(file);
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }
      result = [pdfResult.data];
    } else if (fileType.includes('image')) {
      result = await processImageFile(file);
    } else {
      throw new Error('Unsupported file type');
    }

    // Ensure result is an array and validate each item
    if (!Array.isArray(result)) {
      result = [result];
    }

    // Add raw text to each item for product name extraction
    result = result.map(item => ({
      ...item,
      rawText: item.rawText || item.text || ''  // Ensure rawText exists for product extraction
    }));

    // Validate each item in the result
    return result.map(item => validateData(item));
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Error processing ${file.name}: ${error.message}`);
  }
};

// Export the functions that need to be used by other modules
export { validateData, processFile };
