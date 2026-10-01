import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import type { DiscoverFilters } from '../../services/discover.service';
import OptionPicker from '../common/OptionPicker';
import {
  RELATIONSHIP_STATUSES,
  LOOKING_FOR_OPTIONS,
  MOTHER_TONGUES,
  RELIGIONS,
  MIN_AGE,
  MAX_AGE,
} from '../../constants/profileOptions';

interface Props {
  visible: boolean;
  filters: DiscoverFilters;
  onApply: (filters: DiscoverFilters) => void;
  onClose: () => void;
  /** Nearby always filters by distance; other lists treat "Anywhere" as no limit. */
  distanceOptional?: boolean;
}

export const DEFAULT_FILTERS: DiscoverFilters = { maxDistance: 50, minAge: MIN_AGE, maxAge: MAX_AGE };

const DISTANCES = [5, 10, 25, 50, 100, 250, 500];
const AGE_RANGES = [
  { label: '18–25', min: 18, max: 25 },
  { label: '25–35', min: 25, max: 35 },
  { label: '35–45', min: 35, max: 45 },
  { label: '45–60', min: 45, max: 60 },
  { label: '60+', min: 60, max: MAX_AGE },
  { label: 'Any', min: MIN_AGE, max: MAX_AGE },
];
const GENDERS: { label: string; value: DiscoverFilters['gender'] }[] = [
  { label: '🌈 Everyone', value: undefined },
  { label: '👨 Men', value: 'male' },
  { label: '👩 Women', value: 'female' },
];

export function countActiveFilters(f: DiscoverFilters): number {
  let n = 0;
  if (f.gender) n++;
  if ((f.minAge ?? MIN_AGE) !== MIN_AGE || (f.maxAge ?? MAX_AGE) !== MAX_AGE) n++;
  for (const key of ['relationshipStatus', 'lookingFor', 'motherTongue', 'religion', 'country', 'grewUpCity'] as const) {
    if (f[key]) n++;
  }
  if (f.photoOnly) n++;
  if (f.verifiedOnly) n++;
  return n;
}

export default function FiltersModal({ visible, filters, onApply, onClose, distanceOptional }: Props) {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<DiscoverFilters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const set = (patch: Partial<DiscoverFilters>) => setLocal((p) => ({ ...p, ...patch }));
  const apply = () => { onApply(local); onClose(); };
  const reset = () => setLocal(distanceOptional ? { minAge: MIN_AGE, maxAge: MAX_AGE } : DEFAULT_FILTERS);

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Distance</Text>
            <View style={styles.chipRow}>
              {distanceOptional && (
                <Chip active={!local.maxDistance} label="Anywhere" onPress={() => set({ maxDistance: undefined })} />
              )}
              {DISTANCES.map((d) => (
                <Chip key={d} active={local.maxDistance === d} label={`${d} km`} onPress={() => set({ maxDistance: d })} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Age</Text>
            <View style={styles.chipRow}>
              {AGE_RANGES.map((r) => (
                <Chip
                  key={r.label}
                  active={(local.minAge ?? MIN_AGE) === r.min && (local.maxAge ?? MAX_AGE) === r.max}
                  label={r.label}
                  onPress={() => set({ minAge: r.min, maxAge: r.max })}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Show me</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <Chip key={g.label} active={local.gender === g.value} label={g.label} onPress={() => set({ gender: g.value })} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Looking for</Text>
            <View style={styles.chipRow}>
              <Chip active={!local.lookingFor} label="Any" onPress={() => set({ lookingFor: undefined })} />
              {LOOKING_FOR_OPTIONS.map((o) => (
                <Chip key={o.value} active={local.lookingFor === o.value} label={`${o.emoji} ${o.label}`}
                  onPress={() => set({ lookingFor: o.value })} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Grew up in (hometown)</Text>
            <TextInput
              style={styles.input}
              value={local.grewUpCity ?? ''}
              onChangeText={(v) => set({ grewUpCity: v || undefined })}
              placeholder="e.g. Pune"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Lives in (country)</Text>
            <TextInput
              style={styles.input}
              value={local.country ?? ''}
              onChangeText={(v) => set({ country: v || undefined })}
              placeholder="e.g. Canada"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mother tongue</Text>
            <OptionPicker title="Mother tongue" options={MOTHER_TONGUES} value={local.motherTongue}
              onChange={(v) => set({ motherTongue: v ?? undefined })} clearable placeholder="Any" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Religion</Text>
            <OptionPicker title="Religion" options={RELIGIONS} value={local.religion}
              onChange={(v) => set({ religion: v ?? undefined })} clearable placeholder="Any" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Relationship status</Text>
            <OptionPicker title="Relationship status" options={RELATIONSHIP_STATUSES} value={local.relationshipStatus}
              onChange={(v) => set({ relationshipStatus: v ?? undefined })} clearable placeholder="Any" />
          </View>

          <View style={[styles.section, styles.chipRow]}>
            <Chip active={!!local.photoOnly} label="📷 With photos only" onPress={() => set({ photoOnly: !local.photoOnly })} />
            <Chip active={!!local.verifiedOnly} label="✅ Verified only" onPress={() => set({ verifiedOnly: !local.verifiedOnly })} />
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.applyBtn} onPress={apply}>
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  resetText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: FontSize.md,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  applyBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
