import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import type { Stage1ScreenProps, EditProfileScreenProps } from '../../navigation/types';
import ChipSelect from '../../components/common/ChipSelect';
import OptionPicker from '../../components/common/OptionPicker';
import {
  GENDERS,
  RELATIONSHIP_STATUSES,
  LOOKING_FOR_OPTIONS,
  INTERESTED_IN_OPTIONS,
  MOTHER_TONGUES,
  RELIGIONS,
  EDUCATION_LEVELS,
  PROFESSIONS,
  PASSIONS,
  MAX_PASSIONS,
  MAX_LOOKING_FOR,
  MIN_AGE,
  MAX_AGE,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  DEFAULT_HEIGHT_CM,
  SALARY_CURRENCIES,
  getSalaryRanges,
  guessSalaryCurrency,
  formatHeight,
  type SalaryCurrency,
} from '../../constants/profileOptions';

type Props = Stage1ScreenProps | EditProfileScreenProps;

/** Signup step 1, and the Edit Profile screen once the account is set up. */
export default function Stage1Screen({ navigation, route }: Props) {
  const isEdit = route.name === 'EditProfile';
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<string | null>(user?.gender || null);
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || '');
  const [grewUpCity, setGrewUpCity] = useState(user?.grewUpCity || '');
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(user?.relationshipStatus || null);
  const [lookingFor, setLookingFor] = useState<string[]>(user?.lookingFor?.length ? user.lookingFor : ['friendship']);
  const [interestedIn, setInterestedIn] = useState<string | null>(user?.interestedIn || 'everyone');
  const [motherTongue, setMotherTongue] = useState<string | null>(user?.motherTongue || null);
  const [jobProfile, setJobProfile] = useState(user?.jobProfile || '');
  const [profession, setProfession] = useState<string | null>(user?.profession || null);
  const [education, setEducation] = useState<string | null>(user?.education || null);
  const [religion, setReligion] = useState<string | null>(user?.religion || null);
  const [salaryCurrency, setSalaryCurrency] = useState<SalaryCurrency>(
    guessSalaryCurrency(user?.salaryRange, user?.country),
  );
  const [salaryRange, setSalaryRange] = useState<string | null>(user?.salaryRange || null);
  const [hideSalary, setHideSalary] = useState(user?.hideSalary ?? false);
  const [heightCm, setHeightCm] = useState<number | null>(user?.heightCm ?? null);
  const [passions, setPassions] = useState<string[]>(user?.passions || []);
  const [bio, setBio] = useState(user?.bio || '');
  const [referredByCode, setReferredByCode] = useState('');
  const [loading, setLoading] = useState(false);

  const ageNum = parseInt(age, 10);
  const ageValid = ageNum >= MIN_AGE && ageNum <= MAX_AGE;

  const missing: string[] = [];
  if (name.trim().length < 2) missing.push('name');
  if (!gender) missing.push('gender');
  if (!ageValid) missing.push('age');
  if (city.trim().length < 2) missing.push('city');
  if (country.trim().length < 2) missing.push('country');
  if (grewUpCity.trim().length < 2) missing.push('where you grew up');
  if (!relationshipStatus) missing.push('relationship status');
  if (lookingFor.length === 0) missing.push('looking for');
  if (!interestedIn) missing.push('interested in');
  if (!motherTongue) missing.push('mother tongue');
  if (jobProfile.trim().length < 2) missing.push('job profile');
  const isValid = missing.length === 0 && (referredByCode.length === 0 || referredByCode.length === 6);

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert('Almost there', `Please add your ${missing.join(', ')}.`);
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        gender,
        age: ageNum,
        city: city.trim(),
        country: country.trim(),
        grewUpCity: grewUpCity.trim(),
        relationshipStatus,
        lookingFor,
        interestedIn,
        motherTongue,
        jobProfile: jobProfile.trim(),
        passions,
        bio: bio.trim(),
        hideSalary,
      };
      if (profession) payload.profession = profession;
      if (education) payload.education = education;
      if (religion) payload.religion = religion;
      if (salaryRange) payload.salaryRange = salaryRange;
      if (heightCm) payload.heightCm = heightCm;
      if (!isEdit && referredByCode.length === 6) payload.referredByCode = referredByCode;

      const { data } = await api.patch('/users/profile/stage1', payload);
      updateUser({ ...data, profileStage: Math.max(user?.profileStage ?? 0, 1) as 1 | 2 | 3 });
      if (isEdit) {
        navigation.goBack();
      } else {
        navigation.replace('Stage2');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      Alert.alert('Could not save profile', Array.isArray(msg) ? msg.join('\n') : msg || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    Alert.alert('Go back to login?', 'You can sign in with another account from the Welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Go Back',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  const salaryOptions = getSalaryRanges(salaryCurrency).map((r) => ({ value: r, label: r }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          {!isEdit && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressStep, styles.progressActive]}>
                <Text style={styles.progressStepText}>1</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressStep}>
                <Text style={[styles.progressStepText, { color: Colors.textMuted }]}>2</Text>
              </View>
            </View>
          )}
          <Text style={styles.title}>{isEdit ? 'Edit profile' : 'Tell us about you'}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? 'Keep your details fresh so the right friends find you' : 'Help fellow NRIs find common ground with you'}
          </Text>
        </View>

        <SectionTitle>Basics</SectionTitle>

        <Field label="Your first name" required>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Priya"
            placeholderTextColor={Colors.textMuted} maxLength={60} />
        </Field>

        <Field label="Gender" required>
          <ChipSelect options={GENDERS} value={gender} onChange={setGender} />
        </Field>

        <Field label="Age" required>
          <TextInput style={[styles.input, styles.inputSmall]} value={age}
            onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))} placeholder={`${MIN_AGE}–${MAX_AGE}`}
            placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={2} />
          {age.length > 0 && !ageValid && (
            <Text style={styles.errorText}>Must be between {MIN_AGE} and {MAX_AGE}</Text>
          )}
        </Field>

        <Field label="Relationship status" required>
          <ChipSelect options={RELATIONSHIP_STATUSES} value={relationshipStatus} onChange={setRelationshipStatus} />
        </Field>

        <SectionTitle>Where you're from</SectionTitle>

        <Field label="City you live in" required>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Toronto"
            placeholderTextColor={Colors.textMuted} autoCapitalize="words" maxLength={100} />
        </Field>

        <Field label="Country you live in" required>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="e.g. Canada"
            placeholderTextColor={Colors.textMuted} autoCapitalize="words" maxLength={100} />
        </Field>

        <Field label="City you grew up in" required hint="We'll highlight members from your hometown 🏡">
          <TextInput style={styles.input} value={grewUpCity} onChangeText={setGrewUpCity} placeholder="e.g. Pune"
            placeholderTextColor={Colors.textMuted} autoCapitalize="words" maxLength={100} />
        </Field>

        <Field label="Mother tongue" required>
          <OptionPicker title="Mother tongue" options={MOTHER_TONGUES} value={motherTongue} onChange={setMotherTongue} />
        </Field>

        <Field label="Religion">
          <OptionPicker title="Religion" options={RELIGIONS} value={religion} onChange={setReligion} clearable
            placeholder="Optional" />
        </Field>

        <SectionTitle>What you're looking for</SectionTitle>

        <Field label={`Looking for (up to ${MAX_LOOKING_FOR})`} required>
          <ChipSelect multiple options={LOOKING_FOR_OPTIONS} value={lookingFor} onChange={setLookingFor}
            max={MAX_LOOKING_FOR}
            onMaxReached={() => Alert.alert('Limit reached', `Pick up to ${MAX_LOOKING_FOR}.`)} />
        </Field>

        <Field label="Interested in meeting" required>
          <ChipSelect options={INTERESTED_IN_OPTIONS} value={interestedIn} onChange={setInterestedIn} />
        </Field>

        <SectionTitle>Work & education</SectionTitle>

        <Field label="Job profile" required>
          <TextInput style={styles.input} value={jobProfile} onChangeText={setJobProfile}
            placeholder="e.g. Senior Data Analyst" placeholderTextColor={Colors.textMuted} maxLength={80} />
        </Field>

        <Field label="Profession">
          <OptionPicker title="Profession" options={PROFESSIONS} value={profession} onChange={setProfession} clearable
            placeholder="Optional" />
        </Field>

        <Field label="Education">
          <OptionPicker title="Education" options={EDUCATION_LEVELS} value={education} onChange={setEducation} clearable
            placeholder="Optional" />
        </Field>

        <Field label="Salary">
          <View style={[styles.currencyRow]}>
            {SALARY_CURRENCIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => { setSalaryCurrency(c); setSalaryRange(null); }}
                style={[styles.currencyChip, salaryCurrency === c && styles.currencyChipSelected]}>
                <Text style={[styles.currencyText, salaryCurrency === c && styles.currencyTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ChipSelect options={salaryOptions} value={salaryRange} onChange={setSalaryRange} allowDeselect />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Hide salary on my profile</Text>
              <Text style={styles.helperText}>Only you will see it</Text>
            </View>
            <Switch value={hideSalary} onValueChange={setHideSalary}
              trackColor={{ true: Colors.primaryLight, false: Colors.border }}
              thumbColor={hideSalary ? Colors.primary : '#fff'} />
          </View>
        </Field>

        <SectionTitle>A bit more</SectionTitle>

        <Field label="Height">
          {heightCm ? (
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn}
                onPress={() => setHeightCm(Math.max(MIN_HEIGHT_CM, heightCm - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{formatHeight(heightCm)}</Text>
              <TouchableOpacity style={styles.stepperBtn}
                onPress={() => setHeightCm(Math.min(MAX_HEIGHT_CM, heightCm + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHeightCm(null)}>
                <Text style={styles.linkText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setHeightCm(DEFAULT_HEIGHT_CM)}>
              <Text style={styles.addBtnText}>+ Add height</Text>
            </TouchableOpacity>
          )}
        </Field>

        <Field label={`Passions (${passions.length}/${MAX_PASSIONS})`} hint="Pick what you love doing">
          <ChipSelect multiple options={PASSIONS} value={passions} onChange={setPassions} max={MAX_PASSIONS}
            onMaxReached={() => Alert.alert('Limit reached', `You can pick up to ${MAX_PASSIONS} passions.`)} />
        </Field>

        <Field label="About me">
          <TextInput style={[styles.input, styles.inputMultiline]} value={bio} onChangeText={setBio}
            placeholder="Moved here for work, love weekend cricket and finding good chai..."
            placeholderTextColor={Colors.textMuted} multiline maxLength={300} textAlignVertical="top" />
          <Text style={styles.helperText}>{bio.length}/300</Text>
        </Field>

        {!isEdit && (
          <Field label="Referral code (optional)">
            <TextInput style={styles.input} value={referredByCode}
              onChangeText={(v) => setReferredByCode(v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              placeholder="6-character code from a friend" placeholderTextColor={Colors.textMuted}
              maxLength={6} autoCapitalize="characters" />
            {referredByCode.length > 0 && referredByCode.length < 6 && (
              <Text style={styles.errorText}>Code must be exactly 6 characters</Text>
            )}
            {referredByCode.length === 6 && (
              <Text style={styles.successText}>🎉 You and your friend both get bonus coins when you finish signup!</Text>
            )}
          </Field>
        )}

        <TouchableOpacity
          style={[styles.continueBtn, (!isValid || loading) && styles.continueBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueBtnText}>{isEdit ? 'Save changes' : 'Continue → Add Photos'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        {label}{required ? <Text style={{ color: Colors.primary }}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  backBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, marginBottom: Spacing.md },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  progressStep: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border,
  },
  progressActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressStepText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  progressLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: Spacing.xs },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
  sectionTitle: {
    fontSize: FontSize.lg, fontWeight: '800', color: Colors.primaryDark,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  label: {
    fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600',
    marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  labelHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm, marginTop: -4 },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.md,
  },
  inputMultiline: { minHeight: 110 },
  inputSmall: { width: 120 },
  errorText: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  successText: { color: Colors.success, fontSize: FontSize.xs, marginTop: 4 },
  helperText: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  currencyChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  currencyChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  currencyText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  currencyTextSelected: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  switchLabel: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { color: Colors.primary, fontSize: 22, fontWeight: '800' },
  stepperValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, minWidth: 120, textAlign: 'center' },
  linkText: { color: Colors.textMuted, fontSize: FontSize.sm, textDecorationLine: 'underline' },
  addBtn: {
    alignSelf: 'flex-start', borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  addBtnText: { color: Colors.primary, fontWeight: '700' },
  continueBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16,
    alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
