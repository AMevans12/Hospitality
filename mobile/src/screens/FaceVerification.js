import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Screen, Header, Card, Button } from '../components/ui';

export default function FaceVerification({ navigation }) {
  return (
    <Screen header={<Header title="Face Verification" onBack={() => navigation.goBack()} />}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card style={s.tip}>
          <Ionicons name="camera" size={30} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Look at the camera</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Keep your face inside the frame</Text>
          </View>
        </Card>

        {/* Camera preview placeholder - the real camera goes here later */}
        <View style={s.camera}>
          <View style={s.oval}>
            <Ionicons name="person" size={140} color="#6f8791" />
          </View>
        </View>

        <View style={s.verified}>
          <Ionicons name="checkmark-circle" size={34} color={colors.green} />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ color: colors.green, fontSize: 18, fontWeight: '700' }}>Face Verified</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Identity confirmed</Text>
          </View>
        </View>

        <Button title="Continue" onPress={() => navigation.navigate('LocationVerification')} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  camera: { height: 330, backgroundColor: '#2B3B44', borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  oval: { width: 220, height: 280, borderRadius: 110, borderWidth: 4, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  verified: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
});
