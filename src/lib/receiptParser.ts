import { ReceiptItemLine } from '@/types';

export const parseReceipt = async (rawText: string): Promise<ReceiptItemLine[]> => {
  try {
    const response = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawText }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse receipt');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error parsing receipt:', error);
    return [];
  }
};
