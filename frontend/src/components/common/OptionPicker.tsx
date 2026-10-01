import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { labelFor, type Option } from '../../constants/profileOptions';

interface Props {
  title: string;
  options: Option[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Adds a "Not specified" row so optional fields can be cleared. */
  clearable?: boolean;
}

/** A form field that opens a full-screen list — for option lists too long for chips. */
export default function OptionPicker({ title, options, value, onChange, placeholder, clearable }: Props) {
  const [open, setOpen] = useState(false);
  const rows: Option[] = clearable ? [{ value: '', label: 'Not specified' }, ...options] : options;

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? labelFor(options, value) : placeholder || 'Select'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.value || '__none'}
            renderItem={({ item }) => {
              const selected = (value ?? '') === item.value;
              return (
                <TouchableOpacity
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    onChange(item.value || null);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                    {item.emoji ? `${item.emoji}  ` : ''}{item.label}
                  </Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  value: { color: Colors.textPrimary, fontSize: FontSize.md },
  placeholder: { color: Colors.textMuted, fontSize: FontSize.md },
  chevron: { color: Colors.textMuted, fontSize: FontSize.md },
  modal: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  close: { fontSize: FontSize.lg, color: Colors.textSecondary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowSelected: { backgroundColor: Colors.primarySoft },
  rowText: { fontSize: FontSize.md, color: Colors.textPrimary },
  rowTextSelected: { color: Colors.primary, fontWeight: '700' },
  check: { color: Colors.primary, fontWeight: '800' },
});
