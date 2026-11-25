import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface AmountDisplayProps {
  amountInPaise?: number;
  amount?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  color?: string;
  style?: TextStyle;
}

/**
 * Formats integer paise into standard Indian Rupee format (e.g. ₹1,50,000.00)
 */
export const formatCurrency = (paise: number, showDecimals = true): string => {
  const rupees = paise / 100;
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);

  const parts = absRupees.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian Numbering Formatting (Lakhs and Crores)
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const formatted = showDecimals && decimalPart !== '00'
    ? `${integerPart}.${decimalPart}`
    : integerPart;

  return `${isNegative ? '-' : ''}₹${formatted}`;
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amountInPaise,
  amount,
  size = 'md',
  showSign = false,
  color,
  style,
}) => {
  const actualPaise = amountInPaise !== undefined ? amountInPaise : (amount !== undefined ? amount : 0);

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 13;
      case 'lg':
        return 22;
      case 'xl':
        return 28;
      default:
        return 16;
    }
  };

  const getAutoColor = () => {
    if (color) return color;
    if (actualPaise > 0) return Colors.danger; // Due / Receivable
    if (actualPaise < 0) return Colors.success; // Advance / Credit
    return Colors.textPrimary;
  };

  const formatted = formatCurrency(actualPaise);

  return (
    <Text
      style={[
        styles.amount,
        {
          fontSize: getFontSize(),
          color: getAutoColor(),
        },
        style,
      ]}
    >
      {showSign && actualPaise > 0 ? `+${formatted}` : formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  amount: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
