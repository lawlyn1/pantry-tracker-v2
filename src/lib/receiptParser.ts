import { ReceiptItemLine } from '@/types';

export const parseReceipt = async (rawText: string, deepMacroScan: boolean = true): Promise<ReceiptItemLine[]> => {
  try {
    const response = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawText, deepMacroScan }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API Error:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error parsing receipt:', error);
    return [];
  }
};
