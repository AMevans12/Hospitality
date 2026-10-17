import React, { forwardRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Password box: the eye appears only while this box is focused
const PasswordInput = forwardRef(function PasswordInput({ icon, style, ...props }, ref) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.box, focused && s.boxFocused, style]}>
      {icon ? <Ionicons name={icon} size={20} color={colors.primary} /> : null}
      <TextInput
        ref={ref}
        style={s.field}
        placeholderTextColor={colors.muted}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setShow(false); }}
      />
      <View style={{ width: 24, alignItems: 'center' }}>
        {focused ? (
          <TouchableOpacity focusable={false} onPress={() => setShow(!show)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

export default PasswordInput;

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  boxFocused: { borderColor: colors.primary },
  field: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, color: colors.text, fontSize: 15 },
});