import * as XLSX from 'xlsx';
import { Account, AccountType } from '../types';

// --- Configuration --- 
// Define the exact column names from your Excel file and their variations
const COLUMN_MAPPING = {
  institution: ['INSTITUTION', 'INSTITUCION', 'BANCO', 'BANK'],
  type: ['TYPE', 'TIPO', 'ACCOUNT TYPE', 'TIPO DE CUENTA'],
  balance: ['INTERES Y CAPITAL', 'BALANCE', 'TOTAL', 'AMOUNT', 'MONTO'],
};

// Define how Excel TYPE values map to your app's AccountType
const TYPE_MAPPING: { [excelType: string]: AccountType } = {
  'CASH': 'cash',
  'cash': 'cash',
  'EFECTIVO': 'cash',
  'SAVINGS': 'savings',
  'savings': 'savings',
  'AHORRO': 'savings',
  'AHORROS': 'savings',
  'CHECKINGS': 'checkings',
  'checking': 'checkings',
  'checkings': 'checkings',
  'CUENTA CORRIENTE': 'checkings',
  'DIGITAL INVESTM': 'investment',
  'DIGITAL INVESTMENT': 'investment',
  'investment': 'investment',
  'INVERSION': 'investment',
  'INVERSIONES': 'investment',
  'ASSET': 'other_assets',
  'asset': 'other_assets',
  'other assets': 'other_assets',
  'OTROS ACTIVOS': 'other_assets',
  'crypto': 'crypto',
  'CRIPTO': 'crypto',
  'real estate': 'real_estate',
  'BIENES RAICES': 'real_estate',
  'PROPIEDAD': 'real_estate',
  'liability': 'liability',
  'DEUDA': 'liability',
  'PRESTAMO': 'liability',
};

// --- Helper Functions ---

// Extracts year from sheet name (e.g., "Inversiones2024" -> 2024)
const getYearFromSheetName = (sheetName: string): number | null => {
  const match = sheetName.match(/\d{4}$/); // Look for 4 digits at the end
  return match ? parseInt(match[0], 10) : null;
};

// Creates an ISO date string for the end of the given year
const getEndOfYearDate = (year: number): string => {
  // Use Dec 31st, 23:59:59 UTC of that year
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString();
};

// Find matching column name from variations
const findMatchingColumn = (headers: string[], variations: string[]): number => {
  const normalizedHeaders = headers.map(h => String(h || '').trim().toUpperCase());
  return normalizedHeaders.findIndex(h => 
    variations.some(v => h === v.toUpperCase() || h.includes(v.toUpperCase()))
  );
};

// Maps Excel type string to AccountType, case-insensitively, with fuzzy matching
const mapExcelType = (excelType: string | undefined): AccountType => {
  if (!excelType) return 'other_assets';
  
  const input = String(excelType).toLowerCase().trim();
  
  // First try exact match
  const exactMatch = TYPE_MAPPING[input] || TYPE_MAPPING[excelType.toUpperCase()];
  if (exactMatch) return exactMatch;
  
  // Then try fuzzy match - find the closest mapping
  for (const [key, value] of Object.entries(TYPE_MAPPING)) {
    if (input.includes(key.toLowerCase()) || key.toLowerCase().includes(input)) {
      return value;
    }
  }
  
  // If no match found, try to infer from common keywords
  if (input.includes('cash') || input.includes('efectivo')) return 'cash';
  if (input.includes('save') || input.includes('saving') || input.includes('ahorro')) return 'savings';
  if (input.includes('check') || input.includes('corriente')) return 'checkings';
  if (input.includes('invest') || input.includes('inversion')) return 'investment';
  if (input.includes('asset') || input.includes('activo')) return 'other_assets';
  if (input.includes('crypto') || input.includes('cripto')) return 'crypto';
  if (input.includes('estate') || input.includes('property') || input.includes('raices')) return 'real_estate';
  if (input.includes('debt') || input.includes('loan') || input.includes('deuda') || input.includes('prestamo')) return 'liability';
  
  console.warn(`Using default type 'other_assets' for unrecognized type: "${excelType}"`);
  return 'other_assets';
};

// Clean and parse balance value
const parseBalance = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const cleanValue = String(value)
    .replace(/[,$]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const number = parseFloat(cleanValue);
  return isNaN(number) ? 0 : number;
};

// --- Main Parsing Function ---

export interface ParsedAccountData extends Omit<Account, 'id'> {
  originalSheet: string;
}

export const parseExcelData = async (file: File): Promise<ParsedAccountData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file data.');
        
        const workbook = XLSX.read(data, { type: 'array' });
        const parsedAccounts: ParsedAccountData[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const year = getYearFromSheetName(sheetName);
          const lastUpdated = year ? getEndOfYearDate(year) : new Date().toISOString();
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: ''
          });

          if (jsonData.length < 2) {
            console.warn(`Skipping sheet "${sheetName}": No data found.`);
            return;
          }

          // Find required columns
          const headerRow = jsonData[0].map((h: any) => String(h || '').trim().toUpperCase());
          const balanceColIndex = findMatchingColumn(headerRow, COLUMN_MAPPING.balance);
          const institutionColIndex = findMatchingColumn(headerRow, COLUMN_MAPPING.institution);
          const typeColIndex = findMatchingColumn(headerRow, COLUMN_MAPPING.type);

          if (balanceColIndex === -1) {
            console.warn(`Skipping sheet "${sheetName}": Could not find balance column.`);
            return;
          }

          // Process each row (skip header)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.every((cell: any) => !cell)) continue;

            const firstCell = String(row[0] || '').trim().toUpperCase();
            // Skip total rows
            if (firstCell.includes('TOTAL')) continue;

            const balance = parseBalance(row[balanceColIndex]);
            if (balance === 0) continue;

            const institution = institutionColIndex !== -1 
              ? String(row[institutionColIndex] || '').trim() 
              : `Account from ${sheetName}`;

            const excelType = typeColIndex !== -1 
              ? String(row[typeColIndex] || '').trim()
              : '';

            parsedAccounts.push({
              institution,
              type: mapExcelType(excelType),
              balance,
              lastUpdated,
              originalSheet: sheetName,
            });
          }
        });

        if (parsedAccounts.length === 0) {
          console.warn('No data was parsed from any sheet.');
        }

        resolve(parsedAccounts);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file.'));
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(new Error('Failed to read file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}; 