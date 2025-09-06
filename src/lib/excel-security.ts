/**
 * Excel Security Utilities
 * Provides secure Excel file processing with additional security measures
 */

import * as XLSX from 'xlsx';

/**
 * Security configuration for Excel processing
 */
export const excelSecurityConfig = {
  maxRows: 10000, // Maximum number of rows to process
  maxColumns: 50,  // Maximum number of columns
  maxCellLength: 1000, // Maximum length of cell content
  allowedSheetNames: /^[a-zA-Z0-9\s_-]+$/, // Only alphanumeric, spaces, hyphens, underscores
  maxSheets: 10, // Maximum number of sheets
};

/**
 * Sanitize cell content to prevent XSS and other attacks
 */
export function sanitizeCellContent(content: any): string {
  if (content === null || content === undefined) {
    return '';
  }
  
  let sanitized = String(content);
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove script tags and javascript: protocols
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Limit length
  if (sanitized.length > excelSecurityConfig.maxCellLength) {
    sanitized = sanitized.substring(0, excelSecurityConfig.maxCellLength);
  }
  
  return sanitized;
}

/**
 * Validate sheet name for security
 */
export function validateSheetName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  if (name.length > 31) { // Excel sheet name limit
    return false;
  }
  
  return excelSecurityConfig.allowedSheetNames.test(name);
}

/**
 * Sanitize sheet name
 */
export function sanitizeSheetName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Sheet1';
  }
  
  // Remove invalid characters
  let sanitized = name.replace(/[^\w\s-]/g, '');
  
  // Limit length
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 31);
  }
  
  // Ensure it's not empty
  if (!sanitized.trim()) {
    sanitized = 'Sheet1';
  }
  
  return sanitized;
}

/**
 * Secure Excel workbook creation with validation
 */
export function createSecureWorkbook(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  
  // Set workbook properties for security
  workbook.Props = {
    Title: 'Secure Export',
    Subject: 'Data Export',
    Author: 'Scan2Ship',
    CreatedDate: new Date()
  };
  
  return workbook;
}

/**
 * Secure worksheet creation with data validation
 */
export function createSecureWorksheet(data: any[], sheetName: string = 'Data'): XLSX.WorkSheet {
  // Validate and sanitize sheet name
  const safeSheetName = sanitizeSheetName(sheetName);
  
  // Limit data size
  const limitedData = data.slice(0, excelSecurityConfig.maxRows);
  
  // Sanitize all cell content
  const sanitizedData = limitedData.map(row => {
    if (typeof row === 'object' && row !== null) {
      const sanitizedRow: any = {};
      let columnCount = 0;
      
      for (const [key, value] of Object.entries(row)) {
        if (columnCount >= excelSecurityConfig.maxColumns) {
          break;
        }
        
        sanitizedRow[key] = sanitizeCellContent(value);
        columnCount++;
      }
      
      return sanitizedRow;
    }
    
    return sanitizeCellContent(row);
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);
  
  // Set column widths for better formatting
  const columnWidths = Object.keys(sanitizedData[0] || {}).map(() => ({ wch: 15 }));
  worksheet['!cols'] = columnWidths;
  
  return worksheet;
}

/**
 * Secure workbook writing with additional validation
 */
export function writeSecureWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  // Validate filename
  const safeFilename = filename.replace(/[^\w\s.-]/g, '');
  
  // Ensure filename has .xlsx extension
  const finalFilename = safeFilename.endsWith('.xlsx') ? safeFilename : `${safeFilename}.xlsx`;
  
  // Write with secure options
  XLSX.writeFile(workbook, finalFilename, {
    bookType: 'xlsx',
    type: 'binary',
    compression: true
  });
}

/**
 * Validate Excel file before processing
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only Excel files are allowed.' };
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    return { valid: false, error: 'File must have .xlsx or .xls extension' };
  }
  
  return { valid: true };
}

/**
 * Secure Excel file reading with validation
 */
export function readSecureExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    // Validate file first
    const validation = validateExcelFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        // Read workbook with secure options
        const workbook = XLSX.read(data, {
          type: 'binary',
          cellDates: true,
          cellNF: false,
          cellText: false,
          raw: false
        });
        
        // Validate workbook structure
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('No sheets found in Excel file'));
          return;
        }
        
        if (workbook.SheetNames.length > excelSecurityConfig.maxSheets) {
          reject(new Error(`Too many sheets. Maximum allowed: ${excelSecurityConfig.maxSheets}`));
          return;
        }
        
        // Validate sheet names
        for (const sheetName of workbook.SheetNames) {
          if (!validateSheetName(sheetName)) {
            reject(new Error(`Invalid sheet name: ${sheetName}`));
            return;
          }
        }
        
        resolve(workbook);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}
