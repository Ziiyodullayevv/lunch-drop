import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

interface OtpBoxInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
}

export function OtpBoxInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  onComplete,
}: OtpBoxInputProps) {
  const { width: screenWidth } = useWindowDimensions();
  const gap = 8;
  const horizontalPadding = 40;
  const boxWidth = Math.floor((screenWidth - horizontalPadding - gap * (length - 1)) / length);
  const boxHeight = Math.floor(boxWidth * 1.15);

  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (!focused) return;
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [focused]);

  useEffect(() => {
    if (autoFocus) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChange(digits);
      if (digits.length === length) onComplete?.(digits);
    },
    [length, onChange, onComplete],
  );

  return (
    <XStack gap={gap} justifyContent="center" paddingHorizontal={horizontalPadding / 2} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }, (_, i) => {
        const char = value[i] ?? '';
        const isFilled = !!char;
        const isActive = focused && i === value.length && value.length < length;
        const isComplete = focused && value.length === length;

        return (
          <YStack
            key={i}
            width={boxWidth}
            height={boxHeight}
            borderRadius={14}
            borderWidth={2}
            borderColor={isActive || isComplete ? '#1C1C1E' : isFilled ? '#E5E7EB' : '#F0F0F3'}
            backgroundColor={isFilled || isComplete ? '#FFFFFF' : '#F0F0F3'}
            alignItems="center"
            justifyContent="center"
            animation="quick"
          >
            {isFilled ? (
              <Text fontFamily="$heading" fontSize={boxWidth * 0.45} fontWeight="700" color="#1C1C1E">
                {char}
              </Text>
            ) : isActive ? (
              <YStack
                width={2}
                height={boxHeight * 0.4}
                borderRadius={1}
                backgroundColor="#1C1C1E"
                opacity={cursorOn ? 1 : 0}
              />
            ) : null}
          </YStack>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        onFocus={() => {
          setFocused(true);
          setCursorOn(true);
        }}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
      />
    </XStack>
  );
}
