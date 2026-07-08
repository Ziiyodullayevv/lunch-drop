import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'tamagui';

type QuantityStepperProps = {
  value: number;
  min?: number;
  onChange: (value: number) => void;
};

export function QuantityStepper({ value, min = 0, onChange }: QuantityStepperProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F3',
        borderRadius: 22,
        paddingHorizontal: 2,
        paddingVertical: 2,
      }}
    >
      <TouchableOpacity
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons
          name="minus"
          size={18}
          color={value <= min ? '#C7C7CC' : '#1C1C1E'}
        />
      </TouchableOpacity>

      <Text fontFamily="$heading"
        color="#1C1C1E"
        fontSize={16}
        fontWeight="800"
        textAlign="center"
        minWidth={28}
      >
        {value}
      </Text>

      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="plus" size={18} color="#1C1C1E" />
      </TouchableOpacity>
    </View>
  );
}
