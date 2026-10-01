import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { Option } from '../../constants/profileOptions';

interface SingleProps {
  options: Option[];
  multiple?: false;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  allowDeselect?: boolean;
}

interface MultiProps {
  options: Option[];
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  onMaxReached?: () => void;
}

export default function ChipSelect(props: SingleProps | MultiProps) {
  const isSelected = (v: string) =>
    props.multiple ? props.value.includes(v) : props.value === v;

  const toggle = (v: string) => {
    if (props.multiple) {
      if (props.value.includes(v)) {
        props.onChange(props.value.filter((x) => x !== v));
      } else if (props.max && props.value.length >= props.max) {
        props.onMaxReached?.();
      } else {
        props.onChange([...props.value, v]);
      }
      return;
    }
    const single = props as SingleProps;
    if (single.value === v) {
      if (single.allowDeselect) single.onChange(null);
      return;
    }
    single.onChange(v);
  };

  return (
    <View style={styles.row}>
      {props.options.map((opt) => {
        const selected = isSelected(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => toggle(opt.value)}
            activeOpacity={0.8}
          >
            {opt.emoji ? <Text style={styles.emoji}>{opt.emoji}</Text> : null}
            <Text style={[styles.text, selected && styles.textSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  emoji: { fontSize: 15 },
  text: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  textSelected: { color: Colors.primary },
});
